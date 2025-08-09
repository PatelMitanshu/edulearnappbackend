const mongoose = require('mongoose');

const divisionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 10 // e.g., "A", "B", "Alpha", etc.
  },
  fullName: {
    type: String,
    required: true,
    trim: true // e.g., "8-A", "10-B", etc.
  },
  standard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Standard',
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
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

// Create a compound index for uniqueness within a standard
divisionSchema.index({ standard: 1, name: 1 }, { unique: true });

// Virtual for student count
divisionSchema.virtual('studentCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'division',
  count: true
});

// Virtual populate
divisionSchema.set('toJSON', { virtuals: true });
divisionSchema.set('toObject', { virtuals: true });

// Pre-save middleware to generate fullName
divisionSchema.pre('save', async function(next) {
  if (this.isModified('name') || this.isModified('standard')) {
    // Populate standard to get its name
    await this.populate('standard');
    this.fullName = `${this.standard.name}-${this.name}`;
  }
  next();
});

module.exports = mongoose.model('Division', divisionSchema);
