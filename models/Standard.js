const mongoose = require('mongoose');

const standardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Standard name is required'],
    trim: true,
    maxlength: [50, 'Standard name cannot exceed 50 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  subjects: [{
    type: String,
    trim: true
  }],
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

// Create compound index for unique standard name per teacher
standardSchema.index({ name: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model('Standard', standardSchema);
