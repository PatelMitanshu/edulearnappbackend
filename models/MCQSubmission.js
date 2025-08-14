const mongoose = require('mongoose');

const MCQSubmissionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  mcqId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MCQ',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  standardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Standard',
    required: true
  },
  answers: [{
    questionIndex: {
      type: Number,
      required: true
    },
    selectedAnswer: {
      type: Number,
      required: true,
      min: -1, // -1 for unanswered questions, 0-3 for answered questions
      max: 3
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    timeTaken: {
      type: Number, // Time taken in seconds for this question
      default: 0
    }
  }],
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true,
    min: 0
  },
  incorrectAnswers: {
    type: Number,
    required: true,
    min: 0
  },
  timeTaken: {
    type: Number, // Total time taken in seconds
    required: true
  },
  startedAt: {
    type: Date,
    required: true
  },
  completedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['completed', 'abandoned'],
    default: 'completed'
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Compound index to ensure one submission per student per MCQ
MCQSubmissionSchema.index({ studentId: 1, mcqId: 1 }, { unique: true });

// Additional indexes for performance
MCQSubmissionSchema.index({ teacherId: 1, standardId: 1 });
MCQSubmissionSchema.index({ mcqId: 1, completedAt: -1 });
MCQSubmissionSchema.index({ studentId: 1, completedAt: -1 });

// Virtual to get percentage score
MCQSubmissionSchema.virtual('percentage').get(function() {
  return Math.round((this.correctAnswers / this.totalQuestions) * 100);
});

// Virtual to get grade based on percentage
MCQSubmissionSchema.virtual('grade').get(function() {
  const percentage = this.percentage;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
});

// Virtual to format time taken
MCQSubmissionSchema.virtual('formattedTimeTaken').get(function() {
  const minutes = Math.floor(this.timeTaken / 60);
  const seconds = this.timeTaken % 60;
  return `${minutes}m ${seconds}s`;
});

// Static method to get student's test history
MCQSubmissionSchema.statics.getStudentTestHistory = function(studentId) {
  return this.find({ studentId, isActive: true })
    .populate('mcqId', 'title description createdAt')
    .sort({ completedAt: -1 });
};

// Static method to get test results for a specific MCQ
MCQSubmissionSchema.statics.getMCQResults = function(mcqId) {
  return this.find({ mcqId, isActive: true })
    .populate('studentId', 'name rollNumber')
    .sort({ score: -1, completedAt: 1 });
};

// Static method to check if student has already taken a test
MCQSubmissionSchema.statics.hasStudentTakenTest = function(studentId, mcqId) {
  return this.findOne({ studentId, mcqId, isActive: true });
};

// Static method to get class performance statistics
MCQSubmissionSchema.statics.getClassStatistics = function(mcqId) {
  return this.aggregate([
    { $match: { mcqId: new mongoose.Types.ObjectId(mcqId), isActive: true } },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        averageScore: { $avg: '$score' },
        highestScore: { $max: '$score' },
        lowestScore: { $min: '$score' },
        averageTimeTaken: { $avg: '$timeTaken' }
      }
    }
  ]);
};

// Instance method to calculate detailed analysis
MCQSubmissionSchema.methods.getDetailedAnalysis = function() {
  return {
    performance: {
      score: this.score,
      percentage: this.percentage,
      grade: this.grade,
      rank: null // To be calculated separately
    },
    timing: {
      totalTime: this.timeTaken,
      formattedTime: this.formattedTimeTaken,
      averageTimePerQuestion: Math.round(this.timeTaken / this.totalQuestions)
    },
    accuracy: {
      correct: this.correctAnswers,
      incorrect: this.incorrectAnswers,
      total: this.totalQuestions,
      accuracyRate: Math.round((this.correctAnswers / this.totalQuestions) * 100)
    }
  };
};

// Pre-save middleware to update MCQ statistics
MCQSubmissionSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const MCQ = mongoose.model('MCQ');
      const mcq = await MCQ.findById(this.mcqId);
      if (mcq) {
        await mcq.updateStatistics(this.score);
      }
    } catch (error) {
      console.error('Error updating MCQ statistics:', error);
    }
  }
  next();
});

// Ensure virtual fields are serialized
MCQSubmissionSchema.set('toJSON', { virtuals: true });
MCQSubmissionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MCQSubmission', MCQSubmissionSchema);
