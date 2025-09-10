import Message from "./models/Message.js";
import Conversation from "./models/Conversation.js";
import User from "./models/User.js";

/**
 * Socket.IO events we support:
 * - join_conversation { conversationId }
 * - send_message { conversationId, text, kind, mediaUrl }
 * - typing:start/stop { conversationId }
 * - message_read { conversationId, messageId }
 */
export default function socketHandler(io) {
  io.on("connection", (socket) => {
    const user = socket.user; // set by io middleware
    console.log(`[socket] user connected ${user.id}`);

    socket.emit("me", socket.user);
    // ensure local user exists
    // User.findByIdAndUpdate(user.id, { $set: { name: user.name, avatar: user.avatar } }, { upsert: true }).catch(console.error);

    // join user's personal room
    socket.join(`user:${user.id}`);

    // join conversation rooms
    socket.on("join_conversation", async ({ conversationId }, cb) => {
      try {
        const conv = await Conversation.findById(conversationId);
        if (!conv) return cb?.({ ok: false, error: "Conversation not found" });
        // check membershipString(p.userId)
        const isMember = conv.participants.some(p => String(p.userId) === String(user.id));
        if (!isMember) return cb?.({ ok: false, error: "Not a member" });
        socket.join(`conversation:${conversationId}`);
        cb?.({ ok: true });
      } catch (err) {
        cb?.({ ok: false, error: err.message });
      }
    });

    // send message
    socket.on("send_message", async (payload, cb) => {
      try {
        const { conversationId, text = "", kind = "text", mediaUrl = null } = payload;
        const conv = await Conversation.findById(conversationId);
        if (!conv) return cb?.({ ok: false, error: "Conv not found" });
        if (!conv.participants.some(p => String(p.userId) === String(user.id))) return cb?.({ ok: false, error: "Not participant" });

        const msg = await Message.create({
          conversationId,
          senderId: user.id,
          text,
          kind,
          mediaUrl,
          readBy: [user.id] // sender has read their own msg
        });

        // update lastMessage
        conv.lastMessage = msg._id;
        conv.updatedAt = new Date();
        await conv.save();

        // broadcast to conversation room
        io.to(`conversation:${conversationId}`).emit("message:new", {
          _id: msg._id,
          conversationId,
          senderId: msg.senderId,
          text: msg.text,
          kind: msg.kind,
          mediaUrl: msg.mediaUrl,
          createdAt: msg.createdAt,
          readBy: msg.readBy
        });

        // notify participants that conversation updated (for sidebar)
        for (const p of conv.participants) {
          io.to(`user:${p.userId}`).emit("conversation:update", { conversationId, lastMessage: { text: msg.text, createdAt: msg.createdAt } });
        }

        cb?.({ ok: true, message: msg });
      } catch (err) {
        console.error(err);
        cb?.({ ok: false, error: err.message });
      }
    });

    // typing indicator
    socket.on("typing:start", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing", { conversationId, userId: user.id, isTyping: true });
    });
    socket.on("typing:stop", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing", { conversationId, userId: user.id, isTyping: false });
    });

    // read receipt
    socket.on("message:read", async ({ conversationId, messageId }, cb) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return cb?.({ ok: false, error: "Message not found" });
        if (!msg.readBy.includes(user.id)) {
          msg.readBy.push(user.id);
          await msg.save();
        }
        io.to(`conversation:${conversationId}`).emit("message:read", { messageId, userId: user.id, timestamp: new Date() });
        cb?.({ ok: true });
      } catch (err) {
        cb?.({ ok: false, error: err.message });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[socket] user disconnected ${user.id}`);
    });
  });
}
