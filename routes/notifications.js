// import express from 'express';
// import webpush from 'web-push';

// const router = express.Router();

// // Simple in-memory storage (use database in production)
// const activeCallNotifications = new Map();
// const providerPushSubscriptions = new Map();

// // Configure web push (add these to your .env file)
// webpush.setVapidDetails(
//   'mailto:your-email@example.com',
//   process.env.VAPID_PUBLIC_KEY || '',
//   process.env.VAPID_PRIVATE_KEY || ''
// );

// // Subscribe to push notifications
// router.post('/subscribe-push', async (req, res) => {
//   try {
//     const { providerId, subscription } = req.body;
    
//     providerPushSubscriptions.set(providerId, subscription);
    
//     console.log(`✅ Provider ${providerId} subscribed to push notifications`);
    
//     res.status(200).json({
//       success: true,
//       message: 'Successfully subscribed to push notifications'
//     });
//   } catch (error) {
//     console.error('Error subscribing to push:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to subscribe to push notifications' 
//     });
//   }
// });

// // Notify provider about incoming call (with real-time Socket.IO)
// router.post('/notify-call', async (req, res) => {
//   try {
//     const { providerId, channelName, callerName, mode, callType } = req.body;

//     const callData = {
//       callId: `call_${Date.now()}`,
//       providerId,
//       channelName,
//       callerName,
//       mode,
//       callType,
//       timestamp: new Date(),
//       status: 'waiting'
//     };

//     // Store the call notification
//     activeCallNotifications.set(callData.callId, callData);

//     console.log('📞 Call notification:', {
//       callId: callData.callId,
//       providerId,
//       callerName,
//       mode,
//       channelName
//     });

//     // Get Socket.IO instance and connected providers
//     const io = req.app.get('io');
//     const connectedProviders = req.app.get('connectedProviders');

//     // Check if provider is connected via Socket.IO
//     const providerSocketId = connectedProviders.get(providerId);
    
//     if (providerSocketId) {
//       // Send real-time notification via Socket.IO
//       io.to(providerSocketId).emit('incoming-call', callData);
//       console.log(`✅ Real-time notification sent to provider ${providerId}`);
//     } else {
//       console.log(`⚠️ Provider ${providerId} not connected via Socket.IO`);
//     }

//     // Also send push notification if provider has subscribed
//     const subscription = providerPushSubscriptions.get(providerId);
//     if (subscription) {
//       try {
//         await webpush.sendNotification(
//           subscription,
//           JSON.stringify({
//             title: `Incoming ${mode === 'video' ? 'Video' : 'Audio'} Call`,
//             body: `${callerName} is calling you`,
//             icon: '/icon-192x192.png',
//             badge: '/badge-72x72.png',
//             tag: callData.callId,
//             data: callData,
//             requireInteraction: true,
//             actions: [
//               { action: 'accept', title: 'Accept' },
//               { action: 'decline', title: 'Decline' }
//             ]
//           })
//         );
//         console.log(`📱 Push notification sent to provider ${providerId}`);
//       } catch (pushError) {
//         console.error('Push notification error:', pushError);
//         // Remove invalid subscription
//         if (pushError.statusCode === 410) {
//           providerPushSubscriptions.delete(providerId);
//         }
//       }
//     }

//     res.status(200).json({
//       success: true,
//       callId: callData.callId,
//       message: 'Provider notified about incoming call',
//       deliveryMethod: providerSocketId ? 'realtime' : 'polling'
//     });

//   } catch (error) {
//     console.error('Error sending call notification:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to notify provider' 
//     });
//   }
// });

// // Get pending calls for provider (fallback polling)
// router.get('/pending-calls/:providerId', async (req, res) => {
//   try {
//     const { providerId } = req.params;
    
//     const pendingCalls = Array.from(activeCallNotifications.values())
//       .filter(call => call.providerId === providerId && call.status === 'waiting')
//       .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

//     res.status(200).json({
//       success: true,
//       pendingCalls
//     });

//   } catch (error) {
//     console.error('Error fetching pending calls:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to fetch pending calls' 
//     });
//   }
// });

// // Accept call
// router.post('/accept-call/:callId', async (req, res) => {
//   try {
//     const { callId } = req.params;
//     const callData = activeCallNotifications.get(callId);

//     if (!callData) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Call not found' 
//       });
//     }

//     // Update call status
//     callData.status = 'accepted';
//     callData.acceptedAt = new Date();
//     activeCallNotifications.set(callId, callData);

//     // Notify via Socket.IO
//     const io = req.app.get('io');
//     io.emit('call-accepted', { callId, providerId: callData.providerId });

//     console.log(`✅ Call ${callId} accepted`);

//     res.status(200).json({
//       success: true,
//       callData,
//       message: 'Call accepted successfully'
//     });

//   } catch (error) {
//     console.error('Error accepting call:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to accept call' 
//     });
//   }
// });

// // Decline call
// router.post('/decline-call/:callId', async (req, res) => {
//   try {
//     const { callId } = req.params;
//     const callData = activeCallNotifications.get(callId);

//     if (!callData) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Call not found' 
//       });
//     }

//     // Update call status
//     callData.status = 'declined';
//     callData.declinedAt = new Date();
//     activeCallNotifications.set(callId, callData);

//     // Notify via Socket.IO
//     const io = req.app.get('io');
//     io.emit('call-declined', { callId, providerId: callData.providerId });

//     console.log(`❌ Call ${callId} declined`);

//     // Remove from active calls after a delay
//     setTimeout(() => {
//       activeCallNotifications.delete(callId);
//     }, 5000);

//     res.status(200).json({
//       success: true,
//       message: 'Call declined successfully'
//     });

//   } catch (error) {
//     console.error('Error declining call:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to decline call' 
//     });
//   }
// });

// // End/Cancel call
// router.post('/end-call/:callId', async (req, res) => {
//   try {
//     const { callId } = req.params;
//     const callData = activeCallNotifications.get(callId);

//     if (callData) {
//       // Notify via Socket.IO
//       const io = req.app.get('io');
//       io.emit('call-ended', { callId, providerId: callData.providerId });
      
//       activeCallNotifications.delete(callId);
//       console.log(`📞 Call ${callId} ended`);
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Call ended'
//     });

//   } catch (error) {
//     console.error('Error ending call:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to end call' 
//     });
//   }
// });

// export default router;





import express from 'express';
import webpush from 'web-push';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getIo, sendToUser, broadcastToChannel } from '../config/socket.js';

const router = express.Router();

// In-memory storage (use database in production)
const activeCallNotifications = new Map();
const providerPushSubscriptions = new Map();
const chatMessages = new Map(); // channelName -> Array of messages
const messageStatus = new Map(); // messageId -> {status, seenBy: []}

// Configure web push
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// ========== PUSH NOTIFICATION SUBSCRIPTION ==========
router.post('/subscribe-push', async (req, res) => {
  try {
    const { providerId, subscription } = req.body;
    providerPushSubscriptions.set(providerId, subscription);
    
    console.log(`✅ Provider ${providerId} subscribed to push notifications`);
    
    res.status(200).json({
      success: true,
      message: 'Successfully subscribed to push notifications'
    });
  } catch (error) {
    console.error('Error subscribing to push:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to subscribe to push notifications' 
    });
  }
});

// ========== CALL NOTIFICATIONS ==========
router.post('/notify-call', async (req, res) => {
  try {
    const { providerId, channelName, callerName, mode, callType } = req.body;

    const callData = {
      callId: `call_${Date.now()}`,
      providerId,
      channelName,
      callerName,
      mode,
      callType,
      timestamp: new Date(),
      status: 'waiting'
    };

    activeCallNotifications.set(callData.callId, callData);

    console.log('📞 Call notification:', {
      callId: callData.callId,
      providerId,
      callerName,
      mode,
      channelName
    });

    // Get Socket.IO instance
    const io = getIo();
    
    // Send real-time notification via Socket.IO
    const sent = sendToUser(providerId, 'incoming-call', callData);
    
    if (!sent) {
      console.log(`⚠️ Provider ${providerId} not connected via Socket.IO`);
      
      // Send push notification as fallback
      const subscription = providerPushSubscriptions.get(providerId);
      if (subscription) {
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: `Incoming ${mode === 'video' ? 'Video' : 'Audio'} Call`,
              body: `${callerName} is calling you`,
              icon: '/icon-192x192.png',
              badge: '/badge-72x72.png',
              tag: callData.callId,
              data: callData,
              requireInteraction: true,
              actions: [
                { action: 'accept', title: 'Accept' },
                { action: 'decline', title: 'Decline' }
              ]
            })
          );
          console.log(`📱 Push notification sent to provider ${providerId}`);
        } catch (pushError) {
          console.error('Push notification error:', pushError);
          if (pushError.statusCode === 410) {
            providerPushSubscriptions.delete(providerId);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      callId: callData.callId,
      message: 'Provider notified about incoming call',
      deliveryMethod: sent ? 'realtime' : 'push'
    });

  } catch (error) {
    console.error('Error sending call notification:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to notify provider' 
    });
  }
});

router.get('/pending-calls/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    
    const pendingCalls = Array.from(activeCallNotifications.values())
      .filter(call => call.providerId === providerId && call.status === 'waiting')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({
      success: true,
      pendingCalls
    });
  } catch (error) {
    console.error('Error fetching pending calls:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pending calls' 
    });
  }
});

router.post('/accept-call/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const callData = activeCallNotifications.get(callId);

    if (!callData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Call not found' 
      });
    }

    callData.status = 'accepted';
    callData.acceptedAt = new Date();
    activeCallNotifications.set(callId, callData);

    const io = getIo();
    io.emit('call-accepted', { callId, providerId: callData.providerId });

    console.log(`✅ Call ${callId} accepted`);

    res.status(200).json({
      success: true,
      callData,
      message: 'Call accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting call:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to accept call' 
    });
  }
});

router.post('/decline-call/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const callData = activeCallNotifications.get(callId);

    if (!callData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Call not found' 
      });
    }

    callData.status = 'declined';
    callData.declinedAt = new Date();
    activeCallNotifications.set(callId, callData);

    const io = getIo();
    io.emit('call-declined', { callId, providerId: callData.providerId });

    console.log(`❌ Call ${callId} declined`);

    setTimeout(() => {
      activeCallNotifications.delete(callId);
    }, 5000);

    res.status(200).json({
      success: true,
      message: 'Call declined successfully'
    });
  } catch (error) {
    console.error('Error declining call:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to decline call' 
    });
  }
});

router.post('/end-call/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const callData = activeCallNotifications.get(callId);

    if (callData) {
      const io = getIo();
      io.emit('call-ended', { callId, providerId: callData.providerId });
      
      activeCallNotifications.delete(callId);
      console.log(`📞 Call ${callId} ended`);
    }

    res.status(200).json({
      success: true,
      message: 'Call ended'
    });
  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to end call' 
    });
  }
});

// ========== CHAT MESSAGE ENDPOINTS ==========

// Save chat message
router.post('/chat/message', authenticateToken, async (req, res) => {
  try {
    const { channelName, text, messageId } = req.body;
    const userId = req.user._id.toString();
    const userName = req.user.name || 'User';

    const message = {
      id: messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      senderId: userId,
      sender: userName,
      timestamp: Date.now(),
      status: 'sent',
      type: 'message'
    };

    // Store message
    if (!chatMessages.has(channelName)) {
      chatMessages.set(channelName, []);
    }
    chatMessages.get(channelName).push(message);

    // Initialize message status
    messageStatus.set(message.id, {
      status: 'sent',
      seenBy: []
    });

    // Broadcast via Socket.IO
    broadcastToChannel(channelName, 'new-chat-message', message);

    res.status(200).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save message' 
    });
  }
});

// Get chat history
router.get('/chat/history/:channelName', authenticateToken, async (req, res) => {
  try {
    const { channelName } = req.params;
    const { limit = 50, before } = req.query;

    let messages = chatMessages.get(channelName) || [];
    
    // Filter by timestamp if 'before' is provided
    if (before) {
      messages = messages.filter(msg => msg.timestamp < parseInt(before));
    }

    // Get latest messages
    messages = messages.slice(-parseInt(limit));

    res.status(200).json({
      success: true,
      messages,
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch chat history' 
    });
  }
});

// Update message status (delivered/seen)
router.post('/chat/message/:messageId/status', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status, channelName } = req.body;
    const userId = req.user._id.toString();

    if (!['delivered', 'seen'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "delivered" or "seen"'
      });
    }

    const msgStatus = messageStatus.get(messageId);
    if (!msgStatus) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Update status
    msgStatus.status = status;
    if (status === 'seen' && !msgStatus.seenBy.includes(userId)) {
      msgStatus.seenBy.push(userId);
    }
    messageStatus.set(messageId, msgStatus);

    // Update in chat messages array
    const messages = chatMessages.get(channelName);
    if (messages) {
      const msgIndex = messages.findIndex(m => m.id === messageId);
      if (msgIndex !== -1) {
        messages[msgIndex].status = status;
      }
    }

    // Notify via Socket.IO
    broadcastToChannel(channelName, 'message-status-update', {
      messageId,
      status,
      seenBy: userId,
      timestamp: Date.now()
    });

    res.status(200).json({
      success: true,
      messageId,
      status
    });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update message status' 
    });
  }
});

// Bulk update message status
router.post('/chat/messages/status-bulk', authenticateToken, async (req, res) => {
  try {
    const { messageIds, status, channelName } = req.body;
    const userId = req.user._id.toString();

    if (!['delivered', 'seen'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const updated = [];
    messageIds.forEach(messageId => {
      const msgStatus = messageStatus.get(messageId);
      if (msgStatus) {
        msgStatus.status = status;
        if (status === 'seen' && !msgStatus.seenBy.includes(userId)) {
          msgStatus.seenBy.push(userId);
        }
        messageStatus.set(messageId, msgStatus);
        updated.push(messageId);
      }
    });

    // Notify via Socket.IO
    broadcastToChannel(channelName, 'messages-status-bulk-update', {
      messageIds: updated,
      status,
      seenBy: userId,
      timestamp: Date.now()
    });

    res.status(200).json({
      success: true,
      updated: updated.length
    });
  } catch (error) {
    console.error('Error bulk updating message status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to bulk update message status' 
    });
  }
});

// End chat session
router.post('/end-chat/:channelName', authenticateToken, async (req, res) => {
  try {
    const { channelName } = req.params;
    const userId = req.user._id.toString();
    const userName = req.user.name || 'User';

    // Send system message
    const systemMessage = {
      id: `system_${Date.now()}`,
      type: 'system',
      text: `${userName} ended the chat`,
      timestamp: Date.now()
    };

    if (!chatMessages.has(channelName)) {
      chatMessages.set(channelName, []);
    }
    chatMessages.get(channelName).push(systemMessage);

    // Notify via Socket.IO
    broadcastToChannel(channelName, 'chat-ended', {
      userId,
      userName,
      timestamp: Date.now()
    });

    // Clean up after 5 minutes
    setTimeout(() => {
      chatMessages.delete(channelName);
    }, 5 * 60 * 1000);

    res.status(200).json({
      success: true,
      message: 'Chat ended successfully'
    });
  } catch (error) {
    console.error('Error ending chat:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to end chat' 
    });
  }
});

export default router;

