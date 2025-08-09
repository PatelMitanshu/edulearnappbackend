const { validationResult } = require('express-validator');
const Standard = require('../models/Standard');

const standardsController = {
  // Get all standards
  getAllStandards: async (req, res) => {
    try {
      const standards = await Standard.find({ 
        createdBy: req.teacher._id,
        isActive: true
      })
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
  },

  // Get single standard
  getStandard: async (req, res) => {
    try {
      const standard = await Standard.findOne({
        _id: req.params.id,
        createdBy: req.teacher._id,
        isActive: true
      })
        .populate('createdBy', 'name email');

      if (!standard) {
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
  },

  // Create new standard
  createStandard: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { name, description, subjects } = req.body;

      // Check if standard already exists for this teacher (including inactive ones)
      const existingStandard = await Standard.findOne({ 
        name,
        createdBy: req.teacher._id,
        isActive: true
      });
      
      if (existingStandard) {
        return res.status(400).json({ 
          message: `Standard "${name}" already exists. Please choose a different standard.`,
          error: 'DUPLICATE_STANDARD'
        });
      }

      const standard = new Standard({
        name,
        description,
        subjects: subjects || [],
        createdBy: req.teacher._id
      });

      try {
        await standard.save();
        await standard.populate('createdBy', 'name email');

        res.status(201).json({
          message: 'Standard created successfully',
          standard
        });
      } catch (saveError) {
        // Handle duplicate key error from database
        if (saveError.code === 11000) {
          return res.status(400).json({ 
            message: `Standard "${name}" already exists. Please choose a different standard.`,
            error: 'DUPLICATE_STANDARD'
          });
        }
        throw saveError; // Re-throw other errors
      }
    } catch (error) {
      console.error('Create standard error:', error);
      res.status(500).json({ message: 'Server error while creating standard' });
    }
  },

  // Update standard
  updateStandard: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { name, description, subjects } = req.body;

      const standard = await Standard.findOne({
        _id: req.params.id,
        createdBy: req.teacher._id,
        isActive: true
      });

      if (!standard) {
        return res.status(404).json({ message: 'Standard not found' });
      }

      // Check for duplicate name if changing it
      if (name && name !== standard.name) {
        const existingStandard = await Standard.findOne({
          name,
          createdBy: req.teacher._id,
          isActive: true,
          _id: { $ne: standard._id }
        });
        
        if (existingStandard) {
          return res.status(400).json({ message: 'Standard with this name already exists' });
        }
      }

      // Update standard
      Object.assign(standard, {
        name: name || standard.name,
        description: description !== undefined ? description : standard.description,
        subjects: subjects !== undefined ? subjects : standard.subjects
      });

      await standard.save();
      await standard.populate('createdBy', 'name email');

      res.json({
        message: 'Standard updated successfully',
        standard
      });
    } catch (error) {
      console.error('Update standard error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ message: 'Standard with this name already exists' });
      }
      res.status(500).json({ message: 'Server error while updating standard' });
    }
  },

  // Delete standard (soft delete)
  deleteStandard: async (req, res) => {
    try {
      const standard = await Standard.findOne({
        _id: req.params.id,
        createdBy: req.teacher._id,
        isActive: true
      });

      if (!standard) {
        return res.status(404).json({ message: 'Standard not found' });
      }

      standard.isActive = false;
      await standard.save();

      res.json({
        message: 'Standard deleted successfully'
      });
    } catch (error) {
      console.error('Delete standard error:', error);
      res.status(500).json({ message: 'Server error while deleting standard' });
    }
  }
};

module.exports = standardsController;
