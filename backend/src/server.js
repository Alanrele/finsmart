const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const graphRoutes = require('./routes/graphRoutes');
const aiRoutes = require('./routes/aiRoutes');
const financeRoutes = require('./routes/financeRoutes');

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

// Import helmet config
const { productionHelmetConfig, developmentHelmetConfig } = require('./config/helmet');

const app = express();
const server = http.createServer(app);

// Configuración específica de Socket.io para Railway
const isRailwayProduction = process.env.RAILWAY_ENVIRONMENT === 'production' || 
                           process.env.NODE_ENV === 'production'

const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001", 
      "https://finsmart-production.up.railway.app",
      process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST"]
  },
  // Configuración optimizada para Railway
  transports: isRailwayProduction ? ['polling', 'websocket'] : ['websocket', 'polling'],
  allowEIO3: true, // Compatibilidad con versiones anteriores
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6, // 1MB
  // Configuración específica para Railway
  allowUpgrades: !isRailwayProduction, // Deshabilitar upgrades en Railway
  cookie: false // Deshabilitar cookies para Railway
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finsmart')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

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
      callback(null, true); // Allow for now, restrict later if needed
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
      transports: isRailwayProduction ? ['polling', 'websocket'] : ['websocket', 'polling'],
      railway_mode: isRailwayProduction
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    socketio_clients: io.engine.clientsCount || 0
  });
});

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
  app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '1y', // Cache static assets for 1 year
    setHeaders: (res, path, stat) => {
      // Set proper MIME types for common file extensions
      if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (path.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      } else if (path.endsWith('.woff') || path.endsWith('.woff2')) {
        res.setHeader('Content-Type', 'font/woff2');
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

  socket.on('disconnect', (reason) => {
    console.log(`❌ Socket disconnected: ${socket.id}, reason: ${reason}`);
  });

  socket.on('error', (error) => {
    console.error(`🚨 Socket error for ${socket.id}:`, error);
  });
});

// Make io available to routes
app.set('io', io);

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
