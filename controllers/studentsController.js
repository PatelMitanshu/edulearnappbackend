const { validationResult } = require('express-validator');
const Student = require('../models/Student');
const Standard = require('../models/Standard');
const Division = require('../models/Division');

const studentsController = {
  // Get all students
  getAllStudents: async (req, res) => {
    try {
      const { standard, page = 1, limit = 10 } = req.query;
      const query = { 
        isActive: true,
        createdBy: req.teacher._id
      };

      if (standard) {
        query.standard = standard;
      }

      const students = await Student.find(query)
        .populate('standard', 'name')
        .populate('division', 'name')
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
  },

  // Get students by standard
  getStudentsByStandard: async (req, res) => {
    try {
      const { standardId } = req.params;
      
      // Verify the standard exists and belongs to this teacher
      const standard = await Standard.findOne({ 
        _id: standardId, 
        createdBy: req.teacher._id,
        isActive: true
      });
      
      if (!standard) {
        return res.status(404).json({ message: 'Standard not found' });
      }

      const students = await Student.find({ 
        standard: standardId,
        isActive: true 
      })
        .populate('standard', 'name')
        .populate('division', 'name')
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
  },

  // Get students by division
  getStudentsByDivision: async (req, res) => {
    try {
      const { divisionId } = req.params;
      
      // Verify the division exists and belongs to this teacher
      const division = await Division.findOne({ 
        _id: divisionId,
        isActive: true 
      }).populate('standard');
      
      if (!division) {
        return res.status(404).json({ message: 'Division not found' });
      }

      // Check if the standard belongs to this teacher
      if (division.standard.createdBy.toString() !== req.teacher._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const students = await Student.find({ 
        division: divisionId,
        isActive: true 
      })
        .populate('standard', 'name')
        .populate('division', 'name')
        .populate('createdBy', 'name email')
        .sort({ name: 1 });

      res.json({
        message: 'Students retrieved successfully',
        students
      });
    } catch (error) {
      console.error('Get students by division error:', error);
      res.status(500).json({ message: 'Server error while fetching students' });
    }
  },

  // Get single student
  getStudent: async (req, res) => {
    try {
      const student = await Student.findOne({
        _id: req.params.id,
        createdBy: req.teacher._id,
        isActive: true
      })
        .populate('standard', 'name')
        .populate('division', 'name')
        .populate('createdBy', 'name email');

      if (!student) {
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
  },

  // Create new student
  createStudent: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { name, rollNumber, dateOfBirth, gender, address, parentContact, standardId, divisionId } = req.body;

      // Verify standard exists and belongs to teacher
      const standard = await Standard.findOne({ 
        _id: standardId, 
        createdBy: req.teacher._id,
        isActive: true
      });
      
      if (!standard) {
        return res.status(404).json({ message: 'Standard not found' });
      }

      // Verify division exists and belongs to the standard
      const division = await Division.findOne({ 
        _id: divisionId,
        standard: standardId,
        isActive: true 
      });
      
      if (!division) {
        return res.status(404).json({ message: 'Division not found' });
      }

      // Check for duplicate roll number in the same division
      if (rollNumber) {
        const existingStudent = await Student.findOne({
          rollNumber,
          division: divisionId,
          isActive: true
        });
        
        if (existingStudent) {
          return res.status(400).json({ message: 'Roll number already exists in this division' });
        }
      }

      const student = new Student({
        name,
        rollNumber,
        dateOfBirth,
        gender,
        address,
        parentContact,
        standard: standardId,
        division: divisionId,
        createdBy: req.teacher._id
      });

      await student.save();
      await student.populate(['standard', 'division', 'createdBy']);

      res.status(201).json({
        message: 'Student created successfully',
        student
      });
    } catch (error) {
      console.error('Create student error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ message: 'Student with this roll number already exists in this division' });
      }
      res.status(500).json({ message: 'Server error while creating student' });
    }
  },

  // Update student
  updateStudent: async (req, res) => {
    try {
      console.log('Update student request body:', req.body);
      console.log('Update student params:', req.params);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { name, rollNumber, dateOfBirth, gender, address, parentContact, standardId, divisionId } = req.body;

      // Find student and verify ownership
      const student = await Student.findOne({
        _id: req.params.id,
        createdBy: req.teacher._id,
        isActive: true
      });

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      // If changing standard, verify it exists and belongs to teacher
      if (standardId && standardId !== student.standard.toString()) {
        const standard = await Standard.findOne({ 
          _id: standardId, 
          createdBy: req.teacher._id,
          isActive: true
        });
        
        if (!standard) {
          return res.status(404).json({ message: 'Standard not found' });
        }
      }

      // If changing division, verify it exists and belongs to the standard
      if (divisionId && divisionId !== student.division.toString()) {
        const division = await Division.findOne({ 
          _id: divisionId,
          standard: standardId || student.standard,
          isActive: true 
        });
        
        if (!division) {
          return res.status(404).json({ message: 'Division not found' });
        }
      }

      // Check for duplicate roll number if changing it
      if (rollNumber && rollNumber !== student.rollNumber) {
        const existingStudent = await Student.findOne({
          rollNumber,
          division: divisionId || student.division,
          isActive: true,
          _id: { $ne: student._id }
        });
        
        if (existingStudent) {
          return res.status(400).json({ message: 'Roll number already exists in this division' });
        }
      }

      // Update student
      Object.assign(student, {
        name: name || student.name,
        rollNumber: rollNumber || student.rollNumber,
        dateOfBirth: dateOfBirth || student.dateOfBirth,
        gender: gender || student.gender,
        address: address || student.address,
        parentContact: parentContact || student.parentContact,
        standard: standardId || student.standard,
        division: divisionId || student.division
      });

      await student.save();
      await student.populate(['standard', 'division', 'createdBy']);

      res.json({
        message: 'Student updated successfully',
        student
      });
    } catch (error) {
      console.error('Update student error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ message: 'Student with this roll number already exists in this division' });
      }
      res.status(500).json({ message: 'Server error while updating student' });
    }
  },

  // Delete student (soft delete)
  deleteStudent: async (req, res) => {
    try {
      const student = await Student.findOne({
        _id: req.params.id,
        createdBy: req.teacher._id,
        isActive: true
      });

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      student.isActive = false;
      await student.save();

      res.json({
        message: 'Student deleted successfully'
      });
    } catch (error) {
      console.error('Delete student error:', error);
      res.status(500).json({ message: 'Server error while deleting student' });
    }
  }
};

module.exports = studentsController;
