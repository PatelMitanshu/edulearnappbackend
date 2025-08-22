const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['photo', 'video', 'text', 'link', 'document'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  }
});

const lessonPlanSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 15,
    max: 300 // 5 hours max
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  materials: [materialSchema],
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  standardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Standard',
    required: false
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for efficient queries
lessonPlanSchema.index({ teacherId: 1, date: 1 });
lessonPlanSchema.index({ teacherId: 1, subject: 1 });
lessonPlanSchema.index({ completed: 1, date: 1 });

// Virtual for formatted date
lessonPlanSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Method to toggle completion
lessonPlanSchema.methods.toggleCompletion = function() {
  this.completed = !this.completed;
  this.completedAt = this.completed ? new Date() : null;
  return this.save();
};

// Static method to get lessons for a specific date range
lessonPlanSchema.statics.getLessonsForDateRange = function(teacherId, startDate, endDate) {
  return this.find({
    teacherId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1, startTime: 1 });
};

// Static method to get today's lessons
lessonPlanSchema.statics.getTodaysLessons = function(teacherId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    teacherId,
    date: {
      $gte: today,
      $lt: tomorrow
    }
  }).sort({ startTime: 1 });
};

module.exports = mongoose.model('LessonPlan', lessonPlanSchema);
