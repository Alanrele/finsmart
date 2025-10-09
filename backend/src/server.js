const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
// Global error handler
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack trace:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
const authRoutes = require('./routes/authRoutes');
const graphRoutes = require('./routes/graphRoutes');
const aiRoutes = require('./routes/aiRoutes');
const financeRoutes = require('./routes/financeRoutes');

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

// Import services
const EmailSyncService = require('./services/emailSyncService');
const tokenCleanup = require('./utils/tokenCleanup');

// Import helmet config
const { productionHelmetConfig, developmentHelmetConfig } = require('./config/helmet');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finsmart')
.then(async () => {
  console.log('Connected to MongoDB');

  // Only run token cleanup if MongoDB is connected
  if (mongoose.connection.readyState === 1) {
    console.log('🧹 Performing token cleanup...');
    const cleanedCount = await tokenCleanup.cleanupMalformedTokens();
    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} malformed token(s) on startup`);
    }
  } else {
    console.log('🧹 Skipping token cleanup - MongoDB not connected');
  }
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.log('⚠️ Continuing without MongoDB connection for debugging purposes');
  // Don't exit the process, just log the error
});

// Middleware
const isProduction = process.env.NODE_ENV === 'production';
app.use(helmet(isProduction ? productionHelmetConfig : developmentHelmetConfig));

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    // Allow Railway domain and localhost for development
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://finsmart-production.up.railway.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(logger);

const io = socketIo(server, {
  cors: corsOptions
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/graph', authMiddleware, graphRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/finance', authMiddleware, financeRoutes);

// Health check endpoint (before static files)
app.get('/health', (req, res) => {
  const connectedSockets = io.engine.clientsCount || 0;

  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV,
    mongodb: process.env.MONGODB_URI ? 'configured' : 'missing',
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    azure_ocr: process.env.AZURE_OCR_KEY ? 'configured' : 'missing',
    // Información de Socket.io para diagnóstico
    socketio: {
      connected_clients: connectedSockets,
    }
  });
});

// Eliminar el endpoint redundante /api/health
// app.get('/api/health', (req, res) => {
//   res.json({
//     status: 'OK',
//     timestamp: new Date().toISOString(),
//     socketio_clients: io.engine.clientsCount || 0
//   });
// });

// Debug endpoint (development only)
app.get('/api/debug/env', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    return res.status(403).json({ error: 'Debug endpoint disabled in production' });
  }

  res.json({
    frontend_vars: {
      VITE_GRAPH_CLIENT_ID: process.env.VITE_GRAPH_CLIENT_ID ? 'configured' : 'missing',
      VITE_GRAPH_TENANT_ID: process.env.VITE_GRAPH_TENANT_ID ? 'configured' : 'missing',
      VITE_API_URL: process.env.VITE_API_URL ? 'configured' : 'missing'
    },
    backend_vars: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      MONGODB_URI: process.env.MONGODB_URI ? 'configured' : 'missing',
      JWT_SECRET: process.env.JWT_SECRET ? 'configured' : 'missing',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'configured' : 'missing'
    }
  });
});

// Serve static files from React build (for production)
if (process.env.NODE_ENV === 'production') {
  // Serve static files with proper MIME types
  app.use('/assets', express.static(path.join(__dirname, '../public/assets'), {
    maxAge: '1y', // Cache static assets for 1 year
    setHeaders: (res, filePath, stat) => {
      // Set proper MIME types for common file extensions
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      } else if (filePath.endsWith('.woff') || filePath.endsWith('.woff2')) {
        res.setHeader('Content-Type', 'font/woff2');
      } else if (filePath.endsWith('.ttf')) {
        res.setHeader('Content-Type', 'font/ttf');
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
    }
  }));

  // Serve other static files
  app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '1d', // Cache for 1 day
    setHeaders: (res, filePath, stat) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
    }
  }));

  // Handle React routing - ONLY for non-API and non-asset routes
  app.get('*', (req, res, next) => {
    // Don't handle API routes or asset files
    if (req.path.startsWith('/api/') ||
        req.path.startsWith('/assets/') ||
        req.path.includes('.')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  });
}

// Socket.io connection handling con logging mejorado
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const userId = socket.handshake.auth?.userId;

    console.log('🔌 Socket.IO handshake - Token:', token ? 'present' : 'missing');
    console.log('🔌 Socket.IO handshake - UserId:', userId || 'missing');

    if (!token) {
      console.log('❌ Socket.IO handshake - No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    // Validar token usando el mismo middleware de autenticación
    const jwt = require('jsonwebtoken');
    const User = require('./models/userModel');

    // Check if it's a demo token
    if (token.startsWith('demo-token-')) {
      console.log('🎭 Socket.IO - Demo token detected, allowing connection');
      socket.user = {
        _id: 'demo-user-id',
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@example.com'
      };
      return next();
    }

    // Try to validate as Microsoft token first (since that's what we expect from real users)
    try {
      console.log('🔄 Socket.IO - Trying Microsoft token validation');

      const { Client } = require('@microsoft/microsoft-graph-client');

      class CustomAuthProvider {
        constructor(accessToken) {
          this.accessToken = accessToken;
        }
        async getAccessToken() {
          return this.accessToken;
        }
      }

      const authProvider = new CustomAuthProvider(token);
      const graphClient = Client.initWithMiddleware({ authProvider });

      // Get user profile from Microsoft Graph
      const profile = await graphClient.api('/me').get();
      console.log('✅ Socket.IO - Microsoft token verified for:', profile.mail || profile.userPrincipalName);

      // Find user in database
      let user = await User.findOne({
        $or: [
          { email: profile.mail },
          { email: profile.userPrincipalName }
        ]
      });

      if (!user) {
        console.log('❌ Socket.IO - User not found for Microsoft token');
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      return next();

    } catch (microsoftError) {
      console.log('🔄 Socket.IO - Microsoft token validation failed, trying JWT');

      // If Microsoft token fails, try JWT validation
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Socket.IO - JWT token verified for user:', decoded.userId);

        // Find user in database
        const user = await User.findById(decoded.userId);
        if (!user) {
          console.log('❌ Socket.IO - User not found for JWT token');
          return next(new Error('Authentication error: User not found'));
        }

        socket.user = user;
        return next();

      } catch (jwtError) {
        console.error('❌ Socket.IO - Both JWT and Microsoft token validation failed');
        console.error('Microsoft Error:', microsoftError.message);
        console.error('JWT Error:', jwtError.message);
        return next(new Error('Authentication error: Invalid token'));
      }
    }

  } catch (error) {
    console.error('❌ Socket.IO handshake error:', error);
    return next(new Error('Authentication error: ' + error.message));
  }
});

io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id} via ${socket.conn.transport.name}`);

  // Log cuando cambia el transporte
  socket.conn.on('upgrade', () => {
    console.log(`🔄 Socket ${socket.id} upgraded to ${socket.conn.transport.name}`);
  });

  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined room user-${userId} (socket: ${socket.id})`);
  });

  // Heartbeat para mantener conexiones activas en Railway
  socket.on('ping', () => {
    socket.emit('pong');
    console.log(`💓 Heartbeat from ${socket.id}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ Socket disconnected: ${socket.id}, reason: ${reason}`);
  });

  socket.on('error', (error) => {
    console.error(`🚨 Socket error for ${socket.id}:`, error);
  });
});

// Make io available to routes
app.set('io', io);

// Initialize Email Sync Service
const emailSyncService = new EmailSyncService(io);

// Start periodic email sync in production (every 15 minutes) - DISABLED FOR DEBUGGING
// if (process.env.NODE_ENV === 'production') {
//   emailSyncService.startPeriodicSync(15);
//   console.log('📧 Periodic email sync started (15 minutes interval)');
// } else {
//   console.log('📧 Periodic email sync disabled in development mode');
// }

// Make emailSyncService available to routes
app.set('emailSyncService', emailSyncService);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`MongoDB: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
  console.log(`OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`Azure OCR: ${process.env.AZURE_OCR_KEY ? 'Configured' : 'Not configured'}`);
});

module.exports = app;
