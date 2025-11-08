/*
  Proyecto: FinSmart
  Autor: Alan Reyes Leandro
  Correo: alanreyesleandro5@gmail.com
  Derechos: © 2025 Alan Reyes Leandro – Todos los derechos reservados.
  Descripción: Servidor principal Express con Socket.IO, autenticación y rutas API
*/

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const logger = require('../../infrastructure/logging/logger');
const { env } = require('../../infrastructure/config/env');

// Global error handler
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

const authRoutes = require('./routes/authRoutes');
const graphRoutes = require('./routes/graphRoutes');
const aiRoutes = require('./routes/aiRoutes');
const financeRoutes = require('./routes/financeRoutes');

// Import middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const httpLogger = require('./middleware/logger');

// Import services
const EmailSyncService = require('../msgraph/emailSyncService');
const transactionRepo = require('../db/mongoose/TransactionRepo');
const createEmailSyncUseCases = require('../../app/use-cases/syncEmailBatch');
const tokenCleanup = require('../../infrastructure/security/tokenCleanup');

// Import helmet config
const { productionHelmetConfig, developmentHelmetConfig } = require('./middleware/security');

const app = express();
const server = http.createServer(app);
app.set('config', env);
app.set('repositories', { transactionRepo });

const PORT = env.port;
logger.info('Server configuration', { port: PORT, envPort: env.port, nodeEnv: env.nodeEnv });

// Connect to MongoDB
mongoose.connect(env.mongoUri)
.then(async () => {
  logger.info('Connected to MongoDB successfully');

  // Only run token cleanup if MongoDB is connected
  if (mongoose.connection.readyState === 1) {
    logger.info('Performing token cleanup...');
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
const isProduction = env.nodeEnv === 'production';
app.use(helmet(isProduction ? productionHelmetConfig : developmentHelmetConfig));

// CORS configuration - externalized to environment variable
const getCorsOrigins = () => {
  // Read from CORS_ALLOWED_ORIGINS environment variable (comma-separated)
  const envOrigins = env.corsAllowedOrigins;

  // Default origins for development
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://finsmart-production.up.railway.app',
    'https://finsmart.up.railway.app',
    env.frontendUrl
  ].filter(Boolean);

  // Merge and deduplicate
  const allOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

  logger.info('CORS allowed origins', { origins: allOrigins });
  return allOrigins;
};

const allowedOrigins = getCorsOrigins();

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin', { origin, allowedOrigins });
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
app.use(httpLogger);

const io = socketIo(server, {
  // Mount Socket.IO under /api to avoid proxy or static route conflicts
  path: '/api/socket.io',
  cors: corsOptions,
  // Conservative timeouts to better tolerate free-tier platforms
  pingInterval: 25000,
  pingTimeout: 20000
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/graph', authMiddleware, graphRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/finance', authMiddleware, financeRoutes);

// Health check endpoint with metrics (before static files)
app.get('/health', async (req, res) => {
  const connectedSockets = io.engine.clientsCount || 0;
  const uptime = process.uptime();

  // MongoDB latency check
  let mongoLatency = null;
  try {
    const startTime = Date.now();
    await mongoose.connection.db.admin().ping();
    mongoLatency = Date.now() - startTime;
  } catch (error) {
    logger.error('Health check: MongoDB ping failed', { error: error.message });
  }

  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    port: PORT,
    env: env.nodeEnv,
    mongodb: {
      configured: env.mongoUri ? 'yes' : 'no',
      latency_ms: mongoLatency
    },
    openai: env.openAiKeyConfigured ? 'configured' : 'missing',
    azure_ocr: env.azureOcrConfigured ? 'configured' : 'missing',
    socketio: {
      connected_clients: connectedSockets,
    }
  };

  logger.debug('Health check request', { metrics: healthData });
  res.status(200).json(healthData);
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
  // Only allow in development environment
  if (env.nodeEnv === 'production') {
    return res.status(403).json({ error: 'Debug endpoint disabled in production' });
  }

  res.json({
    frontend_vars: {
      VITE_GRAPH_CLIENT_ID: env.frontendGraphClientId ? 'configured' : 'missing',
      VITE_GRAPH_TENANT_ID: env.frontendGraphTenantId ? 'configured' : 'missing',
      VITE_API_URL: env.frontendApiUrl ? 'configured' : 'missing'
    },
    backend_vars: {
      NODE_ENV: env.nodeEnv,
      PORT: env.port,
      MONGODB_URI: env.mongoUri ? 'configured' : 'missing',
      JWT_SECRET: env.jwtSecret ? 'configured' : 'missing',
      OPENAI_API_KEY: env.openAiKeyConfigured ? 'configured' : 'missing'
    }
  });
});

// Serve static files from React build (always, if present)
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
  const indexPath = path.join(__dirname, '../public', 'index.html')
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return next();
});

// Socket.io connection handling with structured logging
const ALLOW_DEMO_MODE = env.allowDemoMode;

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const userId = socket.handshake.auth?.userId;

    logger.debug('Socket.IO handshake', {
      token: token ? 'present' : 'missing',
      userId,
      socketId: socket.id
    });
    console.log('🔌 Socket.IO handshake - UserId:', userId || 'missing');

    if (!token) {
      console.log('❌ Socket.IO handshake - No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    // Basic token sanity check: app JWTs must contain two dots
    if (typeof token !== 'string' || token.split('.').length !== 3) {
      logger.warn('Socket.IO handshake failed - Malformed token', { socketId: socket.id });
      return next(new Error('Authentication error: Malformed token'));
    }

    // Validar token usando el mismo middleware de autenticación
    const jwt = require('jsonwebtoken');
    const User = require('./models/userModel');

    // Check if it's a demo token (only when explicitly allowed)
    if (token.startsWith('demo-token-')) {
      if (!ALLOW_DEMO_MODE) {
        logger.warn('Socket.IO - Demo token rejected (demo mode disabled)', { socketId: socket.id });
        return next(new Error('Authentication error: Demo mode disabled'));
      }
      logger.info('Socket.IO - Demo token connection', { socketId: socket.id });
      socket.user = {
        _id: 'demo-user-id',
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@example.com'
      };
      return next();
    }

    // Validate as app JWT only (Microsoft tokens are not accepted at socket layer)
    try {
      const decoded = jwt.verify(token, env.jwtSecret);
      logger.info('Socket.IO - JWT token verified', {
        userId: decoded.userId,
        socketId: socket.id
      });

      // Find user in database
      const user = await User.findById(decoded.userId);
      if (!user) {
        logger.warn('Socket.IO - User not found for JWT token', {
          userId: decoded.userId,
          socketId: socket.id
        });
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      return next();
    } catch (jwtError) {
      logger.error('Socket.IO - JWT validation failed', {
        error: jwtError.message,
        socketId: socket.id
      });
      return next(new Error('Authentication error: Invalid token'));
    }

  } catch (error) {
    logger.error('Socket.IO handshake error', {
      error: error.message,
      stack: error.stack,
      socketId: socket.id
    });
    return next(new Error('Authentication error: ' + error.message));
  }
});

io.on('connection', (socket) => {
  logger.info('Socket connected', {
    socketId: socket.id,
    transport: socket.conn.transport.name,
    userId: socket.user?._id?.toString?.()
  });

  // Log cuando cambia el transporte
  socket.conn.on('upgrade', () => {
    logger.debug('Socket transport upgraded', {
      socketId: socket.id,
      transport: socket.conn.transport.name
    });
  });

  socket.on('join-user-room', (userId) => {
    // Ensure the userId matches the authenticated socket user to prevent cross-room contamination
    const authedId = socket.user?._id?.toString?.() || socket.user?._id;
    if (!authedId || userId?.toString?.() !== authedId) {
      logger.warn('join-user-room rejected - userId mismatch', {
        socketId: socket.id,
        providedUserId: userId,
        authedUserId: authedId
      });
      return;
    }
    socket.join(`user-${authedId}`);
    logger.info('User joined room', {
      userId: authedId,
      room: `user-${authedId}`,
      socketId: socket.id
    });
  });

  // Heartbeat para mantener conexiones activas en Railway
  socket.on('ping', () => {
    socket.emit('pong');
    logger.debug('Heartbeat received', { socketId: socket.id });
  });

  socket.on('disconnect', (reason) => {
    logger.info('Socket disconnected', {
      socketId: socket.id,
      reason,
      userId: socket.user?._id?.toString?.()
    });
  });

  socket.on('error', (error) => {
    logger.error('Socket error', {
      socketId: socket.id,
      error: error.message,
      stack: error.stack
    });
  });
});

// Make io available to routes
app.set('io', io);

// Initialize Email Sync Service with feature flag
const emailSyncService = new EmailSyncService(io);
const emailSyncUseCases = createEmailSyncUseCases({ emailIngestion: emailSyncService });

// Start periodic email sync (controlled by ENABLE_EMAIL_SYNC env var)
// Default: enabled (production), can be disabled for debugging
if (env.enableEmailSync) {
  emailSyncService.startPeriodicSync(15);
  logger.info('Periodic email sync started', { interval: '15 minutes' });
} else {
  logger.info('Periodic email sync disabled by ENABLE_EMAIL_SYNC flag');
}

// Make emailSyncService available to routes
app.set('emailSyncService', emailSyncService);
app.set('emailSyncUseCases', emailSyncUseCases);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  logger.info('Server started', {
    port: PORT,
    env: env.nodeEnv,
    mongodb: env.mongoUri ? 'configured' : 'not configured',
    openai: env.openAiKeyConfigured ? 'configured' : 'not configured',
    azure_ocr: env.azureOcrConfigured ? 'configured' : 'not configured'
  });
});

module.exports = app;

// Graceful shutdown handlers to diagnose container stops
const shutdown = async (signal) => {
  try {
    logger.info('Shutdown signal received', { signal });
    server.close(() => {
      logger.info('HTTP server closed');
    });
    try {
      await mongoose.connection.close(false);
      logger.info('MongoDB connection closed');
    } catch (e) {
      logger.warn('MongoDB close error', { error: e.message });
    }
  } catch (e) {
    logger.error('Error during shutdown', { error: e.message, stack: e.stack });
  } finally {
    process.exit(0);
  }
}

['SIGTERM', 'SIGINT'].forEach(sig => {
  process.on(sig, () => shutdown(sig));
});
