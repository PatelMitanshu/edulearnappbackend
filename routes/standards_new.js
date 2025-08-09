const express = require('express');
const { body } = require('express-validator');
const standardsController = require('../controllers/standardsController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/standards
// @desc    Get all standards
// @access  Private
router.get('/', authMiddleware, standardsController.getAllStandards);

// @route   GET /api/standards/:id
// @desc    Get a specific standard
// @access  Private
router.get('/:id', authMiddleware, standardsController.getStandard);

// @route   POST /api/standards
// @desc    Create a new standard
// @access  Private
router.post('/', authMiddleware, [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Standard name must be between 1 and 50 characters')
    .matches(/^[0-9A-Za-z\-\s]+$/)
    .withMessage('Standard name can only contain letters, numbers, spaces, and hyphens'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('subjects')
    .optional()
    .isArray()
    .withMessage('Subjects must be an array')
], standardsController.createStandard);

// @route   PUT /api/standards/:id
// @desc    Update a standard
// @access  Private
router.put('/:id', authMiddleware, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Standard name must be between 1 and 50 characters')
    .matches(/^[0-9A-Za-z\-\s]+$/)
    .withMessage('Standard name can only contain letters, numbers, spaces, and hyphens'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('subjects')
    .optional()
    .isArray()
    .withMessage('Subjects must be an array')
], standardsController.updateStandard);

// @route   DELETE /api/standards/:id
// @desc    Delete a standard (soft delete)
// @access  Private
router.delete('/:id', authMiddleware, standardsController.deleteStandard);

module.exports = router;
