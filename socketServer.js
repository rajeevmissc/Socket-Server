// socketServer.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);

// ✅ Setup Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Track online providers
const onlineProviders = new Map();

io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);

  // Provider joins
  socket.on('registerProvider', (providerId) => {
    onlineProviders.set(providerId, socket.id);
    console.log(`📲 Provider ${providerId} registered with socket ${socket.id}`);
  });

  // Client calls provider
  socket.on('notifyCall', (data) => {
    const { providerId } = data;
    const providerSocketId = onlineProviders.get(providerId);
    if (providerSocketId) {
      io.to(providerSocketId).emit('incomingCall', data);
      console.log(`📞 Sent incoming call to provider ${providerId}`);
    }
  });

  socket.on('disconnect', () => {
    for (const [providerId, sockId] of onlineProviders.entries()) {
      if (sockId === socket.id) {
        onlineProviders.delete(providerId);
        console.log(`🔴 Provider ${providerId} disconnected`);
      }
    }
  });
});

const PORT = process.env.SOCKET_PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`⚡ Socket.IO server running on port ${PORT}`);
});
