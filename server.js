const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS Configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:8081'],
  credentials: true,
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/education_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/standards', require('./routes/standards'));
app.use('/api/students', require('./routes/students'));
app.use('/api/uploads', require('./routes/uploads'));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Keep-alive self-ping to prevent Render server from idling
  const http = require('http');
  const https = require('https');
  const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  function selfPing() {
    const protocol = process.env.NODE_ENV === 'production' ? https : http;
    const hostname = process.env.NODE_ENV === 'production' 
      ? process.env.RENDER_EXTERNAL_URL || 'localhost'
      : 'localhost';
    
    const options = {
      hostname: hostname.replace(/^https?:\/\//, ''), // Remove protocol if present
      port: process.env.NODE_ENV === 'production' ? 443 : PORT,
      path: '/health',
      method: 'GET',
      timeout: 30000 // 30 second timeout
    };
    
    const req = protocol.request(options, (res) => {
      console.log(`Keep-alive ping successful: ${res.statusCode}`);
    });
    
    req.on('error', (err) => {
      console.log(`Keep-alive ping failed: ${err.message}`);
    });
    
    req.on('timeout', () => {
      console.log('Keep-alive ping timed out');
      req.destroy();
    });
    
    req.end();
  }
  
  // Start the keep-alive pinging after 1 minute, then every 10 minutes
  setTimeout(() => {
    selfPing(); // Initial ping
    setInterval(selfPing, KEEP_ALIVE_INTERVAL);
    console.log('Keep-alive self-ping started - will ping every 10 minutes');
  }, 60000); // Wait 1 minute before starting
});

module.exports = app;
