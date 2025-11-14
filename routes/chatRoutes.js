import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import ChatMessage from '../models/ChatMessage.js';
import ChatSession from '../models/ChatSession.js';

const router = express.Router();

// Get chat history for a channel
router.get('/history/:channelName', authenticateToken, async (req, res) => {
  try {
    const { channelName } = req.params;
    const { limit = 100, before } = req.query;

    const query = { channelName };
    
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    // Reverse to show oldest first
    messages.reverse();

    res.status(200).json({
      success: true,
      messages,
      count: messages.length
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history'
    });
  }
});

// Save a new message
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const { messageId, text, senderId, channelName, timestamp } = req.body;

    if (!messageId || !text || !senderId || !channelName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Check if message already exists (prevent duplicates)
    const existingMessage = await ChatMessage.findOne({ messageId });
    
    if (existingMessage) {
      return res.status(200).json({
        success: true,
        message: existingMessage,
        duplicate: true
      });
    }

    // Create new message
    const message = new ChatMessage({
      messageId,
      text,
      senderId,
      channelName,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      status: 'sent',
      deliveredTo: [],
      seenBy: []
    });

    await message.save();

    // Update or create chat session
    await ChatSession.findOneAndUpdate(
      { channelName },
      {
        $set: {
          lastMessageAt: message.timestamp,
          lastMessageText: text,
          lastMessageSender: senderId
        },
        $addToSet: {
          participants: senderId
        }
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save message'
    });
  }
});

// Mark messages as delivered
router.post('/mark-delivered', authenticateToken, async (req, res) => {
  try {
    const { channelName, messageIds, userId } = req.body;

    if (!channelName || !messageIds || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = await ChatMessage.updateMany(
      {
        channelName,
        messageId: { $in: messageIds },
        senderId: { $ne: userId }, // Don't mark own messages as delivered
        deliveredTo: { $ne: userId } // Only if not already delivered
      },
      {
        $addToSet: { deliveredTo: userId },
        $set: { status: 'delivered' }
      }
    );

    res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error marking messages as delivered:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as delivered'
    });
  }
});

// Mark messages as seen
router.post('/mark-seen', authenticateToken, async (req, res) => {
  try {
    const { channelName, messageIds, userId } = req.body;

    if (!channelName || !messageIds || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = await ChatMessage.updateMany(
      {
        channelName,
        messageId: { $in: messageIds },
        senderId: { $ne: userId }, // Don't mark own messages as seen
        seenBy: { $ne: userId } // Only if not already seen
      },
      {
        $addToSet: { 
          seenBy: userId,
          deliveredTo: userId // Also mark as delivered if not already
        },
        $set: { status: 'seen' }
      }
    );

    res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error marking messages as seen:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as seen'
    });
  }
});

// Get chat sessions for a user
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    const sessions = await ChatSession.find({
      participants: userId
    })
    .sort({ lastMessageAt: -1 })
    .limit(50)
    .lean();

    res.status(200).json({
      success: true,
      sessions
    });

  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat sessions'
    });
  }
});

// Get unread message count for a channel
router.get('/unread/:channelName', authenticateToken, async (req, res) => {
  try {
    const { channelName } = req.params;
    const userId = req.user._id.toString();

    const unreadCount = await ChatMessage.countDocuments({
      channelName,
      senderId: { $ne: userId },
      seenBy: { $ne: userId }
    });

    res.status(200).json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count'
    });
  }
});

// Delete a message (soft delete)
router.delete('/message/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id.toString();

    const message = await ChatMessage.findOne({ messageId });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Only sender can delete their own message
    if (message.senderId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this message'
      });
    }

    // Soft delete by marking as deleted
    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

// Clear chat history for a channel
router.delete('/clear/:channelName', authenticateToken, async (req, res) => {
  try {
    const { channelName } = req.params;
    const userId = req.user._id.toString();

    // Verify user is participant in this channel
    const session = await ChatSession.findOne({
      channelName,
      participants: userId
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }

    // Delete all messages in the channel
    const result = await ChatMessage.deleteMany({ channelName });

    // Update session
    await ChatSession.findOneAndUpdate(
      { channelName },
      {
        $set: {
          lastMessageAt: new Date(),
          lastMessageText: '',
          lastMessageSender: ''
        }
      }
    );

    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error clearing chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear chat'
    });
  }
});

export default router;
