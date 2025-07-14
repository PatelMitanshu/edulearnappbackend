const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [15, 'Phone number cannot exceed 15 characters']
  },
  school: {
    type: String,
    trim: true,
    maxlength: [100, 'School name cannot exceed 100 characters']
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [50, 'Subject cannot exceed 50 characters']
  },
  role: {
    type: String,
    enum: ['teacher', 'admin'],
    default: 'teacher'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      studentUpdates: { type: Boolean, default: true },
      systemAlerts: { type: Boolean, default: true }
    },
    privacy: {
      profileVisibility: { 
        type: String, 
        enum: ['public', 'private', 'school'], 
        default: 'private' 
      },
      shareData: { type: Boolean, default: false }
    },
    appearance: {
      theme: { 
        type: String, 
        enum: ['light', 'dark', 'auto'], 
        default: 'light' 
      },
      language: { 
        type: String, 
        default: 'en' 
      }
    },
    backup: {
      autoBackup: { type: Boolean, default: true },
      backupFrequency: { 
        type: String, 
        enum: ['daily', 'weekly', 'monthly'], 
        default: 'weekly' 
      }
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
teacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
teacherSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
teacherSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return await this.save();
};

module.exports = mongoose.model('Teacher', teacherSchema);
