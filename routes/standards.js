const express = require('express');
const { body, validationResult } = require('express-validator');
const Standard = require('../models/Standard');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/standards
// @desc    Get all standards
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const standards = await Standard.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    res.json({
      message: 'Standards retrieved successfully',
      standards
    });
  } catch (error) {
    console.error('Get standards error:', error);
    res.status(500).json({ message: 'Server error while fetching standards' });
  }
});

// @route   POST /api/standards
// @desc    Create a new standard
// @access  Private (Admin only)
router.post('/', authMiddleware, [
  body('name')
    .isIn(['6th Standard', '7th Standard', '8th Standard'])
    .withMessage('Standard name must be 6th, 7th, or 8th Standard'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('subjects')
    .optional()
    .isArray()
    .withMessage('Subjects must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, description, subjects } = req.body;

    // Check if standard already exists
    const existingStandard = await Standard.findOne({ name });
    if (existingStandard) {
      return res.status(400).json({ message: 'Standard already exists' });
    }

    const standard = new Standard({
      name,
      description,
      subjects: subjects || [],
      createdBy: req.teacher._id
    });

    await standard.save();
    await standard.populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Standard created successfully',
      standard
    });
  } catch (error) {
    console.error('Create standard error:', error);
    res.status(500).json({ message: 'Server error while creating standard' });
  }
});

// @route   GET /api/standards/:id
// @desc    Get a specific standard
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const standard = await Standard.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!standard || !standard.isActive) {
      return res.status(404).json({ message: 'Standard not found' });
    }

    res.json({
      message: 'Standard retrieved successfully',
      standard
    });
  } catch (error) {
    console.error('Get standard error:', error);
    res.status(500).json({ message: 'Server error while fetching standard' });
  }
});

// @route   PUT /api/standards/:id
// @desc    Update a standard
// @access  Private (Admin only)
router.put('/:id', authMiddleware, [
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('subjects')
    .optional()
    .isArray()
    .withMessage('Subjects must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { description, subjects } = req.body;
    const standard = await Standard.findById(req.params.id);

    if (!standard || !standard.isActive) {
      return res.status(404).json({ message: 'Standard not found' });
    }

    if (description !== undefined) standard.description = description;
    if (subjects !== undefined) standard.subjects = subjects;

    await standard.save();
    await standard.populate('createdBy', 'name email');

    res.json({
      message: 'Standard updated successfully',
      standard
    });
  } catch (error) {
    console.error('Update standard error:', error);
    res.status(500).json({ message: 'Server error while updating standard' });
  }
});

// @route   DELETE /api/standards/:id
// @desc    Delete a standard (soft delete)
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const standard = await Standard.findById(req.params.id);

    if (!standard) {
      return res.status(404).json({ message: 'Standard not found' });
    }

    standard.isActive = false;
    await standard.save();

    res.json({ message: 'Standard deleted successfully' });
  } catch (error) {
    console.error('Delete standard error:', error);
    res.status(500).json({ message: 'Server error while deleting standard' });
  }
});

module.exports = router;
