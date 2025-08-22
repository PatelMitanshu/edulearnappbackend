const { validationResult } = require('express-validator');

let Division, Standard, Student;

try {
  Division = require('../models/Division');
  Standard = require('../models/Standard');
  Student = require('../models/Student');
} catch (error) {
  console.error('Error loading models in divisionsController:', error);
  throw error;
}

// Get all divisions for a specific standard
const getDivisionsByStandard = async (req, res) => {
  try {
    const { standardId } = req.params;// Verify the standard exists and belongs to this teacher
    const standard = await Standard.findOne({ 
      _id: standardId, 
      createdBy: req.teacher._id,
      isActive: true
    });
    
    if (!standard) {// Return empty divisions instead of error to handle gracefully
      return res.json({ divisions: [] });
    }

    const divisions = await Division.find({ 
      standard: standardId,
      isActive: true
    })
      .populate('standard', 'name')
      .populate('createdBy', 'name email')
      .sort({ name: 1 });// Add student counts to each division
    const divisionsWithCounts = await Promise.all(
      divisions.map(async (division) => {
        const studentCount = await Student.countDocuments({ 
          division: division._id,
          isActive: true 
        });

        return {
          ...division.toObject(),
          studentCount,
          fullName: `${standard.name}-${division.name}`
        };
      })
    );

    res.json({
      success: true,
      divisions: divisionsWithCounts
    });
  } catch (error) {
    console.error('Error fetching divisions by standard:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching divisions'
    });
  }
};

// Get division by ID
const getDivision = async (req, res) => {
  try {
    const division = await Division.findOne({
      _id: req.params.id,
      isActive: true
    })
      .populate({
        path: 'standard',
        select: 'name createdBy',
        populate: {
          path: 'createdBy',
          select: 'name email'
        }
      })
      .populate('createdBy', 'name email');

    if (!division) {
      return res.status(404).json({ error: 'Division not found' });
    }

    // Verify the standard belongs to this teacher
    if (division.standard.createdBy._id.toString() !== req.teacher._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add student count
    const studentCount = await Student.countDocuments({ 
      division: division._id,
      isActive: true 
    });

    const divisionWithCount = {
      ...division.toObject(),
      studentCount,
      fullName: `${division.standard.name}-${division.name}`
    };

    res.json({
      success: true,
      division: divisionWithCount
    });
  } catch (error) {
    console.error('Error fetching division:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching division'
    });
  }
};

// Create new division
const createDivision = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, standardId } = req.body;// Verify the standard exists and belongs to this teacher
    const standard = await Standard.findOne({ 
      _id: standardId, 
      createdBy: req.teacher._id,
      isActive: true
    });

    if (!standard) {
      return res.status(400).json({
        success: false,
        message: 'Standard not found'
      });
    }

    // Check if division with same name already exists for this standard
    const existingDivision = await Division.findOne({
      name: name.toUpperCase(),
      standard: standardId
    });

    if (existingDivision) {
      if (existingDivision.isActive) {
        return res.status(400).json({
          success: false,
          message: `Division "${name.toUpperCase()}" already exists for ${standard.name}`
        });
      } else {
        // Reactivate the soft-deleted division
        existingDivision.isActive = true;
        existingDivision.description = description;
        existingDivision.fullName = `${standard.name}-${name.toUpperCase()}`;
        await existingDivision.save();
        await existingDivision.populate(['standard', 'createdBy']);

        return res.status(201).json({
          success: true,
          message: 'Division reactivated successfully',
          division: existingDivision
        });
      }
    }

    const division = new Division({
      name: name.toUpperCase(),
      fullName: `${standard.name}-${name.toUpperCase()}`,
      description,
      standard: standardId,
      createdBy: req.teacher._id
    });

    await division.save();
    await division.populate([
      { path: 'standard', select: 'name' },
      { path: 'createdBy', select: 'name email' }
    ]);

    const divisionWithCount = {
      ...division.toObject(),
      studentCount: 0,
      fullName: `${standard.name}-${division.name}`
    };

    res.status(201).json({
      success: true,
      message: 'Division created successfully',
      division: divisionWithCount
    });
  } catch (error) {
    console.error('Error creating division:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Division name already exists for this standard'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating division'
    });
  }
};

// Update division
const updateDivision = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description } = req.body;
    const division = await Division.findOne({
      _id: req.params.id,
      isActive: true
    }).populate('standard');

    if (!division) {
      return res.status(404).json({
        success: false,
        message: 'Division not found'
      });
    }

    // Verify the division belongs to this teacher (through standard)
    const standard = await Standard.findOne({
      _id: division.standard._id,
      createdBy: req.teacher._id,
      isActive: true
    });

    if (!standard) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if new name conflicts with existing divisions (if name is being changed)
    if (name && name.toUpperCase() !== division.name) {
      const existingDivision = await Division.findOne({
        name: name.toUpperCase(),
        standard: division.standard._id,
        isActive: true,
        _id: { $ne: division._id }
      });

      if (existingDivision) {
        return res.status(400).json({
          success: false,
          message: `Division "${name.toUpperCase()}" already exists for ${standard.name}`
        });
      }
    }

    // Update fields
    if (name) division.name = name.toUpperCase();
    if (description !== undefined) division.description = description;

    await division.save();
    await division.populate([
      { path: 'standard', select: 'name' },
      { path: 'createdBy', select: 'name email' }
    ]);

    // Add student count
    const studentCount = await Student.countDocuments({ 
      division: division._id,
      isActive: true 
    });

    const divisionWithCount = {
      ...division.toObject(),
      studentCount,
      fullName: `${division.standard.name}-${division.name}`
    };

    res.json({
      success: true,
      message: 'Division updated successfully',
      division: divisionWithCount
    });
  } catch (error) {
    console.error('Error updating division:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Division name already exists for this standard'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating division'
    });
  }
};

// Delete division (soft delete)
const deleteDivision = async (req, res) => {
  try {
    const division = await Division.findOne({
      _id: req.params.id,
      isActive: true
    }).populate('standard');

    if (!division) {
      return res.status(404).json({
        success: false,
        message: 'Division not found'
      });
    }

    // Verify the division belongs to this teacher (through standard)
    const standard = await Standard.findOne({
      _id: division.standard._id,
      createdBy: req.teacher._id,
      isActive: true
    });

    if (!standard) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if division has students
    const studentCount = await Student.countDocuments({ 
      division: division._id,
      isActive: true 
    });

    // Soft delete the division and its students
    division.isActive = false;
    await division.save();

    // Also soft delete all students in this division
    if (studentCount > 0) {
      await Student.updateMany(
        { division: division._id, isActive: true },
        { isActive: false }
      );
    }

    res.json({
      success: true,
      message: `Division deleted successfully${studentCount > 0 ? ` (${studentCount} students also moved to inactive)` : ''}`
    });
  } catch (error) {
    console.error('Error deleting division:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting division'
    });
  }
};

module.exports = {
  getDivisionsByStandard,
  getDivision,
  createDivision,
  updateDivision,
  deleteDivision
};
