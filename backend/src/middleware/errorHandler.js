const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      error: 'Validation Error',
      details: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  // Microsoft Graph API errors
  if (err.code && err.code.startsWith('InvalidAuthenticationToken')) {
    return res.status(401).json({
      error: 'Microsoft authentication failed',
      details: 'Please reconnect your Microsoft account'
    });
  }

  // Azure OCR errors
  if (err.code === 'InvalidImageUrl' || err.code === 'InvalidImageFormat') {
    return res.status(400).json({
      error: 'Invalid image provided for OCR processing'
    });
  }

  // OpenAI API errors
  if (err.type === 'insufficient_quota') {
    return res.status(503).json({
      error: 'AI service temporarily unavailable',
      details: 'Please try again later'
    });
  }

  // Rate limiting
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Too many requests',
      details: 'Please wait before making another request'
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
