const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student is required']
  },
  type: {
    type: String,
    enum: ['video', 'document', 'image'],
    required: [true, 'Upload type is required']
  },
  file: {
    url: {
      type: String,
      required: [true, 'File URL is required']
    },
    publicId: String, // For Cloudinary
    originalName: String,
    size: Number, // File size in bytes
    mimeType: String
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [50, 'Subject cannot exceed 50 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
uploadSchema.index({ student: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Upload', uploadSchema);
