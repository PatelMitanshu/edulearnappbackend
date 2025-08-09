const express = require('express');
const { body } = require('express-validator');
const studentsController = require('../controllers/studentsController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/students
// @desc    Get all students
// @access  Private
router.get('/', authMiddleware, studentsController.getAllStudents);

// @route   GET /api/students/by-standard/:standardId
// @desc    Get students by standard
// @access  Private
router.get('/by-standard/:standardId', authMiddleware, studentsController.getStudentsByStandard);

// @route   GET /api/students/by-division/:divisionId
// @desc    Get students by division
// @access  Private
router.get('/by-division/:divisionId', authMiddleware, studentsController.getStudentsByDivision);

// @route   GET /api/students/:id
// @desc    Get a specific student
// @access  Private
router.get('/:id', authMiddleware, studentsController.getStudent);

// @route   POST /api/students
// @desc    Create a new student
// @access  Private
router.post('/', authMiddleware, [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('rollNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Roll number cannot exceed 20 characters'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  body('parentContact.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please enter a valid phone number'),
  body('parentContact.email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('standardId')
    .isMongoId()
    .withMessage('Valid standard ID is required'),
  body('divisionId')
    .isMongoId()
    .withMessage('Valid division ID is required')
], studentsController.createStudent);

// @route   PUT /api/students/:id
// @desc    Update a student
// @access  Private
router.put('/:id', authMiddleware, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('rollNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Roll number cannot exceed 20 characters'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  body('parentContact.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please enter a valid phone number'),
  body('parentContact.email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('standardId')
    .optional()
    .isMongoId()
    .withMessage('Valid standard ID is required'),
  body('divisionId')
    .optional()
    .isMongoId()
    .withMessage('Valid division ID is required')
], studentsController.updateStudent);

// @route   DELETE /api/students/:id
// @desc    Delete a student (soft delete)
// @access  Private
router.delete('/:id', authMiddleware, studentsController.deleteStudent);

module.exports = router;
