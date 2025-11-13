// import { Server } from 'socket.io';
// import Provider from '../models/Provider.js';

// let io;

// export const initSocket = (server) => {
//   io = new Server(server, {
//     cors: {
//       origin: '*', // change to your frontend URL if needed
//       methods: ['GET', 'POST']
//     }
//   });

//   io.on('connection', (socket) => {
//     console.log('New client connected', socket.id);

//     // Provider updates presence
//     socket.on('updatePresence', async ({ providerId, isOnline }) => {
//       try {
//         const status = isOnline ? 'online' : 'offline';
//         await Provider.findByIdAndUpdate(providerId, {
//           'presence.isOnline': isOnline,
//           'presence.availabilityStatus': status,
//           'presence.lastSeen': new Date()
//         });

//         // Broadcast to all clients
//         io.emit('presenceChanged', { providerId, isOnline, status });
//       } catch (err) {
//         console.error('Error updating presence', err);
//       }
//     });

//     socket.on('disconnect', () => {
//       console.log('Client disconnected', socket.id);
//     });
//   });

//   return io;
// };

// export const getIo = () => {
//   if (!io) throw new Error('Socket.io not initialized!');
//   return io;
// };


import { Server } from 'socket.io';
import Provider from '../models/Provider.js';

let io;

// In-memory storage for active chat sessions
const activeChatSessions = new Map(); // channelName -> Set of userIds
const userSocketMap = new Map(); // userId -> socketId
const socketUserMap = new Map(); // socketId -> userId

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // change to your frontend URL in production
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log('✅ New client connected:', socket.id);

    // ========== USER AUTHENTICATION ==========
    socket.on('authenticate', ({ userId, userName, userRole }) => {
      socket.userId = userId;
      socket.userName = userName;
      socket.userRole = userRole;
      
      userSocketMap.set(userId, socket.id);
      socketUserMap.set(socket.id, userId);
      
      console.log(`🔐 User authenticated: ${userName} (${userId})`);
    });

    // ========== PROVIDER PRESENCE ==========
    socket.on('updatePresence', async ({ providerId, isOnline }) => {
      try {
        const status = isOnline ? 'online' : 'offline';
        await Provider.findByIdAndUpdate(providerId, {
          'presence.isOnline': isOnline,
          'presence.availabilityStatus': status,
          'presence.lastSeen': new Date()
        });
        
        // Broadcast to all clients
        io.emit('presenceChanged', { providerId, isOnline, status });
        console.log(`👤 Presence updated: ${providerId} -> ${status}`);
      } catch (err) {
        console.error('Error updating presence:', err);
      }
    });

    // ========== CHAT SESSION MANAGEMENT ==========
    socket.on('join-chat', ({ channelName, userId, userName, userRole }) => {
      socket.join(channelName);
      socket.currentChannel = channelName;
      
      // Add user to active chat session
      if (!activeChatSessions.has(channelName)) {
        activeChatSessions.set(channelName, new Set());
      }
      activeChatSessions.get(channelName).add(userId);
      
      // Notify others in the channel
      socket.to(channelName).emit('user-joined-chat', {
        userId,
        userName,
        userRole,
        timestamp: Date.now()
      });
      
      // Send system message
      io.to(channelName).emit('system-message', {
        id: `system-${Date.now()}`,
        type: 'system',
        text: `${userName} joined the chat`,
        timestamp: Date.now()
      });
      
      console.log(`💬 User ${userName} joined chat: ${channelName}`);
    });

    socket.on('leave-chat', ({ channelName, userId, userName }) => {
      socket.leave(channelName);
      
      // Remove from active session
      if (activeChatSessions.has(channelName)) {
        activeChatSessions.get(channelName).delete(userId);
        if (activeChatSessions.get(channelName).size === 0) {
          activeChatSessions.delete(channelName);
        }
      }
      
      // Notify others
      socket.to(channelName).emit('user-left-chat', {
        userId,
        userName,
        timestamp: Date.now()
      });
      
      // Send system message
      io.to(channelName).emit('system-message', {
        id: `system-${Date.now()}`,
        type: 'system',
        text: `${userName} left the chat`,
        timestamp: Date.now()
      });
      
      console.log(`👋 User ${userName} left chat: ${channelName}`);
    });

    // ========== TYPING INDICATORS ==========
    socket.on('typing', ({ channelName, userId, userName }) => {
      socket.to(channelName).emit('user-typing', {
        userId,
        userName,
        timestamp: Date.now()
      });
      console.log(`⌨️ ${userName} is typing in ${channelName}`);
    });

    socket.on('stop-typing', ({ channelName, userId }) => {
      socket.to(channelName).emit('user-stop-typing', {
        userId,
        timestamp: Date.now()
      });
    });

    // ========== MESSAGE STATUS UPDATES ==========
    socket.on('message-sent', ({ channelName, messageId, senderId }) => {
      // Broadcast to all users in channel except sender
      socket.to(channelName).emit('message-delivered', {
        messageId,
        senderId,
        status: 'delivered',
        timestamp: Date.now()
      });
    });

    socket.on('message-seen', ({ channelName, messageId, userId }) => {
      // Notify the sender
      socket.to(channelName).emit('message-status-update', {
        messageId,
        status: 'seen',
        seenBy: userId,
        timestamp: Date.now()
      });
      console.log(`👀 Message ${messageId} seen by ${userId}`);
    });

    socket.on('messages-seen-bulk', ({ channelName, messageIds, userId }) => {
      // Bulk update for multiple messages
      socket.to(channelName).emit('messages-status-bulk-update', {
        messageIds,
        status: 'seen',
        seenBy: userId,
        timestamp: Date.now()
      });
    });

    // ========== CHAT MESSAGES ==========
    socket.on('chat-message', ({ channelName, message }) => {
      // Broadcast message to all users in channel
      io.to(channelName).emit('new-chat-message', {
        ...message,
        timestamp: Date.now()
      });
      console.log(`💬 Message in ${channelName}: ${message.text?.substring(0, 50)}`);
    });

    // ========== CALL NOTIFICATIONS ==========
    socket.on('provider-register', ({ providerId }) => {
      socket.providerId = providerId;
      socket.join(`provider-${providerId}`);
      console.log(`👨‍⚕️ Provider ${providerId} registered for notifications`);
    });

    socket.on('incoming-call-alert', ({ providerId, callData }) => {
      io.to(`provider-${providerId}`).emit('incoming-call', callData);
      console.log(`📞 Call alert sent to provider ${providerId}`);
    });

    // ========== FILE SHARING (Optional) ==========
    socket.on('file-upload', ({ channelName, fileData }) => {
      socket.to(channelName).emit('file-received', fileData);
      console.log(`📎 File shared in ${channelName}`);
    });

    // ========== CALL CONTROL SIGNALS ==========
    socket.on('call-signal', ({ channelName, signal, data }) => {
      socket.to(channelName).emit('call-signal-received', {
        signal,
        data,
        from: socket.userId,
        timestamp: Date.now()
      });
    });

    // ========== DISCONNECT HANDLING ==========
    socket.on('disconnect', async () => {
      const userId = socketUserMap.get(socket.id);
      
      if (userId) {
        userSocketMap.delete(userId);
        socketUserMap.delete(socket.id);
      }
      
      // Remove from all chat sessions
      if (socket.currentChannel) {
        const channelName = socket.currentChannel;
        
        if (activeChatSessions.has(channelName)) {
          activeChatSessions.get(channelName).delete(userId);
          
          // Notify others
          socket.to(channelName).emit('user-left-chat', {
            userId,
            userName: socket.userName,
            timestamp: Date.now()
          });
          
          // Send system message
          io.to(channelName).emit('system-message', {
            id: `system-${Date.now()}`,
            type: 'system',
            text: `${socket.userName || 'User'} disconnected`,
            timestamp: Date.now()
          });
        }
      }
      
      // Update provider presence if applicable
      if (socket.providerId) {
        try {
          await Provider.findByIdAndUpdate(socket.providerId, {
            'presence.isOnline': false,
            'presence.availabilityStatus': 'offline',
            'presence.lastSeen': new Date()
          });
          
          io.emit('presenceChanged', {
            providerId: socket.providerId,
            isOnline: false,
            status: 'offline'
          });
        } catch (err) {
          console.error('Error updating provider presence on disconnect:', err);
        }
      }
      
      console.log('❌ Client disconnected:', socket.id);
    });

    // ========== ERROR HANDLING ==========
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Store io instance in Express app
  return io;
};

export const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

// Helper function to get active users in a channel
export const getChannelUsers = (channelName) => {
  return activeChatSessions.get(channelName) || new Set();
};

// Helper function to send notification to specific user
export const sendToUser = (userId, event, data) => {
  const socketId = userSocketMap.get(userId);
  if (socketId && io) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

// Helper function to broadcast to channel
export const broadcastToChannel = (channelName, event, data) => {
  if (io) {
    io.to(channelName).emit(event, data);
    return true;
  }
  return false;
};

