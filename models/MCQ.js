const mongoose = require('mongoose');

const MCQQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    type: String,
    required: true,
    trim: true
  }],
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  explanation: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const MCQSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  standardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Standard',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  questions: [MCQQuestionSchema],
  metadata: {
    bookLanguage: {
      type: String,
      default: 'English'
    },
    questionLanguage: {
      type: String,
      default: 'English'
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    imageAnalyzed: {
      type: Boolean,
      default: true
    }
  },
  settings: {
    timeLimit: {
      type: Number, // in minutes
      default: 30
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    showCorrectAnswers: {
      type: Boolean,
      default: true
    },
    allowRetake: {
      type: Boolean,
      default: true
    }
  },
  statistics: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    highestScore: {
      type: Number,
      default: 0
    },
    lowestScore: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
MCQSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual to get questions count
MCQSchema.virtual('questionsCount').get(function() {
  return this.questions.length;
});

// Virtual to get formatted creation date
MCQSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Static method to find MCQs by standard
MCQSchema.statics.findByStandard = function(standardId, teacherId) {
  return this.find({
    standardId: standardId,
    teacherId: teacherId,
    isActive: true
  }).sort({ createdAt: -1 });
};

// Instance method to calculate difficulty level
MCQSchema.methods.getDifficultyLevel = function() {
  if (this.statistics.averageScore >= 80) return 'Easy';
  if (this.statistics.averageScore >= 60) return 'Medium';
  return 'Hard';
};

// Instance method to update statistics
MCQSchema.methods.updateStatistics = function(score) {
  this.statistics.totalAttempts += 1;
  
  if (this.statistics.totalAttempts === 1) {
    this.statistics.averageScore = score;
    this.statistics.highestScore = score;
    this.statistics.lowestScore = score;
  } else {
    // Update average score
    const totalScore = this.statistics.averageScore * (this.statistics.totalAttempts - 1) + score;
    this.statistics.averageScore = Math.round(totalScore / this.statistics.totalAttempts);
    
    // Update highest and lowest scores
    this.statistics.highestScore = Math.max(this.statistics.highestScore, score);
    this.statistics.lowestScore = Math.min(this.statistics.lowestScore, score);
  }
  
  return this.save();
};

// Add index for better query performance
MCQSchema.index({ standardId: 1, teacherId: 1, isActive: 1 });
MCQSchema.index({ createdAt: -1 });

// Ensure virtual fields are serialized
MCQSchema.set('toJSON', { virtuals: true });
MCQSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MCQ', MCQSchema);
