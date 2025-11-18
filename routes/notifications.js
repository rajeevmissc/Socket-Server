// import express from 'express';
// import webpush from 'web-push';
// import { createClient } from 'redis';

// const router = express.Router();

// // Redis client for production-grade caching
// let redisClient;
// const USE_REDIS = process.env.REDIS_URL ? true : false;

// // Initialize Redis if available
// if (USE_REDIS) {
//   redisClient = createClient({
//     url: process.env.REDIS_URL,
//     socket: {
//       reconnectStrategy: (retries) => Math.min(retries * 50, 500)
//     }
//   });
  
//   redisClient.on('error', (err) => console.error('Redis Error:', err));
//   redisClient.on('connect', () => console.log('✅ Redis connected'));
  
//   redisClient.connect().catch(console.error);
// }

// // Fallback in-memory storage (only for development)
// const memoryStorage = {
//   activeCallNotifications: new Map(),
//   providerPushSubscriptions: new Map()
// };

// // Helper functions for storage abstraction
// const storage = {
//   async setCall(callId, callData) {
//     if (USE_REDIS && redisClient?.isOpen) {
//       await redisClient.setEx(
//         `call:${callId}`, 
//         300, // 5 minutes TTL
//         JSON.stringify(callData)
//       );
//       await redisClient.sAdd(`provider:${callData.providerId}:calls`, callId);
//     } else {
//       memoryStorage.activeCallNotifications.set(callId, callData);
//     }
//   },

//   async getCall(callId) {
//     if (USE_REDIS && redisClient?.isOpen) {
//       const data = await redisClient.get(`call:${callId}`);
//       return data ? JSON.parse(data) : null;
//     }
//     return memoryStorage.activeCallNotifications.get(callId);
//   },

//   async deleteCall(callId) {
//     if (USE_REDIS && redisClient?.isOpen) {
//       const callData = await this.getCall(callId);
//       if (callData) {
//         await redisClient.sRem(`provider:${callData.providerId}:calls`, callId);
//       }
//       await redisClient.del(`call:${callId}`);
//     } else {
//       memoryStorage.activeCallNotifications.delete(callId);
//     }
//   },

//   async getProviderCalls(providerId) {
//     if (USE_REDIS && redisClient?.isOpen) {
//       const callIds = await redisClient.sMembers(`provider:${providerId}:calls`);
//       const calls = await Promise.all(
//         callIds.map(id => this.getCall(id))
//       );
//       return calls.filter(Boolean).filter(call => call.status === 'waiting');
//     }
//     return Array.from(memoryStorage.activeCallNotifications.values())
//       .filter(call => call.providerId === providerId && call.status === 'waiting');
//   },

//   async setPushSubscription(providerId, subscription) {
//     if (USE_REDIS && redisClient?.isOpen) {
//       await redisClient.set(
//         `push:${providerId}`,
//         JSON.stringify(subscription)
//       );
//     } else {
//       memoryStorage.providerPushSubscriptions.set(providerId, subscription);
//     }
//   },

//   async getPushSubscription(providerId) {
//     if (USE_REDIS && redisClient?.isOpen) {
//       const data = await redisClient.get(`push:${providerId}`);
//       return data ? JSON.parse(data) : null;
//     }
//     return memoryStorage.providerPushSubscriptions.get(providerId);
//   },

//   async deletePushSubscription(providerId) {
//     if (USE_REDIS && redisClient?.isOpen) {
//       await redisClient.del(`push:${providerId}`);
//     } else {
//       memoryStorage.providerPushSubscriptions.delete(providerId);
//     }
//   }
// };

// // Configure web push
// webpush.setVapidDetails(
//   process.env.VAPID_SUBJECT || 'mailto:your-email@example.com',
//   process.env.VAPID_PUBLIC_KEY || '',
//   process.env.VAPID_PRIVATE_KEY || ''
// );

// // ✅ Subscribe to push notifications
// router.post('/subscribe-push', async (req, res) => {
//   try {
//     const { providerId, subscription } = req.body;
    
//     if (!providerId || !subscription) {
//       return res.status(400).json({
//         success: false,
//         error: 'Missing providerId or subscription'
//       });
//     }
    
//     await storage.setPushSubscription(providerId, subscription);
    
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

// // ✅ Notify provider about incoming call (Real-time via Socket.IO)
// router.post('/notify-call', async (req, res) => {
//   try {
//     const { providerId, channelName, callerName, mode, callType, callerAvatar } = req.body;

//     if (!providerId || !channelName || !callerName) {
//       return res.status(400).json({
//         success: false,
//         error: 'Missing required fields: providerId, channelName, or callerName'
//       });
//     }

//     const callData = {
//       callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//       providerId,
//       channelName,
//       callerName,
//       callerAvatar: callerAvatar || null,
//       mode: mode || 'audio',
//       callType: callType || 'regular',
//       timestamp: new Date().toISOString(),
//       status: 'waiting',
//       expiresAt: Date.now() + 60000 // 60 seconds timeout
//     };

//     // Store the call notification
//     await storage.setCall(callData.callId, callData);

//     console.log('📞 Call notification created:', {
//       callId: callData.callId,
//       providerId,
//       callerName,
//       mode,
//       channelName
//     });

//     // Get Socket.IO instance and connected providers
//     const io = req.app.get('io');
//     const connectedProviders = req.app.get('connectedProviders');

//     let deliveryMethod = 'none';
//     let notificationSent = false;

//     // ✅ Check if provider is connected via Socket.IO
//     const providerSocketId = connectedProviders?.get(providerId);
    
//     if (providerSocketId && io) {
//       try {
//         // Send real-time notification via Socket.IO
//         io.to(providerSocketId).emit('incoming-call', callData);
//         console.log(`✅ Real-time notification sent to provider ${providerId} via Socket.IO`);
//         deliveryMethod = 'realtime';
//         notificationSent = true;
//       } catch (socketError) {
//         console.error('Socket.IO error:', socketError);
//       }
//     } else {
//       console.log(`⚠️ Provider ${providerId} not connected via Socket.IO`);
//     }

//     // ✅ Also send push notification if provider has subscribed (fallback)
//     const subscription = await storage.getPushSubscription(providerId);
//     if (subscription) {
//       try {
//         await webpush.sendNotification(
//           subscription,
//           JSON.stringify({
//             title: `Incoming ${mode === 'video' ? 'Video' : mode === 'chat' ? 'Chat' : 'Audio'} Call`,
//             body: `${callerName} is calling you`,
//             icon: '/icon-192x192.png',
//             badge: '/badge-72x72.png',
//             tag: callData.callId,
//             data: callData,
//             requireInteraction: true,
//             vibrate: mode === 'chat' ? [100, 100] : [200, 100, 200],
//             actions: [
//               { action: 'accept', title: 'Accept' },
//               { action: 'decline', title: 'Decline' }
//             ]
//           })
//         );
//         console.log(`📱 Push notification sent to provider ${providerId}`);
//         if (deliveryMethod === 'none') deliveryMethod = 'push';
//         notificationSent = true;
//       } catch (pushError) {
//         console.error('Push notification error:', pushError);
//         // Remove invalid subscription
//         if (pushError.statusCode === 410 || pushError.statusCode === 404) {
//           await storage.deletePushSubscription(providerId);
//         }
//       }
//     }

//     // ✅ Auto-cleanup after expiration
//     setTimeout(async () => {
//       const call = await storage.getCall(callData.callId);
//       if (call && call.status === 'waiting') {
//         await storage.deleteCall(callData.callId);
        
//         // Emit call-expired event to BOTH provider AND to the channel
//         if (io) {
//           // To provider
//           if (providerSocketId) {
//             io.to(providerSocketId).emit('call-expired', { 
//               callId: callData.callId, 
//               providerId,
//               channelName: callData.channelName
//             });
//           }
          
//           // To all clients (so caller can receive it)
//           io.emit('call-expired', {
//             callId: callData.callId,
//             channelName: callData.channelName,
//             providerId
//           });
//         }
        
//         console.log(`⏰ Call ${callData.callId} expired and removed`);
//       }
//     }, 60000);

//     res.status(200).json({
//       success: true,
//       callId: callData.callId,
//       message: notificationSent 
//         ? 'Provider notified about incoming call' 
//         : 'Call notification created but provider not reachable',
//       deliveryMethod,
//       notificationSent
//     });

//   } catch (error) {
//     console.error('Error sending call notification:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to notify provider',
//       details: error.message 
//     });
//   }
// });

// // ✅ Accept call (Real-time notification via Socket.IO)
// router.post('/accept-call/:callId', async (req, res) => {
//   try {
//     const { callId } = req.params;
//     const callData = await storage.getCall(callId);

//     if (!callData) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Call not found or already handled' 
//       });
//     }

//     // Prevent double-acceptance
//     if (callData.status !== 'waiting') {
//       return res.status(400).json({
//         success: false,
//         error: `Call already ${callData.status}`
//       });
//     }

//     // Update call status
//     callData.status = 'accepted';
//     callData.acceptedAt = new Date().toISOString();
//     await storage.setCall(callId, callData);

//     // ✅ Notify via Socket.IO to ALL clients (especially the caller)
//     const io = req.app.get('io');
//     if (io) {
//       io.emit('call-accepted', { 
//         callId, 
//         providerId: callData.providerId,
//         channelName: callData.channelName,
//         callerName: callData.callerName,
//         mode: callData.mode
//       });
//       console.log(`✅ Call-accepted event broadcasted for call ${callId}`);
//     }

//     console.log(`✅ Call ${callId} accepted by provider ${callData.providerId}`);

//     // Clean up after 30 seconds
//     setTimeout(() => storage.deleteCall(callId), 30000);

//     res.status(200).json({
//       success: true,
//       callData,
//       message: 'Call accepted successfully'
//     });

//   } catch (error) {
//     console.error('Error accepting call:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to accept call',
//       details: error.message 
//     });
//   }
// });

// // ✅ Decline call (Real-time notification via Socket.IO) - FIXED
// router.post('/decline-call/:callId', async (req, res) => {
//   try {
//     const { callId } = req.params;
//     const callData = await storage.getCall(callId);

//     if (!callData) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Call not found or already handled' 
//       });
//     }

//     // Prevent double-decline
//     if (callData.status !== 'waiting') {
//       return res.status(400).json({
//         success: false,
//         error: `Call already ${callData.status}`
//       });
//     }

//     // Update call status
//     callData.status = 'declined';
//     callData.declinedAt = new Date().toISOString();
//     await storage.setCall(callId, callData);

//     // ✅ Notify via Socket.IO to ALL clients (especially the caller)
//     const io = req.app.get('io');
//     if (io) {
//       // Broadcast to everyone
//       io.emit('call-declined', { 
//         callId, 
//         providerId: callData.providerId,
//         channelName: callData.channelName,  // ✅ Added channelName
//         callerName: callData.callerName,
//         mode: callData.mode,
//         reason: 'Provider declined the call'  // ✅ Added reason
//       });
//       console.log(`📢 Call-declined event broadcasted for call ${callId} on channel ${callData.channelName}`);
//     }

//     console.log(`❌ Call ${callId} declined by provider ${callData.providerId}`);

//     // Remove from active calls immediately
//     setTimeout(() => storage.deleteCall(callId), 2000);

//     res.status(200).json({
//       success: true,
//       message: 'Call declined successfully',
//       callId
//     });

//   } catch (error) {
//     console.error('Error declining call:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to decline call',
//       details: error.message 
//     });
//   }
// });

// // ✅ End/Cancel call (Real-time notification via Socket.IO)
// router.post('/end-call/:callId', async (req, res) => {
//   try {
//     const { callId } = req.params;
//     const callData = await storage.getCall(callId);

//     if (callData) {
//       // Update status
//       callData.status = 'ended';
//       callData.endedAt = new Date().toISOString();
//       await storage.setCall(callId, callData);

//       // ✅ Notify via Socket.IO to ALL clients
//       const io = req.app.get('io');
//       if (io) {
//         io.emit('call-ended', { 
//           callId, 
//           providerId: callData.providerId,
//           channelName: callData.channelName,  // ✅ Added channelName
//           callerName: callData.callerName,
//           mode: callData.mode
//         });
//         console.log(`📢 Call-ended event broadcasted for call ${callId}`);
//       }
      
//       // Delete after broadcast
//       setTimeout(() => storage.deleteCall(callId), 2000);
//       console.log(`📞 Call ${callId} ended and will be cleaned up`);
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Call ended successfully'
//     });

//   } catch (error) {
//     console.error('Error ending call:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to end call',
//       details: error.message 
//     });
//   }
// });

// // ✅ Get active calls for a provider (for initial load/recovery only)
// router.get('/active-calls/:providerId', async (req, res) => {
//   try {
//     const { providerId } = req.params;
    
//     const pendingCalls = await storage.getProviderCalls(providerId);
    
//     // Filter out expired calls
//     const activeCalls = pendingCalls.filter(call => {
//       if (call.expiresAt && Date.now() > call.expiresAt) {
//         storage.deleteCall(call.callId); // Clean up expired
//         return false;
//       }
//       return true;
//     });

//     res.status(200).json({
//       success: true,
//       activeCalls: activeCalls.sort((a, b) => 
//         new Date(b.timestamp) - new Date(a.timestamp)
//       )
//     });

//   } catch (error) {
//     console.error('Error fetching active calls:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to fetch active calls',
//       details: error.message 
//     });
//   }
// });

// // ✅ Health check endpoint
// router.get('/health', async (req, res) => {
//   try {
//     const redisStatus = USE_REDIS && redisClient?.isOpen ? 'connected' : 'not-configured';
    
//     let activeCallCount = 0;
//     if (USE_REDIS && redisClient?.isOpen) {
//       const keys = await redisClient.keys('call:*');
//       activeCallCount = keys.length;
//     } else {
//       activeCallCount = memoryStorage.activeCallNotifications.size;
//     }

//     res.status(200).json({
//       success: true,
//       status: 'healthy',
//       redis: redisStatus,
//       activeCallsCount: activeCallCount,
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       status: 'unhealthy',
//       error: error.message
//     });
//   }
// });

// // ✅ Cleanup endpoint for maintenance (optional, can be called by cron job)
// router.post('/cleanup-expired', async (req, res) => {
//   try {
//     const authHeader = req.headers.authorization;
//     const cleanupSecret = process.env.CLEANUP_SECRET || 'change-me-in-production';
    
//     if (authHeader !== `Bearer ${cleanupSecret}`) {
//       return res.status(401).json({ success: false, error: 'Unauthorized' });
//     }

//     let cleanedCount = 0;
    
//     if (USE_REDIS && redisClient?.isOpen) {
//       const keys = await redisClient.keys('call:*');
//       for (const key of keys) {
//         const data = await redisClient.get(key);
//         if (data) {
//           const call = JSON.parse(data);
//           if (call.expiresAt && Date.now() > call.expiresAt) {
//             await redisClient.del(key);
            
//             // Also remove from provider's call set
//             if (call.providerId) {
//               await redisClient.sRem(`provider:${call.providerId}:calls`, call.callId);
//             }
            
//             cleanedCount++;
//           }
//         }
//       }
//     } else {
//       for (const [callId, call] of memoryStorage.activeCallNotifications.entries()) {
//         if (call.expiresAt && Date.now() > call.expiresAt) {
//           memoryStorage.activeCallNotifications.delete(callId);
//           cleanedCount++;
//         }
//       }
//     }

//     console.log(`🧹 Cleaned up ${cleanedCount} expired calls`);
    
//     res.status(200).json({
//       success: true,
//       cleanedCount,
//       message: 'Expired calls cleaned up',
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     console.error('Cleanup error:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Cleanup failed',
//       details: error.message 
//     });
//   }
// });

// // ✅ Graceful shutdown
// process.on('SIGTERM', async () => {
//   console.log('📴 SIGTERM received, shutting down gracefully...');
  
//   if (redisClient?.isOpen) {
//     await redisClient.quit();
//     console.log('✅ Redis connection closed');
//   }
  
//   process.exit(0);
// });

// process.on('SIGINT', async () => {
//   console.log('📴 SIGINT received, shutting down gracefully...');
  
//   if (redisClient?.isOpen) {
//     await redisClient.quit();
//     console.log('✅ Redis connection closed');
//   }
  
//   process.exit(0);
// });

// export default router;













import express from 'express';
import webpush from 'web-push';
import { createClient } from 'redis';

const router = express.Router();

// Redis client for production-grade caching
let redisClient;
const USE_REDIS = process.env.REDIS_URL ? true : false;

// Initialize Redis if available
if (USE_REDIS) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 500)
    }
  });
  
  redisClient.on('error', (err) => console.error('Redis Error:', err));
  redisClient.on('connect', () => console.log('✅ Redis connected'));
  
  redisClient.connect().catch(console.error);
}

// Fallback in-memory storage (only for development)
const memoryStorage = {
  activeCallNotifications: new Map(),
  providerPushSubscriptions: new Map()
};

// Helper functions for storage abstraction
const storage = {
  async setCall(callId, callData) {
    if (USE_REDIS && redisClient?.isOpen) {
      await redisClient.setEx(
        `call:${callId}`, 
        300, // 5 minutes TTL
        JSON.stringify(callData)
      );
      await redisClient.sAdd(`provider:${callData.providerId}:calls`, callId);
    } else {
      memoryStorage.activeCallNotifications.set(callId, callData);
    }
  },

  async getCall(callId) {
    if (USE_REDIS && redisClient?.isOpen) {
      const data = await redisClient.get(`call:${callId}`);
      return data ? JSON.parse(data) : null;
    }
    return memoryStorage.activeCallNotifications.get(callId);
  },

  async deleteCall(callId) {
    if (USE_REDIS && redisClient?.isOpen) {
      const callData = await this.getCall(callId);
      if (callData) {
        await redisClient.sRem(`provider:${callData.providerId}:calls`, callId);
      }
      await redisClient.del(`call:${callId}`);
    } else {
      memoryStorage.activeCallNotifications.delete(callId);
    }
  },

  async getProviderCalls(providerId) {
    if (USE_REDIS && redisClient?.isOpen) {
      const callIds = await redisClient.sMembers(`provider:${providerId}:calls`);
      const calls = await Promise.all(
        callIds.map(id => this.getCall(id))
      );
      return calls.filter(Boolean).filter(call => call.status === 'waiting');
    }
    return Array.from(memoryStorage.activeCallNotifications.values())
      .filter(call => call.providerId === providerId && call.status === 'waiting');
  },

  async setPushSubscription(providerId, subscription) {
    if (USE_REDIS && redisClient?.isOpen) {
      await redisClient.set(
        `push:${providerId}`,
        JSON.stringify(subscription)
      );
    } else {
      memoryStorage.providerPushSubscriptions.set(providerId, subscription);
    }
  },

  async getPushSubscription(providerId) {
    if (USE_REDIS && redisClient?.isOpen) {
      const data = await redisClient.get(`push:${providerId}`);
      return data ? JSON.parse(data) : null;
    }
    return memoryStorage.providerPushSubscriptions.get(providerId);
  },

  async deletePushSubscription(providerId) {
    if (USE_REDIS && redisClient?.isOpen) {
      await redisClient.del(`push:${providerId}`);
    } else {
      memoryStorage.providerPushSubscriptions.delete(providerId);
    }
  }
};

// Configure web push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// ✅ Subscribe to push notifications
router.post('/subscribe-push', async (req, res) => {
  try {
    const { providerId, subscription } = req.body;
    
    if (!providerId || !subscription) {
      return res.status(400).json({
        success: false,
        error: 'Missing providerId or subscription'
      });
    }
    
    await storage.setPushSubscription(providerId, subscription);
    
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

// ✅ Notify provider about incoming call (Real-time via Socket.IO)
router.post('/notify-call', async (req, res) => {
  try {
    const { providerId, channelName, callerName, mode, callType, callerAvatar } = req.body;

    if (!providerId || !channelName || !callerName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: providerId, channelName, or callerName'
      });
    }

    const callData = {
      callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      providerId,
      channelName,
      callerName,
      callerAvatar: callerAvatar || null,
      mode: mode || 'audio',
      callType: callType || 'regular',
      timestamp: new Date().toISOString(),
      status: 'waiting',
      expiresAt: Date.now() + 60000 // 60 seconds timeout
    };

    // Store the call notification
    await storage.setCall(callData.callId, callData);

    console.log('📞 Call notification created:', {
      callId: callData.callId,
      providerId,
      callerName,
      mode,
      channelName
    });

    // Get Socket.IO instance and connected providers
    const io = req.app.get('io');
    const connectedProviders = req.app.get('connectedProviders');

    let deliveryMethod = 'none';
    let notificationSent = false;

    // ✅ Check if provider is connected via Socket.IO
    const providerSocketId = connectedProviders?.get(providerId);
    
    if (providerSocketId && io) {
      try {
        // Send real-time notification via Socket.IO
        io.to(providerSocketId).emit('incoming-call', callData);
        console.log(`✅ Real-time notification sent to provider ${providerId} via Socket.IO`);
        deliveryMethod = 'realtime';
        notificationSent = true;
      } catch (socketError) {
        console.error('Socket.IO error:', socketError);
      }
    } else {
      console.log(`⚠️ Provider ${providerId} not connected via Socket.IO`);
    }

    // ✅ Also send push notification if provider has subscribed (fallback)
    const subscription = await storage.getPushSubscription(providerId);
    if (subscription) {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: `Incoming ${mode === 'video' ? 'Video' : mode === 'chat' ? 'Chat' : 'Audio'} Call`,
            body: `${callerName} is calling you`,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: callData.callId,
            data: callData,
            requireInteraction: true,
            vibrate: mode === 'chat' ? [100, 100] : [200, 100, 200],
            actions: [
              { action: 'accept', title: 'Accept' },
              { action: 'decline', title: 'Decline' }
            ]
          })
        );
        console.log(`📱 Push notification sent to provider ${providerId}`);
        if (deliveryMethod === 'none') deliveryMethod = 'push';
        notificationSent = true;
      } catch (pushError) {
        console.error('Push notification error:', pushError);
        // Remove invalid subscription
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await storage.deletePushSubscription(providerId);
        }
      }
    }

    // ✅ Auto-cleanup after expiration
    setTimeout(async () => {
      const call = await storage.getCall(callData.callId);
      if (call && call.status === 'waiting') {
        await storage.deleteCall(callData.callId);
        
        // Emit call-expired event to BOTH provider AND to the channel
        if (io) {
          // To provider
          if (providerSocketId) {
            io.to(providerSocketId).emit('call-expired', { 
              callId: callData.callId, 
              providerId,
              channelName: callData.channelName
            });
          }
          
          // To all clients (so caller can receive it)
          io.emit('call-expired', {
            callId: callData.callId,
            channelName: callData.channelName,
            providerId
          });
        }
        
        console.log(`⏰ Call ${callData.callId} expired and removed`);
      }
    }, 60000);

    res.status(200).json({
      success: true,
      callId: callData.callId,
      message: notificationSent 
        ? 'Provider notified about incoming call' 
        : 'Call notification created but provider not reachable',
      deliveryMethod,
      notificationSent
    });

  } catch (error) {
    console.error('Error sending call notification:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to notify provider',
      details: error.message 
    });
  }
});

// ✅ Accept call (Real-time notification via Socket.IO)
router.post('/accept-call/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const callData = await storage.getCall(callId);

    if (!callData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Call not found or already handled' 
      });
    }

    // Prevent double-acceptance
    if (callData.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        error: `Call already ${callData.status}`
      });
    }

    // Update call status
    callData.status = 'accepted';
    callData.acceptedAt = new Date().toISOString();
    await storage.setCall(callId, callData);

    // ✅ Notify via Socket.IO to ALL clients (especially the caller)
    const io = req.app.get('io');
    if (io) {
      io.emit('call-accepted', { 
        callId, 
        providerId: callData.providerId,
        channelName: callData.channelName,
        callerName: callData.callerName,
        mode: callData.mode
      });
      console.log(`✅ Call-accepted event broadcasted for call ${callId}`);
    }

    console.log(`✅ Call ${callId} accepted by provider ${callData.providerId}`);

    // Clean up after 30 seconds
    setTimeout(() => storage.deleteCall(callId), 30000);

    res.status(200).json({
      success: true,
      callData,
      message: 'Call accepted successfully'
    });

  } catch (error) {
    console.error('Error accepting call:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to accept call',
      details: error.message 
    });
  }
});

// ✅ Decline call (Real-time notification via Socket.IO) - FIXED
router.post('/decline-call/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const callData = await storage.getCall(callId);

    if (!callData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Call not found or already handled' 
      });
    }

    // Prevent double-decline
    if (callData.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        error: `Call already ${callData.status}`
      });
    }

    // Update call status
    callData.status = 'declined';
    callData.declinedAt = new Date().toISOString();
    await storage.setCall(callId, callData);

    // ✅ Notify via Socket.IO to ALL clients (especially the caller)
    const io = req.app.get('io');
    if (io) {
      // Broadcast to everyone
      io.emit('call-declined', { 
        callId, 
        providerId: callData.providerId,
        channelName: callData.channelName,  // ✅ Added channelName
        callerName: callData.callerName,
        mode: callData.mode,
        reason: 'Provider declined the call'  // ✅ Added reason
      });
      console.log(`📢 Call-declined event broadcasted for call ${callId} on channel ${callData.channelName}`);
    }

    console.log(`❌ Call ${callId} declined by provider ${callData.providerId}`);

    // Remove from active calls immediately
    setTimeout(() => storage.deleteCall(callId), 2000);

    res.status(200).json({
      success: true,
      message: 'Call declined successfully',
      callId
    });

  } catch (error) {
    console.error('Error declining call:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to decline call',
      details: error.message 
    });
  }
});

// ✅ End/Cancel call (Real-time notification via Socket.IO)
router.post('/end-call/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const callData = await storage.getCall(callId);

    if (callData) {
      // Update status
      callData.status = 'ended';
      callData.endedAt = new Date().toISOString();
      await storage.setCall(callId, callData);

      // ✅ Notify via Socket.IO to ALL clients
      const io = req.app.get('io');
      if (io) {
        io.emit('call-ended', { 
          callId, 
          providerId: callData.providerId,
          channelName: callData.channelName,  // ✅ Added channelName
          callerName: callData.callerName,
          mode: callData.mode
        });
        console.log(`📢 Call-ended event broadcasted for call ${callId}`);
      }
      
      // Delete after broadcast
      setTimeout(() => storage.deleteCall(callId), 2000);
      console.log(`📞 Call ${callId} ended and will be cleaned up`);
    }

    res.status(200).json({
      success: true,
      message: 'Call ended successfully'
    });

  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to end call',
      details: error.message 
    });
  }
});

// ✅ Get active calls for a provider (for initial load/recovery only)
router.get('/active-calls/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    
    const pendingCalls = await storage.getProviderCalls(providerId);
    
    // Filter out expired calls
    const activeCalls = pendingCalls.filter(call => {
      if (call.expiresAt && Date.now() > call.expiresAt) {
        storage.deleteCall(call.callId); // Clean up expired
        return false;
      }
      return true;
    });

    res.status(200).json({
      success: true,
      activeCalls: activeCalls.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )
    });

  } catch (error) {
    console.error('Error fetching active calls:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch active calls',
      details: error.message 
    });
  }
});

// ✅ Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const redisStatus = USE_REDIS && redisClient?.isOpen ? 'connected' : 'not-configured';
    
    let activeCallCount = 0;
    if (USE_REDIS && redisClient?.isOpen) {
      const keys = await redisClient.keys('call:*');
      activeCallCount = keys.length;
    } else {
      activeCallCount = memoryStorage.activeCallNotifications.size;
    }

    res.status(200).json({
      success: true,
      status: 'healthy',
      redis: redisStatus,
      activeCallsCount: activeCallCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});


// ✅ Upgrade chat to audio/video call
router.post('/upgrade-chat-to-call/:channelName', async (req, res) => {
  try {
    const { channelName } = req.params;
    const { callDuration, callType, totalCharged, upgradeToType, initiatedBy } = req.body;

    console.log(`📞 Chat upgrade request for channel: ${channelName}`, {
      callDuration,
      totalCharged,
      upgradeToType,
      initiatedBy
    });

    if (!channelName || !upgradeToType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: channelName or upgradeToType'
      });
    }

    const io = req.app.get('io');
    const newChannelName = `${upgradeToType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const upgradeData = {
      oldChannelName: channelName,
      newChannelName: newChannelName,
      callType: upgradeToType,
      initiatedBy,
      timestamp: new Date().toISOString(),
      previousCallDuration: callDuration,
      previousCharges: totalCharged
    };

    if (io) {
      io.emit('chat-upgraded', {
        ...upgradeData,
        channelName: channelName,
        message: `Chat upgraded to ${upgradeToType} call`
      });

      console.log(`📡 Chat upgrade notification broadcasted for channel ${channelName}`);
    }

    res.status(200).json({
      success: true,
      message: 'Chat upgrade initiated successfully',
      newChannelName,
      upgradeData,
      finalCharge: totalCharged
    });

  } catch (error) {
    console.error('Error upgrading chat:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upgrade chat',
      details: error.message 
    });
  }
});

// ✅ End chat session
router.post('/end-chat/:channelName', async (req, res) => {
  try {
    const { channelName } = req.params;
    const { callDuration, callType, totalCharged } = req.body;

    console.log(`💬 Ending chat session for channel: ${channelName}`, {
      callDuration,
      totalCharged
    });

    if (!channelName) {
      return res.status(400).json({
        success: false,
        error: 'Missing channelName'
      });
    }

    const io = req.app.get('io');

    if (io) {
      io.emit('chat-ended', {
        channelName: channelName,
        duration: callDuration,
        totalCharged: totalCharged,
        timestamp: new Date().toISOString()
      });

      console.log(`📡 Chat end notification broadcasted for channel ${channelName}`);
    }

    res.status(200).json({
      success: true,
      message: 'Chat session ended successfully',
      finalCharge: totalCharged,
      duration: callDuration
    });

  } catch (error) {
    console.error('Error ending chat:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to end chat',
      details: error.message 
    });
  }
});

// ✅ Auto-decline call (2 minutes timeout)
router.post('/auto-decline-call/:channelName', async (req, res) => {
  try {
    const { channelName } = req.params;
    const { reason, callType, waitingTime } = req.body;

    console.log(`⏰ Auto-declining call for channel: ${channelName}`, {
      reason,
      callType,
      waitingTime
    });

    if (!channelName) {
      return res.status(400).json({
        success: false,
        error: 'Missing channelName'
      });
    }

    const io = req.app.get('io');

    if (io) {
      io.emit('call-auto-declined', {
        channelName: channelName,
        reason: reason || 'Provider did not respond within 2 minutes',
        callType,
        waitingTime,
        timestamp: new Date().toISOString()
      });

      console.log(`📡 Auto-decline notification broadcasted for channel ${channelName}`);
    }

    res.status(200).json({
      success: true,
      message: 'Call auto-declined successfully',
      reason
    });

  } catch (error) {
    console.error('Error auto-declining call:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to auto-decline call',
      details: error.message 
    });
  }
});

// ✅ Cleanup endpoint for maintenance (optional, can be called by cron job)
router.post('/cleanup-expired', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const cleanupSecret = process.env.CLEANUP_SECRET || 'change-me-in-production';
    
    if (authHeader !== `Bearer ${cleanupSecret}`) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let cleanedCount = 0;
    
    if (USE_REDIS && redisClient?.isOpen) {
      const keys = await redisClient.keys('call:*');
      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          const call = JSON.parse(data);
          if (call.expiresAt && Date.now() > call.expiresAt) {
            await redisClient.del(key);
            
            // Also remove from provider's call set
            if (call.providerId) {
              await redisClient.sRem(`provider:${call.providerId}:calls`, call.callId);
            }
            
            cleanedCount++;
          }
        }
      }
    } else {
      for (const [callId, call] of memoryStorage.activeCallNotifications.entries()) {
        if (call.expiresAt && Date.now() > call.expiresAt) {
          memoryStorage.activeCallNotifications.delete(callId);
          cleanedCount++;
        }
      }
    }

    console.log(`🧹 Cleaned up ${cleanedCount} expired calls`);
    
    res.status(200).json({
      success: true,
      cleanedCount,
      message: 'Expired calls cleaned up',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Cleanup failed',
      details: error.message 
    });
  }
});

// ✅ Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  
  if (redisClient?.isOpen) {
    await redisClient.quit();
    console.log('✅ Redis connection closed');
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  
  if (redisClient?.isOpen) {
    await redisClient.quit();
    console.log('✅ Redis connection closed');
  }
  
  process.exit(0);
});

export default router;





