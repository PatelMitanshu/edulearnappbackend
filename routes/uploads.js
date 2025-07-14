const express = require('express');
const { body, validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;
const Upload = require('../models/Upload');
const Student = require('../models/Student');
const authMiddleware = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    }).end(buffer);
  });
};

// @route   POST /api/uploads
// @desc    Upload a file for a student
// @access  Private
router.post('/', authMiddleware, uploadMiddleware.single('file'), [
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
], async (req, res) => {
  try {
    console.log('Upload request body:', req.body);
    console.log('Upload request file:', req.file);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title, student, type, description, subject, tags } = req.body;

    // Check if student exists
    const studentExists = await Student.findById(student);
    if (!studentExists || !studentExists.isActive) {
      return res.status(400).json({ message: 'Invalid student' });
    }

    // Determine resource type for Cloudinary based on file mimetype
    let resourceType = 'auto';
    if (req.file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else if (req.file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else {
      resourceType = 'raw'; // for documents
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
      resource_type: resourceType,
      folder: `education-app/${type}s`,
      public_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    // Create upload record
    const upload = new Upload({
      title,
      description,
      student,
      type,
      file: {
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      },
      subject,
      tags: tags ? JSON.parse(tags) : [],
      uploadedBy: req.teacher._id
    });

    await upload.save();
    await upload.populate(['student', 'uploadedBy'], 'name email');

    res.status(201).json({
      message: 'File uploaded successfully',
      upload
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error while uploading file' });
  }
});

// @route   GET /api/uploads/student/:studentId
// @desc    Get all uploads for a student
// @access  Private
router.get('/student/:studentId', authMiddleware, async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    const query = { student: req.params.studentId, isActive: true };

    if (type) {
      query.type = type;
    }

    const uploads = await Upload.find(query)
      .populate('student', 'name standard')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Upload.countDocuments(query);

    res.json({
      message: 'Uploads retrieved successfully',
      uploads,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get uploads error:', error);
    res.status(500).json({ message: 'Server error while fetching uploads' });
  }
});

// @route   GET /api/uploads/:id
// @desc    Get a specific upload
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id)
      .populate('student', 'name standard')
      .populate('uploadedBy', 'name email');

    if (!upload || !upload.isActive) {
      return res.status(404).json({ message: 'Upload not found' });
    }

    res.json({
      message: 'Upload retrieved successfully',
      upload
    });
  } catch (error) {
    console.error('Get upload error:', error);
    res.status(500).json({ message: 'Server error while fetching upload' });
  }
});

// @route   PUT /api/uploads/:id
// @desc    Update an upload
// @access  Private
router.put('/:id', authMiddleware, [
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
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { title, description, subject, tags } = req.body;
    const upload = await Upload.findById(req.params.id);

    if (!upload || !upload.isActive) {
      return res.status(404).json({ message: 'Upload not found' });
    }

    if (title) upload.title = title;
    if (description !== undefined) upload.description = description;
    if (subject !== undefined) upload.subject = subject;
    if (tags) upload.tags = tags;

    await upload.save();
    await upload.populate(['student', 'uploadedBy'], 'name email');

    res.json({
      message: 'Upload updated successfully',
      upload
    });
  } catch (error) {
    console.error('Update upload error:', error);
    res.status(500).json({ message: 'Server error while updating upload' });
  }
});

// @route   DELETE /api/uploads/:id
// @desc    Delete an upload
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);

    if (!upload) {
      return res.status(404).json({ message: 'Upload not found' });
    }

    // Delete from Cloudinary
    if (upload.file.publicId) {
      await cloudinary.uploader.destroy(upload.file.publicId, {
        resource_type: upload.type === 'video' ? 'video' : 
                      upload.type === 'image' ? 'image' : 'raw'
      });
    }

    // Soft delete
    upload.isActive = false;
    await upload.save();

    res.json({ message: 'Upload deleted successfully' });
  } catch (error) {
    console.error('Delete upload error:', error);
    res.status(500).json({ message: 'Server error while deleting upload' });
  }
});

module.exports = router;
