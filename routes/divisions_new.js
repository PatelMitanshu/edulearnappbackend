const express = require('express');
const { body } = require('express-validator');
const divisionsController = require('../controllers/divisionsController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/divisions/by-standard/:standardId
// @desc    Get all divisions for a specific standard
// @access  Private
router.get('/by-standard/:standardId', authMiddleware, divisionsController.getDivisionsByStandard);

// @route   GET /api/divisions/:id
// @desc    Get a specific division
// @access  Private
router.get('/:id', authMiddleware, divisionsController.getDivision);

// @route   POST /api/divisions
// @desc    Create a new division
// @access  Private
router.post('/', authMiddleware, [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Division name must be between 1 and 50 characters')
    .matches(/^[A-Za-z\-\s]+$/)
    .withMessage('Division name can only contain letters, spaces, and hyphens'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('standardId')
    .isMongoId()
    .withMessage('Valid standard ID is required')
], divisionsController.createDivision);

// @route   PUT /api/divisions/:id
// @desc    Update a division
// @access  Private
router.put('/:id', authMiddleware, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Division name must be between 1 and 50 characters')
    .matches(/^[A-Za-z\-\s]+$/)
    .withMessage('Division name can only contain letters, spaces, and hyphens'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters')
], divisionsController.updateDivision);

// @route   DELETE /api/divisions/:id
// @desc    Delete a division (soft delete)
// @access  Private
router.delete('/:id', authMiddleware, divisionsController.deleteDivision);

module.exports = router;
