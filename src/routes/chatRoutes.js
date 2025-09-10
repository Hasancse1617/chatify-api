import express from "express";
import {
  verifyToken,
  searchUsers,
  conversationStart,
  createConversation,
  addUsersToGroup,
  getConversations,
  getMessages,
} from "../controllers/chatController.js";

const router = express.Router();

// Auth middleware
router.use(verifyToken);

// Routes
router.get("/users/search", searchUsers);
router.post("/conversations", createConversation);
router.post("/conversations/start", conversationStart);
router.post("/conversations/:id/add", addUsersToGroup);
router.get("/conversations", getConversations);
router.get("/conversations/:conversationId/messages", getMessages);

export default router;
