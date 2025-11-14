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


// server-socket-handler.js
// Add this to your main server file or create a separate socket handler

import { Server } from 'socket.io';

export const setupSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Store connected users and providers
  const connectedProviders = new Map(); // providerId -> socketId
  const connectedUsers = new Map(); // userId -> socketId
  const chatRooms = new Map(); // channelName -> Set of socketIds

  io.on('connection', (socket) => {
    console.log('🔌 New socket connection:', socket.id);

    // Register provider
    socket.on('register-provider', (providerId) => {
      connectedProviders.set(providerId, socket.id);
      socket.providerId = providerId;
      console.log(`✅ Provider registered: ${providerId} (socket: ${socket.id})`);
    });

    // Register user
    socket.on('register-user', (userId) => {
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;
      console.log(`✅ User registered: ${userId} (socket: ${socket.id})`);
    });

    // Join chat room
    socket.on('join-chat-room', ({ channelName, userId }) => {
      socket.join(channelName);
      
      if (!chatRooms.has(channelName)) {
        chatRooms.set(channelName, new Set());
      }
      chatRooms.get(channelName).add(socket.id);
      
      console.log(`🚪 User ${userId} joined chat room: ${channelName}`);
      
      // Notify others in the room
      socket.to(channelName).emit('user-joined-chat', {
        userId,
        channelName,
        timestamp: new Date()
      });
    });

    // Leave chat room
    socket.on('leave-chat-room', ({ channelName, userId }) => {
      socket.leave(channelName);
      
      if (chatRooms.has(channelName)) {
        chatRooms.get(channelName).delete(socket.id);
        if (chatRooms.get(channelName).size === 0) {
          chatRooms.delete(channelName);
        }
      }
      
      console.log(`🚪 User ${userId} left chat room: ${channelName}`);
      
      // Notify others in the room
      socket.to(channelName).emit('user-left-chat', {
        userId,
        channelName,
        timestamp: new Date()
      });
    });

    // User left chat notification
    socket.on('user-left-chat', ({ channelName, userId }) => {
      console.log(`👋 User ${userId} left chat: ${channelName}`);
      
      // Notify all participants in the channel
      io.to(channelName).emit('user-left-chat', {
        userId,
        channelName,
        timestamp: new Date()
      });
    });

    // Typing status
    socket.on('typing-status', ({ channelName, userId, isTyping }) => {
      // Broadcast to others in the room (not to sender)
      socket.to(channelName).emit('typing-status', {
        userId,
        isTyping,
        timestamp: new Date()
      });
    });

    // Message delivered acknowledgment
    socket.on('message-delivered', ({ channelName, messageId, userId }) => {
      console.log(`✓✓ Message ${messageId} delivered to ${userId}`);
      
      // Notify sender that message was delivered
      io.to(channelName).emit('message-delivered', {
        messageId,
        userId,
        timestamp: new Date()
      });
    });

    // Message seen acknowledgment
    socket.on('message-seen', ({ channelName, messageIds, userId }) => {
      console.log(`👁️ Messages seen by ${userId}:`, messageIds);
      
      // Notify sender that messages were seen
      io.to(channelName).emit('message-seen', {
        messageIds,
        userId,
        timestamp: new Date()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id);
      
      // Clean up provider registration
      if (socket.providerId) {
        connectedProviders.delete(socket.providerId);
        console.log(`Provider ${socket.providerId} disconnected`);
      }
      
      // Clean up user registration
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        console.log(`User ${socket.userId} disconnected`);
      }
      
      // Clean up chat rooms
      chatRooms.forEach((sockets, channelName) => {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          
          // Notify others that user left
          io.to(channelName).emit('user-left-chat', {
            userId: socket.userId || socket.providerId,
            channelName,
            reason: 'disconnect',
            timestamp: new Date()
          });
          
          if (sockets.size === 0) {
            chatRooms.delete(channelName);
          }
        }
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Store references for use in routes
  io.connectedProviders = connectedProviders;
  io.connectedUsers = connectedUsers;
  io.chatRooms = chatRooms;

  console.log('✅ Socket.IO setup complete');
  
  return io;
};

// Export function to emit to specific user
export const emitToUser = (io, userId, event, data) => {
  const socketId = io.connectedUsers.get(userId) || io.connectedProviders.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

// Export function to emit to channel
export const emitToChannel = (io, channelName, event, data) => {
  io.to(channelName).emit(event, data);
};

// Export function to check if user is online
export const isUserOnline = (io, userId) => {
  return io.connectedUsers.has(userId) || io.connectedProviders.has(userId);
};
