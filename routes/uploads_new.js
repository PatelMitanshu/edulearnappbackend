const express = require('express');
const { body, validationResult } = require('express-validator');
const uploadsController = require('../controllers/uploadsController');
const authMiddleware = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');

const router = express.Router();

// Validation middleware for uploads
const uploadValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('student')
    .isMongoId()
    .withMessage('Valid student ID is required'),
  body('type')
    .isIn(['video', 'document', 'image'])
    .withMessage('Type must be video, document, or image'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Subject cannot exceed 50 characters')
];

// Update validation middleware
const updateValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Subject cannot exceed 50 characters')
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors: errors.array() 
    });
  }
  next();
};

// Upload a file for a student
router.post('/', authMiddleware, uploadMiddleware.single('file'), uploadValidation, handleValidationErrors, uploadsController.uploadFile);

// Get all uploads for a student
router.get('/student/:studentId', authMiddleware, uploadsController.getStudentUploads);

// Get a specific upload
router.get('/:id', authMiddleware, uploadsController.getUploadById);

// Update an upload
router.put('/:id', authMiddleware, updateValidation, handleValidationErrors, uploadsController.updateUpload);

// Delete an upload
router.delete('/:id', authMiddleware, uploadsController.deleteUpload);

module.exports = router;
