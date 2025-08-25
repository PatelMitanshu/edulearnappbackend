const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  standard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Standard',
    required: [true, 'Standard is required']
  },
  division: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Division',
    required: [true, 'Division is required']
  },
  rollNumber: {
    type: String,
    trim: true,
    maxlength: [20, 'Roll number cannot exceed 20 characters']
  },
  uid: {
    type: String,
    trim: true,
    maxlength: [50, 'UID cannot exceed 50 characters']
  },
  dateOfBirth: {
    type: Date
  },
  parentContact: {
    phone: {
      type: String,
      match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
      
    }
  },
  profilePicture: {
    url: String,
    publicId: String // For Cloudinary
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  }
}, {
  timestamps: true
});

// Create compound index for unique roll number per division per teacher
// This allows same roll number in different divisions of the same standard
studentSchema.index({ rollNumber: 1, division: 1, createdBy: 1 }, { unique: true, sparse: true });

// Create compound index for unique UID per division per teacher
studentSchema.index({ uid: 1, division: 1, createdBy: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Student', studentSchema);
