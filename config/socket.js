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

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  // Store connected providers and users
  const connectedProviders = new Map();
  const connectedUsers = new Map();
  const userSockets = new Map(); // Track socket by user ID

  io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    // ✅ EXISTING FEATURE: Provider updates presence
    socket.on('updatePresence', async ({ providerId, isOnline }) => {
      try {
        const status = isOnline ? 'online' : 'offline';
        await Provider.findByIdAndUpdate(providerId, {
          'presence.isOnline': isOnline,
          'presence.availabilityStatus': status,
          'presence.lastSeen': new Date()
        });

        // Store provider connection
        if (isOnline) {
          connectedProviders.set(providerId, socket.id);
          userSockets.set(providerId, socket.id);
        } else {
          connectedProviders.delete(providerId);
          userSockets.delete(providerId);
        }

        // Broadcast to all clients
        io.emit('presenceChanged', { providerId, isOnline, status });
        console.log(`Provider ${providerId} presence updated: ${status}`);
      } catch (err) {
        console.error('Error updating presence', err);
      }
    });

    // ✅ EXISTING FEATURE: User connection tracking
    socket.on('userConnected', ({ userId }) => {
      connectedUsers.set(userId, socket.id);
      userSockets.set(userId, socket.id);
      console.log(`User ${userId} connected with socket ${socket.id}`);
    });

    // ✅ NEW FEATURE: User/Provider registration for chat
    socket.on('registerUser', ({ userId, userType, userName }) => {
      if (userType === 'provider') {
        connectedProviders.set(userId, socket.id);
      } else {
        connectedUsers.set(userId, socket.id);
      }
      userSockets.set(userId, socket.id);
      console.log(`Registered ${userType} ${userId} (${userName}) for chat`);
    });

    // ✅ NEW FEATURE: Chat room management
    socket.on('joinChatRoom', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined chat room: ${roomId}`);
    });

    socket.on('leaveChatRoom', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left chat room: ${roomId}`);
    });

    // ✅ NEW FEATURE: Chat typing indicators
    socket.on('chatTypingStart', (data) => {
      socket.to(data.roomId).emit('userTyping', {
        userId: data.userId,
        userName: data.userName,
        isTyping: true,
        roomId: data.roomId
      });
    });

    socket.on('chatTypingStop', (data) => {
      socket.to(data.roomId).emit('userTyping', {
        userId: data.userId,
        userName: data.userName,
        isTyping: false,
        roomId: data.roomId
      });
    });

    // ✅ NEW FEATURE: Send chat message
    socket.on('sendChatMessage', (data) => {
      // Broadcast to everyone in the room except sender
      socket.to(data.roomId).emit('newChatMessage', {
        ...data,
        timestamp: new Date(),
        messageId: Date.now().toString()
      });
      
      console.log(`Chat message sent in room ${data.roomId} by ${data.senderName}`);
    });

    // ✅ NEW FEATURE: Notify provider about new chat session
    socket.on('notifyNewChatSession', (data) => {
      const { providerId, sessionId, roomId, userName, userId } = data;
      const providerSocketId = connectedProviders.get(providerId);
      
      if (providerSocketId) {
        io.to(providerSocketId).emit('newChatSessionNotification', {
          sessionId,
          roomId,
          userName,
          userId,
          timestamp: new Date(),
          message: `New chat request from ${userName}`
        });
        console.log(`🔔 Notified provider ${providerId} about new chat session from ${userName}`);
      } else {
        console.log(`Provider ${providerId} is not connected - cannot notify about new chat`);
      }
    });

    // ✅ NEW FEATURE: Notify provider about new message
    socket.on('notifyNewMessage', (data) => {
      const { providerId, sessionId, roomId, senderName, messageText, userId } = data;
      const providerSocketId = connectedProviders.get(providerId);
      
      if (providerSocketId) {
        io.to(providerSocketId).emit('newMessageNotification', {
          sessionId,
          roomId,
          senderName,
          messageText: messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText,
          userId,
          timestamp: new Date()
        });
        console.log(`📩 Notified provider ${providerId} about new message from ${senderName}`);
      } else {
        console.log(`Provider ${providerId} is not connected - message notification failed`);
      }
    });

    // ✅ NEW FEATURE: Call request from chat
    socket.on('chatCallRequest', (data) => {
      const { providerId, roomId, callType, userName, userId } = data;
      const providerSocketId = connectedProviders.get(providerId);
      
      if (providerSocketId) {
        io.to(providerSocketId).emit('incomingCallFromChat', {
          roomId,
          callType,
          userName,
          userId,
          timestamp: new Date()
        });
        console.log(`📞 Chat call request sent to provider ${providerId}`);
      } else {
        socket.emit('chatCallRequestFailed', {
          message: 'Provider is not available'
        });
      }
    });

    // ✅ NEW FEATURE: Call response from provider
    socket.on('chatCallResponse', (data) => {
      const { roomId, accepted, userId } = data;
      const userSocketId = userSockets.get(userId);
      
      if (userSocketId) {
        io.to(userSocketId).emit('chatCallResponded', {
          roomId,
          accepted,
          timestamp: new Date()
        });
        console.log(`Call response sent to user ${userId}: ${accepted ? 'accepted' : 'rejected'}`);
      }
    });

    // ✅ NEW FEATURE: Read receipt for messages
    socket.on('markMessagesRead', (data) => {
      const { roomId, messageIds, userId } = data;
      socket.to(roomId).emit('messagesRead', {
        messageIds,
        userId,
        timestamp: new Date()
      });
    });

    // ✅ EXISTING + NEW: Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
      
      // Clean up connected providers
      for (const [providerId, socketId] of connectedProviders.entries()) {
        if (socketId === socket.id) {
          connectedProviders.delete(providerId);
          userSockets.delete(providerId);
          console.log(`Provider ${providerId} disconnected`);
          
          // Update presence status
          Provider.findByIdAndUpdate(providerId, {
            'presence.isOnline': false,
            'presence.availabilityStatus': 'offline',
            'presence.lastSeen': new Date()
          }).catch(err => console.error('Error updating presence on disconnect', err));
          break;
        }
      }

      // Clean up connected users
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          userSockets.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });

    // ✅ EXISTING FEATURE: Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Make connected maps available to routes
  io.connectedProviders = connectedProviders;
  io.connectedUsers = connectedUsers;
  io.userSockets = userSockets;

  return io;
};

export const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};
