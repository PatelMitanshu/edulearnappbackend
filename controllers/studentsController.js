const { validationResult } = require('express-validator');
const Student = require('../models/Student');
const Standard = require('../models/Standard');
const Division = require('../models/Division');
const supabaseStorageService = require('../services/supabaseStorageService');

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
      // Diagnostic: log incoming payload for debugging import failures
      try {
        console.log('Create student payload:', JSON.stringify(req.body));
      } catch (e) {
        console.log('Create student payload (could not stringify)');
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Log validation errors for easier debugging
        try {
          console.error('Create student validation errors:', JSON.stringify(errors.array()));
        } catch (e) {
          console.error('Create student validation errors (could not stringify)');
        }
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { name, rollNumber, uid, dateOfBirth, gender, address, parentContact, standardId, divisionId } = req.body;

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
          return res.status(400).json({ 
            message: `Student with roll number '${rollNumber}' already exists in this division`,
            error: 'DUPLICATE_ROLL_NUMBER',
            existingStudent: {
              name: existingStudent.name,
              rollNumber: existingStudent.rollNumber
            }
          });
        }
      }

      // Check for duplicate UID in the same division
      if (uid) {
        const existingStudentWithUID = await Student.findOne({
          uid,
          division: divisionId,
          isActive: true
        });
        
        if (existingStudentWithUID) {
          return res.status(400).json({ 
            message: `Student with UID '${uid}' already exists in this division`,
            error: 'DUPLICATE_UID',
            existingStudent: {
              name: existingStudentWithUID.name,
              uid: existingStudentWithUID.uid
            }
          });
        }
      }

      const student = new Student({
        name,
        rollNumber,
        uid,
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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { name, rollNumber, uid, dateOfBirth, gender, address, parentContact, standardId, divisionId } = req.body;

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

      // Check for duplicate UID if changing it
      if (uid && uid !== student.uid) {
        const existingStudentWithUID = await Student.findOne({
          uid,
          division: divisionId || student.division,
          isActive: true,
          _id: { $ne: student._id }
        });
        
        if (existingStudentWithUID) {
          return res.status(400).json({ message: 'UID already exists in this division' });
        }
      }

      // Update student
      Object.assign(student, {
        name: name || student.name,
        rollNumber: rollNumber || student.rollNumber,
        uid: uid !== undefined ? uid : student.uid,
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
  },

  // Upload profile picture for a student
  uploadProfilePicture: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file uploaded' });
      }

      const studentId = req.params.id;
      
      // Verify the student exists and belongs to this teacher
      const student = await Student.findOne({
        _id: studentId,
        createdBy: req.teacher._id,
        isActive: true
      }).populate('standard', 'name')
        .populate('division', 'name')
        .populate('createdBy', 'name email');

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      // Delete old profile picture from Supabase Storage if it exists
      if (student.profilePicture && student.profilePicture.publicId) {
        try {
          await supabaseStorageService.deleteFile(student.profilePicture.publicId);
        } catch (deleteError) {
          console.warn('Failed to delete old profile picture from Supabase:', deleteError);
        }
      }

      // Upload to Supabase Storage
      const uploadResult = await supabaseStorageService.uploadProfilePicture(
        req.file.buffer,
        studentId,
        'student',
        req.file.originalname,
        req.file.mimetype
      );

      // Update student with new profile picture
      student.profilePicture = {
        url: uploadResult.url,
        publicId: uploadResult.path
      };

      await student.save();

      res.json({
        message: 'Profile picture uploaded successfully',
        student
      });
    } catch (error) {
      console.error('Upload profile picture error:', error);
      res.status(500).json({ message: 'Server error while uploading profile picture' });
    }
  }
};

module.exports = studentsController;
