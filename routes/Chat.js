import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { ChatSession, ChatMessage } from '../models/Chat.js';

const router = express.Router();

// ----------------------
// Create new chat session
// ----------------------
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const { providerId, providerName, userId, userName, rate, mode = 'chat' } = req.body;

    const roomId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session = new ChatSession({
      roomId,
      providerId,
      providerName,
      userId,
      userName,
      rate,
      mode,
      status: 'waiting',
      startTime: new Date(),
    });

    await session.save();

    // ✅ NEW: Notify provider about new chat session
    const io = req.app.get('io');
    io.emit('notifyNewChatSession', {
      providerId: providerId,
      sessionId: session._id,
      roomId: session.roomId,
      userName: userName,
      userId: userId,
      timestamp: new Date()
    });

    console.log(`🔔 Created new chat session and notified provider ${providerId}`);

    res.status(201).json({
      success: true,
      sessionId: session._id,
      roomId: session.roomId,
      session,
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ success: false, message: 'Failed to create chat session' });
  }
});

// ----------------------
// Get chat session details
// ----------------------
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const userData = req.user;
    if (userData.role === 'user' && session.userId !== userData.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (userData.role === 'provider' && session.providerId !== userData.providerId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ success: false, message: 'Failed to get session' });
  }
});

// ----------------------
// Get messages for a session
// ----------------------
router.get('/messages/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { since, limit = 50 } = req.query;
    const query = { sessionId: req.params.sessionId };

    if (since) {
      query.timestamp = { $gt: new Date(parseInt(since)) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ timestamp: 1 })
      .limit(parseInt(limit));

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to get messages' });
  }
});

// ----------------------
// Send a new message
// ----------------------
router.post('/messages', authenticateToken, async (req, res) => {
  try {
    const { sessionId, message, senderId, senderName } = req.body;

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const userData = req.user;
    const newMessage = new ChatMessage({
      sessionId,
      senderId: senderId || userData.id,
      senderName: senderName || userData.name,
      senderRole: userData.role,
      text: message,
      timestamp: new Date(),
    });

    await newMessage.save();

    // Update session info
    session.lastMessage = message;
    session.lastMessageTime = new Date();
    if (session.status === 'waiting') {
      session.status = 'active';
    }
    await session.save();

    // Emit via socket to chat room
    const io = req.app.get('io');
    io.to(session.roomId).emit('newChatMessage', {
      ...newMessage.toObject(),
      roomId: session.roomId,
    });

    // ✅ NEW: Notify provider if message is from user
    if (userData.role === 'user') {
      io.emit('notifyNewMessage', {
        providerId: session.providerId,
        sessionId: session._id,
        roomId: session.roomId,
        senderName: userData.name || 'User',
        messageText: message,
        userId: userData.id,
        timestamp: new Date()
      });
    }

    // ✅ NEW: Notify user if message is from provider
    if (userData.role === 'provider') {
      const userSocketId = io.userSockets.get(session.userId);
      if (userSocketId) {
        io.to(userSocketId).emit('newMessageNotification', {
          sessionId: session._id,
          roomId: session.roomId,
          senderName: userData.name || 'Provider',
          messageText: message,
          timestamp: new Date()
        });
      }
    }

    console.log(`💬 Message sent in session ${sessionId} by ${userData.role}`);

    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// ----------------------
// Mark messages as read
// ----------------------
router.post('/messages/read', authenticateToken, async (req, res) => {
  try {
    const { messageIds, sessionId } = req.body;
    const userData = req.user;

    await ChatMessage.updateMany(
      {
        _id: { $in: messageIds },
        sessionId,
        senderId: { $ne: userData.id },
      },
      {
        $addToSet: {
          readBy: {
            userId: userData.id,
            timestamp: new Date(),
          },
        },
        $set: { read: true },
      }
    );

    const session = await ChatSession.findById(sessionId);
    if (session) {
      const io = req.app.get('io');
      io.to(session.roomId).emit('messagesRead', {
        messageIds,
        userId: userData.id,
        sessionId,
        timestamp: new Date(),
      });
    }

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
  }
});

// ----------------------
// End chat session
// ----------------------
router.post('/sessions/:sessionId/end', authenticateToken, async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    session.status = 'ended';
    session.endTime = new Date();
    session.totalDuration = Math.floor((session.endTime - session.startTime) / 1000);
    session.totalCharged = (session.totalDuration / 60) * session.rate;

    await session.save();

    const io = req.app.get('io');
    io.to(session.roomId).emit('chatSessionEnded', {
      sessionId: session._id,
      duration: session.totalDuration,
      totalCharged: session.totalCharged,
      roomId: session.roomId,
    });

    res.json({ success: true, session });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ success: false, message: 'Failed to end session' });
  }
});

// ----------------------
// Get current user's chat sessions
// ----------------------
router.get('/my-sessions', authenticateToken, async (req, res) => {
  try {
    const userData = req.user;
    let query = {};

    if (userData.role === 'user') {
      query.userId = userData.id;
    } else if (userData.role === 'provider') {
      query.providerId = userData.providerId;
    }

    const sessions = await ChatSession.find(query)
      .sort({ lastMessageTime: -1, createdAt: -1 })
      .limit(50);

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Get my sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get sessions' });
  }
});

// ----------------------
// Get unread message count
// ----------------------
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userData = req.user;
    let query = {};

    if (userData.role === 'user') {
      query.userId = userData.id;
    } else if (userData.role === 'provider') {
      query.providerId = userData.providerId;
    }

    const sessions = await ChatSession.find(query);
    const sessionIds = sessions.map(session => session._id);

    const unreadCount = await ChatMessage.countDocuments({
      sessionId: { $in: sessionIds },
      senderId: { $ne: userData.id },
      'readBy.userId': { $ne: userData.id },
    });

    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
});

export default router;
