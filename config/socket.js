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
    console.log('New client connected', socket.id);

    // Provider updates presence
   socket.on('updatePresence', async ({ providerId, isOnline }) => {
  const status = isOnline ? 'online' : 'offline';
  await Provider.findByIdAndUpdate(providerId, {
    'presence.isOnline': isOnline,
    'presence.availabilityStatus': status,
    'presence.lastSeen': new Date()
  });

  io.emit('presenceChanged', { providerId, isOnline, status });
});


    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};


