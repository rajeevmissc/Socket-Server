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






// server.js - Updated with Chat Socket.IO Integration
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
import walletRoutes from './routes/wallet.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import testimonialRoutes from './routes/testimonialRoutes.js';
import chatRoutes from './routes/chatRoutes.js'; // NEW: Chat routes
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import { rateLimiter } from './middleware/rateLimitMiddleware.js';
import { authenticateToken } from './middleware/authMiddleware.js';
import slotRoutes from './routes/slot.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import providerRoutes from './routes/providerRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import notificationRoutes from './routes/notifications.js';
import verificationRoutes from './routes/verification.routes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// ------------------ Socket.IO Setup with Enhanced Chat Support ------------------
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://videocall-theta-pearl.vercel.app',
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Store connected users and chat rooms
const connectedProviders = new Map(); // providerId -> socketId
const connectedUsers = new Map(); // userId -> socketId
const chatRooms = new Map(); // channelName -> Set of socketIds

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Register provider
  socket.on('register-provider', (providerId) => {
    connectedProviders.set(providerId, socket.id);
    socket.providerId = providerId;
    console.log(`✅ Provider ${providerId} registered with socket ${socket.id}`);
    console.log(`📊 Total connected providers: ${connectedProviders.size}`);
  });

  // Register user
  socket.on('register-user', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    console.log(`✅ User ${userId} registered with socket ${socket.id}`);
    console.log(`📊 Total connected users: ${connectedUsers.size}`);
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
    
    console.log(`📊 Remaining providers: ${connectedProviders.size}, users: ${connectedUsers.size}`);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Make io and connected maps accessible in routes
app.set('io', io);
app.set('connectedProviders', connectedProviders);
app.set('connectedUsers', connectedUsers);
app.set('chatRooms', chatRooms);

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
      activeChatRooms: chatRooms.size
    }
  });
});

// ------------------ API Routes ------------------
// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/agora', agoraRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes); // NEW: Chat routes

// Protected routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/wallet', authenticateToken, walletRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/feedback', feedbackRoutes);

// Webhooks (no auth required)
app.use('/api/webhooks', webhookRoutes);

// ------------------ Error Handling ------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ------------------ Graceful Shutdown ------------------
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');

  try {
    // Close Socket.IO connections
    io.close(() => {
      console.log('Socket.IO connections closed');
    });

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');

    // Close HTTP server
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// ------------------ Start Server ------------------
const PORT = process.env.PORT || 5000;

connectToDatabase().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🚀 ServiceConnect Server Running    ║
║   Port: ${PORT.toString().padEnd(29)} ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(21)} ║
║   Socket.IO: Enabled                   ║
║   Chat Features: Active                ║
╚════════════════════════════════════════╝
    `);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  });
}).catch((err) => {
  console.error("❌ Failed to connect to MongoDB:", err);
  process.exit(1);
});

export default app;






