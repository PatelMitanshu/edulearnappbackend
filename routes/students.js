const express = require('express');
const { body, validationResult } = require('express-validator');
const Student = require('../models/Student');
const Standard = require('../models/Standard');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/students
// @desc    Get all students
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { standard, page = 1, limit = 10 } = req.query;
    const query = { isActive: true };

    if (standard) {
      query.standard = standard;
    }

    const students = await Student.find(query)
      .populate('standard', 'name')
      .populate('createdBy', 'name email')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Student.countDocuments(query);

    res.json({
      message: 'Students retrieved successfully',
      students,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error while fetching students' });
  }
});

// @route   GET /api/students/by-standard/:standardId
// @desc    Get students by standard
// @access  Private
router.get('/by-standard/:standardId', authMiddleware, async (req, res) => {
  try {
    const students = await Student.find({ 
      standard: req.params.standardId, 
      isActive: true 
    })
      .populate('standard', 'name')
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    res.json({
      message: 'Students retrieved successfully',
      students
    });
  } catch (error) {
    console.error('Get students by standard error:', error);
    res.status(500).json({ message: 'Server error while fetching students' });
  }
});

// @route   POST /api/students
// @desc    Create a new student
// @access  Private
router.post('/', authMiddleware, [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('standard')
    .isMongoId()
    .withMessage('Valid standard ID is required'),
  body('rollNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Roll number cannot exceed 20 characters'),
  body('parentContact.phone')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('parentContact.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, standard, rollNumber, dateOfBirth, parentContact } = req.body;

    // Check if standard exists
    const standardExists = await Standard.findById(standard);
    if (!standardExists || !standardExists.isActive) {
      return res.status(400).json({ message: 'Invalid standard' });
    }

    // Check if roll number is unique for the standard
    if (rollNumber) {
      const existingStudent = await Student.findOne({ rollNumber, standard });
      if (existingStudent) {
        return res.status(400).json({ message: 'Roll number already exists for this standard' });
      }
    }

    const student = new Student({
      name,
      standard,
      rollNumber,
      dateOfBirth: dateOfBirth && dateOfBirth.trim() ? new Date(dateOfBirth) : undefined,
      parentContact,
      createdBy: req.teacher._id
    });

    await student.save();
    await student.populate(['standard', 'createdBy'], 'name email');

    res.status(201).json({
      message: 'Student created successfully',
      student
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ message: 'Server error while creating student' });
  }
});

// @route   GET /api/students/:id
// @desc    Get a specific student
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('standard', 'name description subjects')
      .populate('createdBy', 'name email');

    if (!student || !student.isActive) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({
      message: 'Student retrieved successfully',
      student
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ message: 'Server error while fetching student' });
  }
});

// @route   PUT /api/students/:id
// @desc    Update a student
// @access  Private
router.put('/:id', authMiddleware, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('rollNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Roll number cannot exceed 20 characters'),
  body('parentContact.phone')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('parentContact.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, rollNumber, dateOfBirth, parentContact } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student || !student.isActive) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if roll number is unique for the standard (if changing)
    if (rollNumber && rollNumber !== student.rollNumber) {
      const existingStudent = await Student.findOne({ 
        rollNumber, 
        standard: student.standard,
        _id: { $ne: student._id }
      });
      if (existingStudent) {
        return res.status(400).json({ message: 'Roll number already exists for this standard' });
      }
    }

    if (name) student.name = name;
    if (rollNumber !== undefined) student.rollNumber = rollNumber;
    if (dateOfBirth) student.dateOfBirth = new Date(dateOfBirth);
    if (parentContact) {
      student.parentContact = {
        ...student.parentContact,
        ...parentContact
      };
    }

    await student.save();
    await student.populate(['standard', 'createdBy'], 'name email');

    res.json({
      message: 'Student updated successfully',
      student
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ message: 'Server error while updating student' });
  }
});

// @route   DELETE /api/students/:id
// @desc    Delete a student (soft delete)
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.isActive = false;
    await student.save();

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ message: 'Server error while deleting student' });
  }
});

module.exports = router;
