import express from 'express';
import {
  sendMessage,
  getConversationMessages,
  getUserConversations,
  markMessagesAsRead,
  deleteMessage,
  searchMessages,
  getUnreadCount,
  startConversation
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import {
  validateSendMessage,
  validateConversationId,
  validateMessageId,
  validateSearch,
  validatePagination,
  validateStartConversation
} from '../middleware/chatValidation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Message routes
router.post('/send', validateSendMessage, sendMessage);
router.delete('/message/:messageId', validateMessageId, deleteMessage);

// Conversation routes
router.get('/conversations', getUserConversations);
router.post('/start-conversation', validateStartConversation, startConversation);
router.get('/conversation/:conversationId', validateConversationId, validatePagination, getConversationMessages);
router.put('/mark-read/:conversationId', validateConversationId, markMessagesAsRead);

// Utility routes
router.get('/search', validateSearch, searchMessages);
router.get('/unread-count', getUnreadCount);

export default router;