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
      origin: '*', // change to your frontend URL if needed
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ New client connected:', socket.id);

    // Provider updates presence
    socket.on('updatePresence', async ({ providerId, isOnline }) => {
      try {
        const status = isOnline ? 'online' : 'offline';
        await Provider.findByIdAndUpdate(providerId, {
          'presence.isOnline': isOnline,
          'presence.availabilityStatus': status,
          'presence.lastSeen': new Date()
        });
        console.log(`📊 Presence updated for provider ${providerId}: ${status}`);
        // Broadcast to all clients
        io.emit('presenceChanged', { providerId, isOnline, status });
      } catch (err) {
        console.error('❌ Error updating presence:', err);
      }
    });

    // Join call room - Users join a specific call channel
    socket.on('join-call-room', ({ channelName, callType, userRole }) => {
      socket.join(channelName);
      console.log(`📍 Socket ${socket.id} (${userRole}) joined call room: ${channelName} (${callType})`);
      
      // Notify others in the room
      socket.to(channelName).emit('user-joined-room', {
        socketId: socket.id,
        userRole,
        channelName
      });

      // Send confirmation to the user who joined
      socket.emit('room-joined', {
        channelName,
        success: true
      });
    });

    // Leave call room
    socket.on('leave-call-room', ({ channelName }) => {
      socket.leave(channelName);
      console.log(`👋 Socket ${socket.id} left call room: ${channelName}`);
      
      // Notify others in the room
      socket.to(channelName).emit('user-left-room', {
        socketId: socket.id,
        channelName
      });
    });

    // Handle call decline from provider
    socket.on('decline-call', ({ channelName, callId, providerId, reason, callType }) => {
      console.log(`❌ Call declined for channel: ${channelName}`);
      console.log(`   Reason: ${reason}`);
      console.log(`   Provider: ${providerId}`);
      
      // Emit decline event to all users in the call room
      io.to(channelName).emit('call-declined', {
        callId: callId || channelName,
        channelName: channelName,
        providerId: providerId,
        reason: reason || 'Provider is currently unavailable',
        callType: callType,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ call-declined event emitted to room: ${channelName}`);
    });

    // Handle call acceptance (optional - for future use)
    socket.on('accept-call', ({ channelName, providerId }) => {
      console.log(`✅ Call accepted for channel: ${channelName} by provider: ${providerId}`);
      
      io.to(channelName).emit('call-accepted', {
        channelName,
        providerId,
        timestamp: new Date().toISOString()
      });
    });

    // Handle call end
    socket.on('end-call', ({ channelName, endedBy, reason }) => {
      console.log(`🔚 Call ended for channel: ${channelName} by: ${endedBy}`);
      
      io.to(channelName).emit('call-ended', {
        channelName,
        endedBy,
        reason,
        timestamp: new Date().toISOString()
      });
    });

    // Handle chat messages in call
    socket.on('send-call-message', ({ channelName, message, senderId, senderRole }) => {
      console.log(`💬 Message in ${channelName} from ${senderRole}`);
      
      // Broadcast to all users in the room including sender
      io.to(channelName).emit('call-message-received', {
        channelName,
        message,
        senderId,
        senderRole,
        timestamp: new Date().toISOString()
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  // Log server info
  console.log('🚀 Socket.IO server initialized');
  console.log('📡 CORS enabled for all origins');

  return io;
};

export const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

// Helper function to emit call decline from routes
export const emitCallDecline = (channelName, data) => {
  if (!io) {
    console.error('❌ Socket.io not initialized, cannot emit call-declined');
    return;
  }

  console.log(`📤 Emitting call-declined to room: ${channelName}`);
  
  io.to(channelName).emit('call-declined', {
    callId: data.callId || channelName,
    channelName: channelName,
    providerId: data.providerId,
    reason: data.reason || 'Provider is currently unavailable',
    callType: data.callType,
    timestamp: new Date().toISOString()
  });

  console.log(`✅ call-declined event emitted successfully`);
};

// Helper function to check if room exists and has members
export const getRoomInfo = (channelName) => {
  if (!io) return null;
  
  const room = io.sockets.adapter.rooms.get(channelName);
  return {
    exists: !!room,
    memberCount: room ? room.size : 0,
    members: room ? Array.from(room) : []
  };
};

