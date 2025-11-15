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
const connectedProviders = new Map(); // providerId -> socketId
const connectedUsers = new Map();     // userId -> socketId
const channelToSockets = new Map();   // channelName -> Set of socketIds

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log('✅ New client connected:', socket.id);

    // Register provider with their socket
    socket.on('register-provider', (providerId) => {
      if (!providerId) {
        console.error('❌ Invalid providerId');
        return;
      }

      connectedProviders.set(providerId, socket.id);
      console.log(`📝 Provider registered: ${providerId} -> ${socket.id}`);
      console.log(`📊 Total connected providers: ${connectedProviders.size}`);

      // Update provider presence
      Provider.findByIdAndUpdate(providerId, {
        'presence.isOnline': true,
        'presence.availabilityStatus': 'online',
        'presence.lastSeen': new Date()
      }).catch(err => console.error('Error updating provider presence:', err));
    });

    // Register user with their socket
    socket.on('register-user', (userId) => {
      if (!userId) {
        console.error('❌ Invalid userId');
        return;
      }

      connectedUsers.set(userId, socket.id);
      console.log(`📝 User registered: ${userId} -> ${socket.id}`);
      console.log(`📊 Total connected users: ${connectedUsers.size}`);
    });

    // Join a call channel (both provider and user)
    socket.on('join-channel', (channelName) => {
      if (!channelName) {
        console.error('❌ Invalid channelName');
        return;
      }

      socket.join(channelName);
      
      if (!channelToSockets.has(channelName)) {
        channelToSockets.set(channelName, new Set());
      }
      channelToSockets.get(channelName).add(socket.id);

      console.log(`📞 Socket ${socket.id} joined channel: ${channelName}`);
      console.log(`📊 Channel ${channelName} has ${channelToSockets.get(channelName).size} participants`);
    });

    // Leave a call channel
    socket.on('leave-channel', (channelName) => {
      if (!channelName) return;

      socket.leave(channelName);
      
      if (channelToSockets.has(channelName)) {
        channelToSockets.get(channelName).delete(socket.id);
        if (channelToSockets.get(channelName).size === 0) {
          channelToSockets.delete(channelName);
        }
      }

      console.log(`📞 Socket ${socket.id} left channel: ${channelName}`);
    });

    // Provider updates presence
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
        console.log(`👤 Presence updated for ${providerId}: ${status}`);
      } catch (err) {
        console.error('Error updating presence:', err);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);

      // Remove from providers map
      for (const [providerId, socketId] of connectedProviders.entries()) {
        if (socketId === socket.id) {
          connectedProviders.delete(providerId);
          console.log(`🔴 Provider ${providerId} disconnected`);
          
          // Update provider offline status
          Provider.findByIdAndUpdate(providerId, {
            'presence.isOnline': false,
            'presence.availabilityStatus': 'offline',
            'presence.lastSeen': new Date()
          }).catch(err => console.error('Error updating provider presence:', err));
          
          break;
        }
      }

      // Remove from users map
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`🔴 User ${userId} disconnected`);
          break;
        }
      }

      // Remove from all channels
      for (const [channelName, sockets] of channelToSockets.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            channelToSockets.delete(channelName);
          }
        }
      }
    });
  });

  // Store io instance and maps in Express app for use in routes
  return { io, connectedProviders, connectedUsers, channelToSockets };
};

export const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

export const getConnectedProviders = () => connectedProviders;
export const getConnectedUsers = () => connectedUsers;
export const getChannelToSockets = () => channelToSockets;
