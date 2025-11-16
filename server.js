// // server.js - Vercel Serverless Compatible Entry Point
// import express from 'express';
// import cors from 'cors';
// import helmet from 'helmet';
// import compression from 'compression';
// import morgan from 'morgan';
// import mongoose from 'mongoose';
// import dotenv from 'dotenv';
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
// dotenv.config();
// const app = express();

// // ------------------ Trust Proxy (Required for Vercel) ------------------
// app.set('trust proxy', 1); // Trust first proxy

// // ------------------ MongoDB Connection with Caching ------------------
// let cachedDb = null;

// async function connectToDatabase() {
//   if (cachedDb && mongoose.connection.readyState === 1) {
//     return cachedDb;
//   }

//   try {
//     const conn = await mongoose.connect(process.env.MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//       serverSelectionTimeoutMS: 5000,
//       socketTimeoutMS: 45000,
//     });
    
//     cachedDb = conn;
//     console.log('MongoDB connected successfully');
//     return conn;
//   } catch (err) {
//     console.error('MongoDB connection error:', err);
//     throw err;
//   }
// }

// // ------------------ Security Middleware ------------------
// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         styleSrc: ["'self'", "'unsafe-inline'"],
//         scriptSrc: ["'self'"],
//         imgSrc: ["'self'", "data:", "https:"],
//       },
//     },
//     crossOriginEmbedderPolicy: false,
//   })
// );

// // ------------------ CORS ------------------
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || 'https://videocall-theta-pearl.vercel.app',
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
//   })
// );

// // ------------------ General Middleware ------------------
// app.use(compression());
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // ------------------ Logging ------------------
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// } else {
//   app.use(morgan('combined'));
// }

// // ------------------ Rate Limiting ------------------
// app.use('/api/', rateLimiter.general);

// // ------------------ Middleware to Connect to DB on Each Request ------------------
// app.use(async (req, res, next) => {
//   try {
//     await connectToDatabase();
//     next();
//   } catch (error) {
//     console.error('Database connection failed:', error);
//     res.status(503).json({
//       success: false,
//       message: 'Database connection failed',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// // ------------------ Health Check ------------------
// app.get('/api/health', (req, res) => {
//   res.json({
//     success: true,
//     message: 'ServiceConnect API is running',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     memory: process.memoryUsage(),
//     version: process.env.npm_package_version || '1.0.0',
//     database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
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

// // ------------------ Graceful Shutdown (for local development) ------------------
// process.on('SIGTERM', () => {
//   console.log('SIGTERM received, shutting down gracefully');
//   mongoose.connection.close(() => {
//     console.log('MongoDB connection closed');
//     process.exit(0);
//   });
// });

// // ------------------ Local Development Server ------------------
// if (process.env.NODE_ENV !== 'production') {
//   const PORT = process.env.PORT || 5000;
  
//   connectToDatabase().then(() => {
//     app.listen(PORT, () => {
//       console.log(`ServiceConnect Server running on port ${PORT}`);
//       console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
//       console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
//     });
//   });
// }

// // ------------------ Export for Vercel Serverless ------------------
// export default app;












// // server.js - Vercel Serverless Compatible Entry Point with Socket.IO
// import express from 'express';
// import { createServer } from 'http';
// import { Server } from 'socket.io';
// import cors from 'cors';
// import helmet from 'helmet';
// import compression from 'compression';
// import morgan from 'morgan';
// import mongoose from 'mongoose';
// import dotenv from 'dotenv';
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

// dotenv.config();

// const app = express();
// const httpServer = createServer(app);

// // ------------------ Socket.IO Setup ------------------
// const io = new Server(httpServer, {
//   cors: {
//     origin: process.env.FRONTEND_URL || 'https://videocall-theta-pearl.vercel.app',
//     credentials: true,
//     methods: ['GET', 'POST']
//   },
//   transports: ['websocket', 'polling']
// });

// // Store connected providers
// const connectedProviders = new Map();

// io.on('connection', (socket) => {
//   console.log('🔌 Client connected:', socket.id);

//   // Provider registers their ID
//   socket.on('register-provider', (providerId) => {
//     connectedProviders.set(providerId, socket.id);
//     console.log(`✅ Provider ${providerId} registered with socket ${socket.id}`);
//     console.log(`📊 Total connected providers: ${connectedProviders.size}`);
//   });

//   // Handle disconnection
//   socket.on('disconnect', () => {
//     // Remove provider from connected list
//     for (const [providerId, socketId] of connectedProviders.entries()) {
//       if (socketId === socket.id) {
//         connectedProviders.delete(providerId);
//         console.log(`❌ Provider ${providerId} disconnected`);
//         break;
//       }
//     }
//     console.log(`📊 Total connected providers: ${connectedProviders.size}`);
//   });
// });

// // Make io accessible in routes
// app.set('io', io);
// app.set('connectedProviders', connectedProviders);

// // ------------------ Trust Proxy (Required for Vercel) ------------------
// app.set('trust proxy', 1);

// // ------------------ MongoDB Connection with Caching ------------------
// let cachedDb = null;

// async function connectToDatabase() {
//   if (cachedDb && mongoose.connection.readyState === 1) {
//     return cachedDb;
//   }

//   try {
//     const conn = await mongoose.connect(process.env.MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//       serverSelectionTimeoutMS: 5000,
//       socketTimeoutMS: 45000,
//     });
    
//     cachedDb = conn;
//     console.log('MongoDB connected successfully');
//     return conn;
//   } catch (err) {
//     console.error('MongoDB connection error:', err);
//     throw err;
//   }
// }

// // ------------------ Security Middleware ------------------
// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         styleSrc: ["'self'", "'unsafe-inline'"],
//         scriptSrc: ["'self'"],
//         imgSrc: ["'self'", "data:", "https:"],
//       },
//     },
//     crossOriginEmbedderPolicy: false,
//   })
// );

// // ------------------ CORS ------------------
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || 'https://videocall-theta-pearl.vercel.app',
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
//   })
// );

// // ------------------ General Middleware ------------------
// app.use(compression());
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // ------------------ Logging ------------------
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// } else {
//   app.use(morgan('combined'));
// }

// // ------------------ Rate Limiting ------------------
// app.use('/api/', rateLimiter.general);

// // ------------------ Middleware to Connect to DB on Each Request ------------------
// app.use(async (req, res, next) => {
//   try {
//     await connectToDatabase();
//     next();
//   } catch (error) {
//     console.error('Database connection failed:', error);
//     res.status(503).json({
//       success: false,
//       message: 'Database connection failed',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// // ------------------ Health Check ------------------
// app.get('/api/health', (req, res) => {
//   res.json({
//     success: true,
//     message: 'ServiceConnect API is running',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     memory: process.memoryUsage(),
//     version: process.env.npm_package_version || '1.0.0',
//     database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
//     connectedProviders: connectedProviders.size
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

// // ------------------ Graceful Shutdown (for local development) ------------------
// // ------------------ Graceful Shutdown (for local development) ------------------
// process.on('SIGTERM', async () => {
//   console.log('SIGTERM received, shutting down gracefully');

//   try {
//     await mongoose.connection.close();
//     console.log('MongoDB connection closed');

//     httpServer.close(() => {
//       console.log('HTTP server closed');
//       process.exit(0);
//     });
//   } catch (err) {
//     console.error('Error closing MongoDB connection:', err);
//     process.exit(1);
//   }
// });

// process.on('SIGINT', async () => {
//   console.log('SIGINT received, shutting down gracefully');
//   try {
//     await mongoose.connection.close();
//     console.log('MongoDB connection closed');
//     process.exit(0);
//   } catch (err) {
//     console.error('Error during shutdown:', err);
//     process.exit(1);
//   }
// });


// // ------------------ Local Development Server ------------------
// // ------------------ Start Server (for Render + Local) ------------------
// const PORT = process.env.PORT || 5000;

// connectToDatabase().then(() => {
//   httpServer.listen(PORT, () => {
//     console.log(`🚀 ServiceConnect Server running on port ${PORT}`);
//     console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
//     console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
//     console.log(`Socket.IO enabled on port ${PORT}`);
//   });
// }).catch((err) => {
//   console.error("❌ Failed to connect to MongoDB:", err);
//   process.exit(1);
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
import walletRoutes from './routes/wallet.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import testimonialRoutes from './routes/testimonialRoutes.js';
import slotRoutes from './routes/slot.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import providerRoutes from './routes/providerRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import verificationRoutes from './routes/verification.routes.js';

// Middlewares
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import { rateLimiter } from './middleware/rateLimitMiddleware.js';
import { authenticateToken } from './middleware/authMiddleware.js';

import Provider from './models/Provider.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

/* ------------------------------------------------------
    SOCKET.IO SETUP (Merged Features)
-------------------------------------------------------*/
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://videocall-theta-pearl.vercel.app',
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Track connected providers
const connectedProviders = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  /* ------------------------------
      1️⃣ Provider Registers
  ------------------------------*/
  socket.on('register-provider', (providerId) => {
    if (!providerId) return;

    connectedProviders.set(providerId, socket.id);
    console.log(`🟢 Provider Registered → ${providerId} | Socket = ${socket.id}`);

    io.emit("providerOnline", { providerId });
  });

  /* ------------------------------
      2️⃣ Presence Update (Online/Offline)
  ------------------------------*/
  socket.on('updatePresence', async ({ providerId, isOnline }) => {
    if (!providerId) return;

    const status = isOnline ? "online" : "offline";

    await Provider.findByIdAndUpdate(providerId, {
      "presence.isOnline": isOnline,
      "presence.availabilityStatus": status,
      "presence.lastSeen": new Date()
    });

    console.log(`📌 Presence Updated → ${providerId}: ${status}`);

    io.emit("presenceChanged", {
      providerId,
      isOnline,
      status
    });
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
      console.log(`⚠️ Provider offline, cannot deliver call → ${providerId}`);
    }
  });

  /* ------------------------------
      4️⃣ When Provider Disconnects
  ------------------------------*/
  socket.on("disconnect", () => {
    for (const [providerId, socketId] of connectedProviders.entries()) {
      if (socketId === socket.id) {
        connectedProviders.delete(providerId);
        console.log(`🔴 Provider Disconnected → ${providerId}`);

        io.emit("presenceChanged", {
          providerId,
          isOnline: false,
          status: "offline"
        });
        break;
      }
    }
  });
});

// Expose io for routes to use
app.set('io', io);
app.set('connectedProviders', connectedProviders);

/* ------------------------------------------------------
    BASE SERVER CONFIG
-------------------------------------------------------*/
app.set('trust proxy', 1);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://videocall-theta-pearl.vercel.app',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(helmet({
  contentSecurityPolicy: false,
}));
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

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
    ROUTES
-------------------------------------------------------*/
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: "OK",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    connectedProviders: connectedProviders.size
  });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/agora', agoraRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/feedback', feedbackRoutes);

// Auth-protected
app.use('/api/wallet', authenticateToken, walletRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);

app.use('/api/bookings', bookingRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/slots', slotRoutes);

// Webhooks
app.use('/api/webhooks', webhookRoutes);

/* ------------------------------------------------------
    ERROR HANDLERS
-------------------------------------------------------*/
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

