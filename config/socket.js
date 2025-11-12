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





// config/socket.js - Complete Socket.IO implementation
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
  const userSockets = new Map();

  io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    // ✅ Provider updates presence AND registers for chat
    socket.on('updatePresence', async ({ providerId, isOnline }) => {
      try {
        const status = isOnline ? 'online' : 'offline';
        await Provider.findByIdAndUpdate(providerId, {
          'presence.isOnline': isOnline,
          'presence.availabilityStatus': status,
          'presence.lastSeen': new Date()
        });

        // ✅ CRITICAL: Store provider connection for chat notifications
        if (isOnline) {
          connectedProviders.set(providerId, socket.id);
          userSockets.set(providerId, socket.id);
          console.log(`✅ Provider ${providerId} connected and registered for chat`);
        } else {
          connectedProviders.delete(providerId);
          userSockets.delete(providerId);
          console.log(`❌ Provider ${providerId} disconnected`);
        }

        console.log(`📊 Total providers connected: ${connectedProviders.size}`);
        console.log('Connected providers:', Array.from(connectedProviders.keys()));

        // Broadcast to all clients
        io.emit('presenceChanged', { providerId, isOnline, status });
      } catch (err) {
        console.error('Error updating presence', err);
      }
    });

    // ✅ User connection tracking for chat
    socket.on('userConnected', ({ userId }) => {
      connectedUsers.set(userId, socket.id);
      userSockets.set(userId, socket.id);
      console.log(`✅ User ${userId} connected with socket ${socket.id}`);
    });

    // ✅ Provider registration specifically for chat
    socket.on('registerProvider', ({ providerId, providerName }) => {
      connectedProviders.set(providerId, socket.id);
      userSockets.set(providerId, socket.id);
      console.log(`✅ Provider ${providerId} (${providerName}) registered for chat`);
      console.log(`📊 Total providers connected: ${connectedProviders.size}`);
      console.log('Connected providers:', Array.from(connectedProviders.keys()));
    });

    // ✅ User registration for chat
    socket.on('registerUser', ({ userId, userName }) => {
      connectedUsers.set(userId, socket.id);
      userSockets.set(userId, socket.id);
      console.log(`✅ User ${userId} (${userName}) registered for chat`);
    });

    // ✅ Chat room management
    socket.on('joinChatRoom', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined chat room: ${roomId}`);
    });

    socket.on('leaveChatRoom', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left chat room: ${roomId}`);
    });

    // ✅ Handle disconnection - clean up maps
    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
      
      // Clean up connected providers
      for (const [providerId, socketId] of connectedProviders.entries()) {
        if (socketId === socket.id) {
          connectedProviders.delete(providerId);
          userSockets.delete(providerId);
          console.log(`❌ Provider ${providerId} removed from connected providers`);
          
          // Update presence status in database
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
          console.log(`❌ User ${userId} removed from connected users`);
          break;
        }
      }

      console.log(`📊 Remaining: ${connectedProviders.size} providers, ${connectedUsers.size} users`);
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
