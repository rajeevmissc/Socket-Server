import express from 'express';
import auth from '../middleware/auth.js';
import { ChatSession, ChatMessage } from '../models/Chat.js';

const router = express.Router();

// Create new chat session
router.post('/sessions', auth, async (req, res) => {
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
      status: 'waiting'
    });

    await session.save();
    
    res.status(201).json({
      success: true,
      sessionId: session._id,
      roomId: session.roomId,
      session
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ success: false, message: 'Failed to create chat session' });
  }
});

// Get chat session details
router.get('/sessions/:sessionId', auth, async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Check if user has access to this session
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

// Get messages for a session
router.get('/messages/:sessionId', auth, async (req, res) => {
  try {
    const { since } = req.query;
    const query = { sessionId: req.params.sessionId };
    
    if (since) {
      query.timestamp = { $gt: new Date(parseInt(since)) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ timestamp: 1 })
      .limit(100);

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to get messages' });
  }
});

// Send message
router.post('/messages', auth, async (req, res) => {
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
      timestamp: new Date()
    });

    await newMessage.save();

    // Update session status to active if it was waiting
    if (session.status === 'waiting') {
      session.status = 'active';
      await session.save();
    }

    // Emit message via socket
    req.app.get('io').to(session.roomId).emit('new_message', newMessage);

    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// End chat session
router.post('/sessions/:sessionId/end', auth, async (req, res) => {
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

    // Notify via socket
    req.app.get('io').to(session.roomId).emit('session_ended', {
      sessionId: session._id,
      duration: session.totalDuration,
      totalCharged: session.totalCharged
    });

    res.json({ success: true, session });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ success: false, message: 'Failed to end session' });
  }
});

// Get user's chat sessions
router.get('/my-sessions', auth, async (req, res) => {
  try {
    const userData = req.user;
    let query = {};

    if (userData.role === 'user') {
      query.userId = userData.id;
    } else if (userData.role === 'provider') {
      query.providerId = userData.providerId;
    }

    const sessions = await ChatSession.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Get my sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get sessions' });
  }
});

export default router;
