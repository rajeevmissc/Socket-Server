// // server.js - Unified Backend with Socket.IO, Presence, Calls & All API Features
// import express from 'express';
// import { createServer } from 'http';
// import { Server } from 'socket.io';
// import cors from 'cors';
// import helmet from 'helmet';
// import compression from 'compression';
// import morgan from 'morgan';
// import mongoose from 'mongoose';
// import dotenv from 'dotenv';

// // Routes
// import agoraRoutes from './routes/agora.js';
// import authRoutes from './routes/authRoutes.js';
// import userRoutes from './routes/userRoutes.js';
// // Wallet module routes
// import walletRoutes from './routes/wallet.routes.js';
// import paymentRoutes from './routes/payment.routes.js';
// import transactionRoutes from './routes/transaction.routes.js';
// import webhookRoutes from './routes/webhook.routes.js';
// import testimonialRoutes from './routes/testimonialRoutes.js';
// import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
// import { rateLimiter } from './middleware/rateLimitMiddleware.js';
// import { authenticateToken } from './middleware/authMiddleware.js';
// import slotRoutes from './routes/slot.routes.js';
// import bookingRoutes from './routes/booking.routes.js';
// import providerRoutes from './routes/providerRoutes.js';
// import feedbackRoutes from './routes/feedbackRoutes.js';
// import notificationRoutes from './routes/notifications.js';
// import verificationRoutes from './routes/verification.routes.js';
// import Provider from './models/Provider.js';

// dotenv.config();

// const app = express();
// const httpServer = createServer(app);

// /* ------------------------------------------------------
//     SOCKET.IO SETUP (Merged Features)
// -------------------------------------------------------*/
// const io = new Server(httpServer, {
//   cors: {
//     origin: process.env.FRONTEND_URL || 'https://socket-server-d9ts.onrender.com',
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
//   },
//   transports: ['websocket', 'polling']
// });

// // Track connected providers and busy states
// const connectedProviders = new Map();
// const busyProviders = new Map(); // ✅ NEW: Track providers currently in calls

// io.on('connection', (socket) => {
//   console.log('🔌 Socket connected:', socket.id);

//   /* ------------------------------
//       1️⃣ Provider Registers
//   ------------------------------*/
//   socket.on('register-provider', (providerId) => {
//     if (!providerId) return;

//     connectedProviders.set(providerId, socket.id);
//     console.log(`🟢 Provider Registered → ${providerId} | Socket = ${socket.id}`);

//     io.emit("providerOnline", { providerId });
//   });

//   /* ------------------------------
//       2️⃣ Presence Update (Online/Offline)
//   ------------------------------*/
//   socket.on('updatePresence', async ({ providerId, isOnline }) => {
//     if (!providerId) return;

//     const status = isOnline ? "online" : "offline";

//     await Provider.findByIdAndUpdate(providerId, {
//       "presence.isOnline": isOnline,
//       "presence.availabilityStatus": status,
//       "presence.lastSeen": new Date()
//     });

//     console.log(`📌 Presence Updated → ${providerId}: ${status}`);

//     io.emit("presenceChanged", {
//       providerId,
//       isOnline,
//       status
//     });
//   });

//   /* ------------------------------
//       3️⃣ Send Incoming Call to Provider
//   ------------------------------*/
//   socket.on('notifyCall', (data) => {
//     const { providerId } = data;
//     const providerSocketId = connectedProviders.get(providerId);

//     if (providerSocketId) {
//       io.to(providerSocketId).emit('incomingCall', data);
//       console.log(`📞 Incoming call forwarded → Provider: ${providerId}`);
//     } else {
//       console.log(`⚠️ Provider offline, cannot deliver call → ${providerId}`);
//     }
//   });

//   /* ------------------------------
//       4️⃣ Call Type Switch (Chat/Audio/Video)
//   ------------------------------*/
//   socket.on('switch-call-type', async (data) => {
//     console.log('🔄 Call type switch requested:', data);
    
//     const { channelName, newCallType, userId, providerId } = data;
    
//     // Emit to all users in the channel (especially the provider)
//     io.to(channelName).emit('call-type-switch', {
//       channelName,
//       newCallType,
//       callId: channelName
//     });
    
//     console.log(`✅ Notified all users in ${channelName} about switch to ${newCallType}`);
//   });
    
//   /* ------------------------------
//       5️⃣ When Provider Disconnects
//   ------------------------------*/
//   socket.on("disconnect", () => {
//     for (const [providerId, socketId] of connectedProviders.entries()) {
//       if (socketId === socket.id) {
//         connectedProviders.delete(providerId);
//         busyProviders.delete(providerId); // ✅ Also remove from busy state
//         console.log(`🔴 Provider Disconnected → ${providerId}`);

//         io.emit("presenceChanged", {
//           providerId,
//           isOnline: false,
//           status: "offline"
//         });
//         break;
//       }
//     }
//   });
// });

// // Expose io and tracking maps for routes to use
// app.set('io', io);
// app.set('connectedProviders', connectedProviders);
// app.set('busyProviders', busyProviders); // ✅ NEW: Expose busy providers

// /* ------------------------------------------------------
//     BASE SERVER CONFIG
// -------------------------------------------------------*/
// app.set('trust proxy', 1);
// app.use(cors({
//   origin: process.env.FRONTEND_URL || "https://videocall-theta-pearl.vercel.app",
//   methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true,
// }));

// // Handle preflight
// app.options("*", cors());

// app.use(compression());
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// app.use(helmet({
//   contentSecurityPolicy: false,
// }));
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// } else {
//   app.use(morgan('combined'));
// }

// /* ------------------------------------------------------
//     MONGODB CONNECTION
// -------------------------------------------------------*/
// let cachedDb = null;

// async function connectToDatabase() {
//   if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;

//   const conn = await mongoose.connect(process.env.MONGO_URI);
//   cachedDb = conn;
//   console.log("🍃 MongoDB Connected");

//   return conn;
// }

// app.use(async (req, res, next) => {
//   await connectToDatabase();
//   next();
// });

// /* ------------------------------------------------------
//     ROUTES
// -------------------------------------------------------*/
// app.get('/api/health', (req, res) => {
//   res.json({
//     success: true,
//     status: "OK",
//     database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
//     connectedProviders: connectedProviders.size,
//     busyProviders: busyProviders.size // ✅ NEW: Show busy providers count
//   });
// });

// // ------------------ API Routes ------------------
// // Public routes
// app.use('/api/auth', authRoutes);
// app.use('/api/user', userRoutes);
// app.use('/api/agora', agoraRoutes);
// app.use('/api/notifications', notificationRoutes);
// // Wallet module routes with authentication
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/verification', verificationRoutes);
// app.use('/api/slots', slotRoutes);
// app.use('/api/wallet', authenticateToken, walletRoutes);
// app.use('/api/payments', authenticateToken, paymentRoutes);
// app.use('/api/transactions', authenticateToken, transactionRoutes);
// app.use('/api/testimonials', testimonialRoutes);
// app.use('/api/providers', providerRoutes);
// // Webhooks (no auth required)
// app.use('/api/webhooks', webhookRoutes);
// app.use('/api/feedback', feedbackRoutes);

// // ------------------ Error Handling ------------------
// app.use(notFoundHandler);
// app.use(errorHandler);

// /* ------------------------------------------------------
//     START SERVER
// -------------------------------------------------------*/
// const PORT = process.env.PORT || 5000;

// connectToDatabase().then(() => {
//   httpServer.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
//   });
// });






// server.js - Unified Backend with Socket.IO, Presence, Calls & All API Features
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Routes
import agoraRoutes from './routes/agora.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Wallet module routes
import walletRoutes from './routes/wallet.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import webhookRoutes from './routes/webhook.routes.js';

import testimonialRoutes from './routes/testimonialRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import { authenticateToken } from './middleware/authMiddleware.js';
import { rateLimiter } from './middleware/rateLimitMiddleware.js';

import slotRoutes from './routes/slot.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import providerRoutes from './routes/providerRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import notificationRoutes from './routes/notifications.js';
import verificationRoutes from './routes/verification.routes.js';

import Provider from './models/Provider.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

/* ------------------------------------------------------
    SOCKET.IO SETUP
-------------------------------------------------------*/
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://socket-server-d9ts.onrender.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  transports: ['websocket', 'polling']
});

// Track connected providers and busy states
const connectedProviders = new Map();
const busyProviders = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  /* ------------------------------
      1️⃣ Provider Registers
  ------------------------------*/
  socket.on('register-provider', async (providerId) => {
    try {
      if (!providerId) return;

      connectedProviders.set(providerId, socket.id);
      console.log(`🟢 Provider Registered → ${providerId} | Socket = ${socket.id}`);

      // Mark provider ONLINE in DB
      await Provider.findByIdAndUpdate(providerId, {
        'presence.isOnline': true,
        'presence.availabilityStatus': 'online',
        'presence.lastSeen': new Date()
      });

      // Broadcast unified presenceChanged
      io.emit('presenceChanged', {
        providerId,
        isOnline: true,
        status: 'online'
      });

      // Legacy event kept for compatibility
      io.emit('providerOnline', { providerId });
    } catch (err) {
      console.error('❌ Error in register-provider:', err);
    }
  });

  /* ------------------------------
      2️⃣ Presence Update (Online/Offline)
  ------------------------------*/
  socket.on('updatePresence', async ({ providerId, isOnline }) => {
    try {
      if (!providerId) return;

      const status = isOnline ? 'online' : 'offline';

      await Provider.findByIdAndUpdate(providerId, {
        'presence.isOnline': isOnline,
        'presence.availabilityStatus': status,
        'presence.lastSeen': new Date()
      });

      console.log(`📌 Presence Updated → ${providerId}: ${status}`);

      io.emit('presenceChanged', {
        providerId,
        isOnline,
        status
      });
    } catch (err) {
      console.error('❌ Error in updatePresence:', err);
    }
  });

  /* ------------------------------
      2️⃣B Provider BUSY (during call)
  ------------------------------*/
  socket.on('provider-busy', async ({ providerId }) => {
    try {
      if (!providerId) return;

      console.log(`🚨 Provider Busy → ${providerId}`);

      busyProviders.set(providerId, true);

      await Provider.findByIdAndUpdate(providerId, {
        'presence.isOnline': true,
        'presence.availabilityStatus': 'busy',
        'presence.lastSeen': new Date()
      });

      io.emit('presenceChanged', {
        providerId,
        isOnline: true,
        status: 'busy'
      });
    } catch (err) {
      console.error('❌ Error in provider-busy:', err);
    }
  });

  /* ------------------------------
      2️⃣C Provider AVAILABLE (after call ends)
  ------------------------------*/
  socket.on('provider-available', async ({ providerId }) => {
    try {
      if (!providerId) return;

      console.log(`🟢 Provider Available → ${providerId}`);

      busyProviders.delete(providerId);

      await Provider.findByIdAndUpdate(providerId, {
        'presence.isOnline': true,
        'presence.availabilityStatus': 'available',
        'presence.lastSeen': new Date()
      });

      io.emit('presenceChanged', {
        providerId,
        isOnline: true,
        status: 'available'
      });
    } catch (err) {
      console.error('❌ Error in provider-available:', err);
    }
  });

  /* ------------------------------
      2️⃣D Call Ended → Normalize to available
      (Only used if frontend emits "call-ended")
  ------------------------------*/
  socket.on('call-ended', async ({ providerId }) => {
    try {
      if (!providerId) return;

      console.log(`📞 Call ended → marking provider available: ${providerId}`);

      busyProviders.delete(providerId);

      await Provider.findByIdAndUpdate(providerId, {
        'presence.isOnline': true,
        'presence.availabilityStatus': 'available',
        'presence.lastSeen': new Date()
      });

      io.emit('presenceChanged', {
        providerId,
        isOnline: true,
        status: 'available'
      });
    } catch (err) {
      console.error('❌ Error in call-ended handler:', err);
    }
  });

  /* ------------------------------
      3️⃣ Send Incoming Call to Provider
  ------------------------------*/
  socket.on('notifyCall', (data) => {
    const { providerId } = data;
    const providerSocketId = connectedProviders.get(providerId);

    if (providerSocketId) {
      io.to(providerSocketId).emit('incomingCall', data);
      console.log(`📞 Incoming call forwarded → Provider: ${providerId}`);
    } else {
      console.log(`⚠️ Provider offline → Cannot deliver call to ${providerId}`);
    }
  });

  /* ------------------------------
      4️⃣ Call Type Switch
  ------------------------------*/
  socket.on('switch-call-type', (data) => {
    console.log('🔄 Call type switch requested:', data);

    const { channelName, newCallType } = data;

    io.to(channelName).emit('call-type-switch', {
      channelName,
      newCallType,
      callId: channelName
    });

    console.log(`✅ Notified all users in ${channelName} about switch to ${newCallType}`);
  });

  /* ------------------------------
      5️⃣ Provider Disconnects
  ------------------------------*/
  socket.on('disconnect', async () => {
    try {
      for (const [providerId, socketId] of connectedProviders.entries()) {
        if (socketId === socket.id) {
          connectedProviders.delete(providerId);
          busyProviders.delete(providerId);

          console.log(`🔴 Provider Disconnected → ${providerId}`);

          // Update DB as offline
          await Provider.findByIdAndUpdate(providerId, {
            'presence.isOnline': false,
            'presence.availabilityStatus': 'offline',
            'presence.lastSeen': new Date()
          });

          io.emit('presenceChanged', {
            providerId,
            isOnline: false,
            status: 'offline'
          });

          break;
        }
      }
    } catch (err) {
      console.error('❌ Error in disconnect handler:', err);
    }
  });
});

// Attach socket resources
app.set('io', io);
app.set('connectedProviders', connectedProviders);
app.set('busyProviders', busyProviders);

/* ------------------------------------------------------
    BASE SERVER CONFIG
-------------------------------------------------------*/
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || "https://www.getcompanion.in",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.options("*", cors());

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(helmet({ contentSecurityPolicy: false }));

app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

/* ------------------------------------------------------
    MONGODB CONNECTION
-------------------------------------------------------*/
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;

  const conn = await mongoose.connect(process.env.MONGO_URI);
  cachedDb = conn;
  console.log("🍃 MongoDB Connected");
  return conn;
}

app.use(async (req, res, next) => {
  await connectToDatabase();
  next();
});

/* ------------------------------------------------------
    ROOT CHECK ROUTE
-------------------------------------------------------*/
app.get('/', (req, res) => {
  res.send('🚀 Server is working fine!');
});

/* ------------------------------------------------------
    API ROUTES
-------------------------------------------------------*/
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: "OK",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    connectedProviders: connectedProviders.size,
    busyProviders: busyProviders.size
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/agora', agoraRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/wallet', authenticateToken, walletRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/feedback', feedbackRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

/* ------------------------------------------------------
    START SERVER
-------------------------------------------------------*/
const PORT = process.env.PORT || 5000;

connectToDatabase().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});

