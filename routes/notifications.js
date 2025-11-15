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
import { createClient } from 'redis';

const router = express.Router();

// Redis client for production-grade caching (use instead of Map)
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
  providerPushSubscriptions: new Map(),
  providerLastPoll: new Map()
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
  },

  async updateLastPoll(providerId) {
    const now = Date.now();
    if (USE_REDIS && redisClient?.isOpen) {
      await redisClient.setEx(`lastpoll:${providerId}`, 60, now.toString());
    } else {
      memoryStorage.providerLastPoll.set(providerId, now);
    }
    return now;
  },

  async getLastPoll(providerId) {
    if (USE_REDIS && redisClient?.isOpen) {
      const data = await redisClient.get(`lastpoll:${providerId}`);
      return data ? parseInt(data) : 0;
    }
    return memoryStorage.providerLastPoll.get(providerId) || 0;
  }
};

// Configure web push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// Subscribe to push notifications
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

// Notify provider about incoming call
router.post('/notify-call', async (req, res) => {
  try {
    const { providerId, channelName, callerName, mode, callType } = req.body;

    if (!providerId || !channelName || !callerName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const callData = {
      callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      providerId,
      channelName,
      callerName,
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

    // Check if provider is connected via Socket.IO
    const providerSocketId = connectedProviders?.get(providerId);
    
    if (providerSocketId && io) {
      // Send real-time notification via Socket.IO
      io.to(providerSocketId).emit('incoming-call', callData);
      console.log(`✅ Real-time notification sent to provider ${providerId}`);
      deliveryMethod = 'realtime';
    } else {
      console.log(`⚠️ Provider ${providerId} not connected via Socket.IO`);
      deliveryMethod = 'polling';
    }

    // Also send push notification if provider has subscribed
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
      } catch (pushError) {
        console.error('Push notification error:', pushError);
        // Remove invalid subscription
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await storage.deletePushSubscription(providerId);
        }
      }
    }

    // Auto-cleanup after expiration
    setTimeout(async () => {
      const call = await storage.getCall(callData.callId);
      if (call && call.status === 'waiting') {
        await storage.deleteCall(callData.callId);
        if (io) {
          io.emit('call-expired', { callId: callData.callId, providerId });
        }
        console.log(`⏰ Call ${callData.callId} expired and removed`);
      }
    }, 60000);

    res.status(200).json({
      success: true,
      callId: callData.callId,
      message: 'Provider notified about incoming call',
      deliveryMethod
    });

  } catch (error) {
    console.error('Error sending call notification:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to notify provider' 
    });
  }
});

// Get pending calls for provider (optimized with rate limiting)
router.get('/pending-calls/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    
    // Rate limiting: prevent excessive polling
    const lastPoll = await storage.getLastPoll(providerId);
    const now = Date.now();
    const timeSinceLastPoll = now - lastPoll;
    
    // Minimum 3 seconds between polls
    if (timeSinceLastPoll < 3000) {
      // Return cached response with 304 status
      return res.status(304).end();
    }
    
    await storage.updateLastPoll(providerId);
    
    const pendingCalls = await storage.getProviderCalls(providerId);
    
    // Filter out expired calls
    const activeCalls = pendingCalls.filter(call => {
      if (call.expiresAt && Date.now() > call.expiresAt) {
        storage.deleteCall(call.callId); // Clean up expired
        return false;
      }
      return true;
    });

    // If no calls, return empty with cache headers
    if (activeCalls.length === 0) {
      res.set({
        'Cache-Control': 'no-cache, max-age=5',
        'X-Poll-Interval': '5000'
      });
      return res.status(200).json({
        success: true,
        pendingCalls: []
      });
    }

    res.set({
      'Cache-Control': 'no-cache',
      'X-Poll-Interval': '3000'
    });

    res.status(200).json({
      success: true,
      pendingCalls: activeCalls.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )
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

    // Notify via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('call-accepted', { 
        callId, 
        providerId: callData.providerId,
        channelName: callData.channelName 
      });
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
      error: 'Failed to accept call' 
    });
  }
});

// Decline call
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

    // Notify via Socket.IO - CRITICAL: notify the caller/user
    const io = req.app.get('io');
    if (io) {
      // Broadcast to all clients so the caller receives notification
      io.emit('call-declined', { 
        callId, 
        providerId: callData.providerId,
        channelName: callData.channelName,
        callerName: callData.callerName
      });
      console.log(`📢 Decline notification broadcasted for call ${callId}`);
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
      error: 'Failed to decline call' 
    });
  }
});

// End/Cancel call
router.post('/end-call/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const callData = await storage.getCall(callId);

    if (callData) {
      // Notify via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.emit('call-ended', { 
          callId, 
          providerId: callData.providerId,
          channelName: callData.channelName 
        });
      }
      
      await storage.deleteCall(callId);
      console.log(`📞 Call ${callId} ended and cleaned up`);
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

// Cleanup endpoint for maintenance (optional, can be called by cron job)
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
      message: 'Expired calls cleaned up'
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ success: false, error: 'Cleanup failed' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }
});

export default router;



