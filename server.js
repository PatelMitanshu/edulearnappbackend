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
    : [
        'http://localhost:3000', 
        'http://localhost:8081', 
        'http://192.168.1.3:3000',   // Old WiFi IP
        'http://192.168.1.3:8081',   // Old WiFi IP Metro
        'http://192.168.1.4:3000',   // New WiFi IP
        'http://192.168.1.4:8081',   // New WiFi IP Metro
        'http://192.168.137.1:3000',  // Hotspot IP
        'http://192.168.137.1:8081',  // Hotspot IP Metro
        'http://10.0.2.2:3000', // Android emulator
        'http://10.0.2.2:8081'   // Android emulator Metro
      ],
  credentials: true,
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory (for fallback document storage)
app.use('/uploads', express.static('public/uploads'));

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
app.use('/api/divisions', require('./routes/divisions'));
app.use('/api/students', require('./routes/students'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/mcq', require('./routes/mcq'));
app.use('/api/mcq-student', require('./routes/mcqStudent'));
app.use('/api/lesson-plans', require('./routes/lessonPlans'));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// Keep-alive functionality to prevent Render server from sleeping
const http = require('http');
const https = require('https');

const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

function selfPing() {
  try {
    // Get the current URL of the deployed app or use localhost for development
    const url = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || `http://localhost:${PORT}`;
    const isHttps = url.startsWith('https://');
    const protocol = isHttps ? https : http;
    
    console.log(`[Keep-Alive] Pinging ${url}/health at ${new Date().toISOString()}`);
    
    const request = protocol.get(`${url}/health`, (response) => {
    });
    
    request.on('error', (error) => {
    });
    
    request.setTimeout(30000, () => {
      request.destroy();
    });
    
  } catch (error) {
  }
}

// Start the keep-alive mechanism only in production
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_KEEP_ALIVE === 'true') {
  setInterval(selfPing, KEEP_ALIVE_INTERVAL);
  
  // Initial ping after 1 minute to ensure the server is ready
  setTimeout(selfPing, 60000);
}

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
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces
app.listen(PORT, HOST, () => {
});

module.exports = app;
