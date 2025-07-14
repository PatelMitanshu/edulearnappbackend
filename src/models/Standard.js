const mongoose = require('mongoose');

const standardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Standard name is required'],
    enum: ['6th Standard', '7th Standard', '8th Standard'],
    unique: true
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

module.exports = mongoose.model('Standard', standardSchema);
