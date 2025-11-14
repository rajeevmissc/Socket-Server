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
import { emitToUser, emitToChannel, isUserOnline } from '../config/socket.js';

const router = express.Router();

// Simple in-memory storage (use database in production)
const activeCallNotifications = new Map();
const providerPushSubscriptions = new Map();

// Configure web push (add these to your .env file)
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// Subscribe to push notifications
router.post('/subscribe-push', authenticateToken, async (req, res) => {
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

// Notify provider about incoming call (with real-time Socket.IO)
router.post('/notify-call', authenticateToken, async (req, res) => {
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

    // Store the call notification
    activeCallNotifications.set(callData.callId, callData);

    console.log('📞 Call notification:', {
      callId: callData.callId,
      providerId,
      callerName,
      mode,
      channelName
    });

    // Get Socket.IO instance and connected providers
    const io = req.app.get('io');
    const connectedProviders = req.app.get('connectedProviders');

    // Check if provider is connected via Socket.IO
    const providerSocketId = connectedProviders.get(providerId);
    
    if (providerSocketId) {
      // Send real-time notification via Socket.IO
      io.to(providerSocketId).emit('incoming-call', callData);
      console.log(`✅ Real-time notification sent to provider ${providerId}`);
    } else {
      console.log(`⚠️ Provider ${providerId} not connected via Socket.IO`);
    }

    // Also send push notification if provider has subscribed
    const subscription = providerPushSubscriptions.get(providerId);
    if (subscription) {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: `Incoming ${mode === 'video' ? 'Video' : mode === 'audio' ? 'Audio' : 'Chat'} ${callType === 'chat' ? 'Request' : 'Call'}`,
            body: `${callerName} is ${callType === 'chat' ? 'requesting to chat' : 'calling you'}`,
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
        // Remove invalid subscription
        if (pushError.statusCode === 410) {
          providerPushSubscriptions.delete(providerId);
        }
      }
    }

    res.status(200).json({
      success: true,
      callId: callData.callId,
      message: 'Provider notified about incoming call',
      deliveryMethod: providerSocketId ? 'realtime' : 'polling'
    });

  } catch (error) {
    console.error('Error sending call notification:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to notify provider' 
    });
  }
});

// Get pending calls for provider (fallback polling)
router.get('/pending-calls/:providerId', authenticateToken, async (req, res) => {
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

// Accept call
router.post('/accept-call/:callId', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const callData = activeCallNotifications.get(callId);

    if (!callData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Call not found' 
      });
    }

    // Update call status
    callData.status = 'accepted';
    callData.acceptedAt = new Date();
    activeCallNotifications.set(callId, callData);

    // Notify via Socket.IO
    const io = req.app.get('io');
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

// Decline call
router.post('/decline-call/:callId', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const callData = activeCallNotifications.get(callId);

    if (!callData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Call not found' 
      });
    }

    // Update call status
    callData.status = 'declined';
    callData.declinedAt = new Date();
    activeCallNotifications.set(callId, callData);

    // Notify via Socket.IO
    const io = req.app.get('io');
    io.emit('call-declined', { callId, providerId: callData.providerId });

    console.log(`❌ Call ${callId} declined`);

    // Remove from active calls after a delay
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

// End/Cancel call
router.post('/end-call/:callId', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const callData = activeCallNotifications.get(callId);

    if (callData) {
      // Notify via Socket.IO
      const io = req.app.get('io');
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

// NEW: End chat session
router.post('/end-chat/:channelName', authenticateToken, async (req, res) => {
  try {
    const { channelName } = req.params;
    const userId = req.user._id.toString();

    console.log(`💬 Ending chat session: ${channelName} by user ${userId}`);

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Notify all participants in the channel
    emitToChannel(io, channelName, 'chat-ended', {
      channelName,
      endedBy: userId,
      timestamp: new Date()
    });

    // Also emit user-left-chat for the person who ended it
    emitToChannel(io, channelName, 'user-left-chat', {
      userId,
      channelName,
      reason: 'ended',
      timestamp: new Date()
    });

    console.log(`✅ Chat ${channelName} ended successfully`);

    res.status(200).json({
      success: true,
      message: 'Chat ended successfully',
      channelName
    });

  } catch (error) {
    console.error('Error ending chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end chat'
    });
  }
});

// NEW: Check if user is online
router.get('/user-online/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const io = req.app.get('io');
    
    const online = isUserOnline(io, userId);

    res.status(200).json({
      success: true,
      userId,
      online,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error checking user status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check user status'
    });
  }
});

// NEW: Get online users in a channel
router.get('/channel-users/:channelName', authenticateToken, async (req, res) => {
  try {
    const { channelName } = req.params;
    const io = req.app.get('io');
    
    // Get all sockets in the room
    const room = io.sockets.adapter.rooms.get(channelName);
    const userCount = room ? room.size : 0;
    const socketIds = room ? Array.from(room) : [];

    // Get user IDs from sockets
    const users = socketIds.map(socketId => {
      const socket = io.sockets.sockets.get(socketId);
      return socket ? (socket.userId || socket.providerId) : null;
    }).filter(Boolean);

    res.status(200).json({
      success: true,
      channelName,
      userCount,
      users,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error getting channel users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get channel users'
    });
  }
});

export default router;

