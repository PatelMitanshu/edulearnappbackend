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
app.use('/api/app', require('./routes/appRoutes'));

// Health Check
app.get('/health', (req, res) => {
  const healthInfo = {
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    memory: process.memoryUsage(),
    pid: process.pid
  };
  
  console.log(`[Health Check] Health endpoint accessed at ${healthInfo.timestamp}`);
  res.status(200).json(healthInfo);
});

// Keep-alive functionality to prevent Render server from sleeping
const http = require('http');
const https = require('https');

const KEEP_ALIVE_INTERVAL = 7* 60 * 1000; // 10 minutes in milliseconds

function selfPing() {
  try {
    // Use the correct production URL or fallback to localhost for development
    const url = process.env.RENDER_EXTERNAL_URL || 
                process.env.APP_URL || 
                'https://edulearnappbackend-6etb.onrender.com' || 
                `http://localhost:${PORT}`;
    
    const isHttps = url.startsWith('https://');
    const protocol = isHttps ? https : http;
    
    console.log(`[Keep-Alive] Pinging ${url}/health at ${new Date().toISOString()}`);
    
    const request = protocol.get(`${url}/health`, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        console.log(`[Keep-Alive] Self-ping successful, status: ${response.statusCode}, response: ${data}`);
      });
    });
    
    request.on('error', (error) => {
      console.log(`[Keep-Alive] Self-ping failed: ${error.message}`);
    });
    
    request.setTimeout(30000, () => {
      console.log('[Keep-Alive] Self-ping timeout');
      request.destroy();
    });
    
  } catch (error) {
    console.log(`[Keep-Alive] Error during self-ping: ${error.message}`);
  }
}

// Start the keep-alive mechanism for production and Render.com deployment
const isProduction = process.env.NODE_ENV === 'production' || 
                    process.env.ENABLE_KEEP_ALIVE === 'true' ||
                    process.env.RENDER_EXTERNAL_URL; // Only for actual production/Render deployment

if (isProduction) {
  console.log('[Keep-Alive] Starting keep-alive mechanism - pinging every 8 minutes');
  console.log('[Keep-Alive] Environment: NODE_ENV=' + process.env.NODE_ENV);
  console.log('[Keep-Alive] Will ping health endpoint to prevent server sleep');
  
  // Set up the interval
  setInterval(selfPing, KEEP_ALIVE_INTERVAL);
  
  // Initial ping after 10 seconds for testing (normally 1 minute)
  setTimeout(selfPing, 10000);
} else {
  console.log('[Keep-Alive] Keep-alive disabled for development environment');
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
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://192.168.1.3:${PORT}`);
  console.log(`Hotspot access: http://192.168.137.1:${PORT}`);
});

module.exports = app;
