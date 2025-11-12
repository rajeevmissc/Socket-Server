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




// config/socket.js - Fixed Socket.IO implementation
import { Server } from 'socket.io';
import Provider from '../models/Provider.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Store connected providers and users
  const connectedProviders = new Map();
  const connectedUsers = new Map();
  const userSockets = new Map();

  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    // ✅ CRITICAL: Provider registration for CHAT notifications
    socket.on('registerProvider', ({ providerId, providerName }) => {
      // Store in all maps for maximum compatibility
      connectedProviders.set(providerId, socket.id);
      userSockets.set(providerId, socket.id);
      
      console.log(`✅ PROVIDER REGISTERED FOR CHAT: ${providerId} (${providerName})`);
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`📊 Total providers connected: ${connectedProviders.size}`);
      console.log(`   Provider IDs:`, Array.from(connectedProviders.keys()));
      
      // Also update database presence
      Provider.findByIdAndUpdate(providerId, {
        'presence.isOnline': true,
        'presence.availabilityStatus': 'online',
        'presence.lastSeen': new Date()
      }).catch(err => console.error('Error updating provider presence:', err));
    });

    // ✅ Provider updates presence (for backward compatibility with calls)
    socket.on('updatePresence', async ({ providerId, isOnline }) => {
      try {
        const status = isOnline ? 'online' : 'offline';
        await Provider.findByIdAndUpdate(providerId, {
          'presence.isOnline': isOnline,
          'presence.availabilityStatus': status,
          'presence.lastSeen': new Date()
        });

        // ✅ CRITICAL: Also store in chat maps when online
        if (isOnline) {
          connectedProviders.set(providerId, socket.id);
          userSockets.set(providerId, socket.id);
          console.log(`✅ Provider ${providerId} presence updated - registered for chat`);
        } else {
          connectedProviders.delete(providerId);
          userSockets.delete(providerId);
          console.log(`❌ Provider ${providerId} went offline`);
        }

        console.log(`📊 Total providers after presence update: ${connectedProviders.size}`);

        // Broadcast to all clients
        io.emit('presenceChanged', { providerId, isOnline, status });
      } catch (err) {
        console.error('Error updating presence:', err);
      }
    });

    // ✅ User registration for chat
    socket.on('registerUser', ({ userId, userName }) => {
      connectedUsers.set(userId, socket.id);
      userSockets.set(userId, socket.id);
      console.log(`✅ User ${userId} (${userName}) registered for chat`);
      console.log(`   Socket ID: ${socket.id}`);
    });

    // ✅ Chat room management
    socket.on('joinChatRoom', (roomId) => {
      socket.join(roomId);
      console.log(`📥 Socket ${socket.id} joined chat room: ${roomId}`);
    });

    socket.on('leaveChatRoom', (roomId) => {
      socket.leave(roomId);
      console.log(`📤 Socket ${socket.id} left chat room: ${roomId}`);
    });

    // ✅ Handle disconnection - clean up all maps
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
      
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
          }).catch(err => console.error('Error updating presence on disconnect:', err));
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

    // ✅ Periodic connection status log (every 30 seconds)
    const statusInterval = setInterval(() => {
      console.log(`📊 SOCKET STATUS CHECK:`);
      console.log(`   Connected providers: ${connectedProviders.size}`);
      console.log(`   Provider IDs:`, Array.from(connectedProviders.keys()));
      console.log(`   Total socket clients: ${io.sockets.sockets.size}`);
    }, 30000);

    socket.on('disconnect', () => {
      clearInterval(statusInterval);
    });
  });

  // Make connected maps available to routes
  io.connectedProviders = connectedProviders;
  io.connectedUsers = connectedUsers;
  io.userSockets = userSockets;

  console.log('✅ Socket.IO initialized successfully');
  console.log(`   CORS origin: ${process.env.FRONTEND_URL || '*'}`);

  return io;
};

export const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};
