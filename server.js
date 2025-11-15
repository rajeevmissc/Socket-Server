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












// server.js - Vercel Serverless Compatible Entry Point with Socket.IO
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
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
import { rateLimiter } from './middleware/rateLimitMiddleware.js';
import { authenticateToken } from './middleware/authMiddleware.js';
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

// ------------------ Socket.IO Setup with Enhanced Tracking ------------------
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://videocall-theta-pearl.vercel.app',
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Connection tracking maps
const connectedProviders = new Map(); // providerId -> socketId
const connectedUsers = new Map();     // userId -> socketId
const channelToSockets = new Map();   // channelName -> Set of socketIds

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Provider registers their socket
  socket.on('register-provider', async (providerId) => {
    if (!providerId) {
      console.error('❌ Invalid providerId');
      return;
    }

    connectedProviders.set(providerId, socket.id);
    console.log(`✅ Provider registered: ${providerId} -> ${socket.id}`);
    console.log(`📊 Total connected providers: ${connectedProviders.size}`);

    // Update provider presence in database
    try {
      await Provider.findByIdAndUpdate(providerId, {
        'presence.isOnline': true,
        'presence.availabilityStatus': 'online',
        'presence.lastSeen': new Date()
      });
    } catch (err) {
      console.error('Error updating provider presence:', err);
    }
  });

  // User registers their socket
  socket.on('register-user', (userId) => {
    if (!userId) {
      console.error('❌ Invalid userId');
      return;
    }

    connectedUsers.set(userId, socket.id);
    console.log(`✅ User registered: ${userId} -> ${socket.id}`);
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
  socket.on('disconnect', async () => {
    console.log('❌ Client disconnected:', socket.id);

    // Remove from providers map
    for (const [providerId, socketId] of connectedProviders.entries()) {
      if (socketId === socket.id) {
        connectedProviders.delete(providerId);
        console.log(`🔴 Provider ${providerId} disconnected`);
        
        // Update provider offline status
        try {
          await Provider.findByIdAndUpdate(providerId, {
            'presence.isOnline': false,
            'presence.availabilityStatus': 'offline',
            'presence.lastSeen': new Date()
          });
        } catch (err) {
          console.error('Error updating provider presence:', err);
        }
        
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

    console.log(`📊 Connected - Providers: ${connectedProviders.size}, Users: ${connectedUsers.size}, Channels: ${channelToSockets.size}`);
  });

  // Debug: Test connection
  socket.on('test-connection', (data) => {
    console.log('🧪 Test connection received:', data);
    socket.emit('test-response', { success: true, timestamp: Date.now() });
  });
});

// Make io and connection maps accessible in routes
app.set('io', io);
app.set('connectedProviders', connectedProviders);
app.set('connectedUsers', connectedUsers);
app.set('channelToSockets', channelToSockets);

// ------------------ Trust Proxy (Required for Vercel) ------------------
app.set('trust proxy', 1);

// ------------------ MongoDB Connection with Caching ------------------
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    cachedDb = conn;
    console.log('✅ MongoDB connected successfully');
    return conn;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}

// ------------------ Security Middleware ------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ------------------ CORS ------------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'https://videocall-theta-pearl.vercel.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ------------------ General Middleware ------------------
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ------------------ Logging ------------------
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ------------------ Rate Limiting ------------------
app.use('/api/', rateLimiter.general);

// ------------------ Middleware to Connect to DB on Each Request ------------------
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ------------------ Health Check ------------------
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ServiceConnect API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    socketio: {
      connectedProviders: connectedProviders.size,
      connectedUsers: connectedUsers.size,
      activeChannels: channelToSockets.size
    }
  });
});

// ------------------ Debug Endpoint (Development Only) ------------------
if (process.env.NODE_ENV === 'development') {
  app.get('/api/debug/connections', (req, res) => {
    res.json({
      providers: Array.from(connectedProviders.entries()).map(([id, socketId]) => ({ id, socketId })),
      users: Array.from(connectedUsers.entries()).map(([id, socketId]) => ({ id, socketId })),
      channels: Array.from(channelToSockets.entries()).map(([name, sockets]) => ({
        name,
        participantCount: sockets.size,
        socketIds: Array.from(sockets)
      })),
      summary: {
        totalProviders: connectedProviders.size,
        totalUsers: connectedUsers.size,
        totalChannels: channelToSockets.size
      }
    });
  });
}

// ------------------ API Routes ------------------
// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/agora', agoraRoutes);
app.use('/api/notifications', notificationRoutes);
// Wallet module routes with authentication
app.use('/api/bookings', bookingRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/wallet', authenticateToken, walletRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/providers', providerRoutes);
// Webhooks (no auth required)
app.use('/api/webhooks', webhookRoutes);
app.use('/api/feedback', feedbackRoutes);

// ------------------ Error Handling ------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ------------------ Graceful Shutdown (for local development) ------------------
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');

  try {
    // Close Socket.IO connections
    io.close(() => {
      console.log('✅ Socket.IO server closed');
    });

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');

    // Close HTTP server
    httpServer.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('❌ Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  try {
    io.close();
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ------------------ Start Server (for Render + Local) ------------------
const PORT = process.env.PORT || 5000;

connectToDatabase().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 ServiceConnect Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`🔌 Socket.IO enabled on port ${PORT}`);
    console.log(`📊 Connection tracking initialized`);
    console.log(`✅ Server ready to accept connections`);
  });
}).catch((err) => {
  console.error("❌ Failed to connect to MongoDB:", err);
  process.exit(1);
});

export default app;


