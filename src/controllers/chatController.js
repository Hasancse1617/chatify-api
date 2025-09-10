import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

/**
 * Middleware: verify Laravel token
 */
export const verifyToken = async (req, res, next) => {
  const authToken = req.headers.authorization?.replace("Bearer ", "");
  if (!authToken) return res.status(401).json({ error: "Missing token" });
  // console.log(authToken);
  try {
    // Verify token via Laravel
    const resLaravel = await fetch(`${process.env.LARAVEL_API}/api/me`, {
      headers: { Authorization: `Bearer ${authToken}`, Accept: "application/json" },
    });

    if (!resLaravel.ok) return res.status(401).json({ error: "Invalid token" });

    const user = await resLaravel.json();

    // Upsert user in MongoDB (only when this request is made)
    const mongoUser = await User.findOneAndUpdate(
      { laravelId: user.id },
      {
        name: user.name,
        email: user.email,
        photo: user.photo ?? null,
      },
      { upsert: true, new: true }
    );

    // Attach user info to request
    req.user = {
      laravelId: user.id, // Laravel numeric ID
      id: mongoUser._id,
      name: user.name,
      email: user.email,
      photo: user.photo ?? null,
    };

    

    next();
  } catch (err) {
    console.error("Auth failed:", err.message);
    return res.status(500).json({ error: "Auth failed" });
  }
};

/**
 * Search users
 */
export const searchUsers = async (req, res) => {
  try {
    // console.log(req);
    const q = req.query.q || "";
    const regex = new RegExp(q, "i");
    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [{ name: regex }, { email: regex }],
    }).limit(20);
    // console.log(users);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
};

export const conversationStart = async(req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user.id;

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      isGroup: false,
      "participants.userId": { $all: [userId, participantId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        isGroup: false,
        participants: [{ userId }, { userId: participantId }],
      });
    }

    // Optionally: notify the other user via Socket.IO
    req.io?.to(`user:${participantId}`).emit("conversation:new", conversation);

    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start conversation" });
  }
};

/**
 * Create conversation
 */
export const createConversation = async (req, res) => {
  const { isGroup = false, title = "", participantIds = [] } = req.body;
  const creatorId = req.user.id;

  if (!isGroup && participantIds.length === 1) {
    const otherId = participantIds[0];
    const existing = await Conversation.findOne({
      isGroup: false,
      $and: [{ "participants.userId": creatorId }, { "participants.userId": otherId }],
    });
    if (existing) return res.json(existing);
  }

  const participants = Array.from(new Set([creatorId, ...participantIds])).map(uid => ({ userId: String(uid) }));
  const conv = await Conversation.create({
    title: title || (participants.length === 2 ? "" : `Group (${new Date().toISOString().slice(0, 10)})`),
    isGroup,
    participants,
  });

  res.json(conv);
};

/**
 * Add users to group
 */
export const addUsersToGroup = async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv) return res.status(404).json({ error: "Not found" });
  if (!conv.participants.find(p => p.userId === req.user.id)) return res.status(403).json({ error: "Not participant" });

  const userIds = req.body.userIds || [];
  for (const uid of userIds) {
    if (!conv.participants.find(p => p.userId === String(uid))) {
      conv.participants.push({ userId: String(uid) });
    }
  }
  await conv.save();
  res.json(conv);
};

/**
 * Get conversations for logged-in user
 */
export const getConversations = async (req, res) => {
  try {
    const convs = await Conversation.find({
      "participants.userId": req.user.id, // use MongoDB ObjectId
    })
      .sort({ updatedAt: -1 })
      .populate({
        path: "participants.userId",  // populate each participant
        select: "name email avatar",  // only select needed fields
      })
      .populate({
        path: "lastMessage",
        populate: { path: "senderId", select: "name avatar" } // optional, populate sender
      });

    res.json(convs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

/**
 * Fetch messages
 */
export const getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const skip = (page - 1) * limit;

  const conv = await Conversation.findById(conversationId);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  if (!conv.participants.find((p) => String(p.userId) === String(req.user.id)))
    return res.status(403).json({ error: "Not participant" });

  const msgs = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Message.countDocuments({ conversationId });
  const hasMore = page * limit < total;

  res.json({ messages: msgs.reverse(), hasMore });
};
