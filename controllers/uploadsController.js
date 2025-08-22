const Upload = require('../models/Upload');
const Student = require('../models/Student');
const supabaseStorageService = require('../services/supabaseStorageService');

const uploadsController = {
  // Upload a file for a student
  uploadFile: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { title, student, type, description, subject, tags } = req.body;

      // Check if student exists and belongs to the authenticated teacher
      const studentExists = await Student.findOne({
        _id: student,
        createdBy: req.teacher._id
      });
      
      if (!studentExists || !studentExists.isActive) {
        return res.status(400).json({ message: 'Invalid student' });
      }

      // Determine resource type
      const classifyResourceType = (mimetype) => {
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('image/')) return 'image';
        return 'document';
      };

      const resourceType = classifyResourceType(req.file.mimetype);
      
      // Upload to Supabase Storage
      let uploadResult;
      try {
        uploadResult = await supabaseStorageService.uploadStudentFile(
          req.file.buffer,
          student,
          req.teacher._id,
          resourceType,
          req.file.originalname,
          req.file.mimetype
        );
        
      } catch (supabaseError) {
        console.error('Supabase upload failed:', supabaseError);
        throw new Error('File upload failed. Please try again.');
      }

      // Create upload record
      let parsedTags = [];
      if (tags && tags !== 'null' && tags.trim() !== '') {
        try {
          parsedTags = JSON.parse(tags);
        } catch (e) {
          parsedTags = [];
        }
      }

      const upload = new Upload({
        title,
        description,
        student,
        type,
        file: {
          url: uploadResult.url,
          publicId: uploadResult.path,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype
        },
        subject,
        tags: parsedTags,
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
  },

  // Create upload record (for Supabase uploads)
  createUploadRecord: async (req, res) => {
    try {
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      const { title, student, type, description, subject, tags, file } = req.body;
      // Check if student exists and belongs to the authenticated teacher
      const studentExists = await Student.findOne({
        _id: student,
        createdBy: req.teacher._id
      });
      if (!studentExists || !studentExists.isActive) {
        return res.status(400).json({ message: 'Invalid student' });
      }

      // Parse tags
      let parsedTags = [];
      if (tags && Array.isArray(tags)) {
        parsedTags = tags;
      } else if (tags && typeof tags === 'string' && tags !== 'null' && tags.trim() !== '') {
        try {
          parsedTags = JSON.parse(tags);
        } catch (e) {
          console.error('Tags parsing error:', e);
          parsedTags = [];
        }
      }

      // Create upload record
      const upload = new Upload({
        title,
        description,
        student,
        type,
        file: {
          url: file.url,
          publicId: file.publicId,
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType
        },
        subject,
        tags: parsedTags,
        uploadedBy: req.teacher._id
      });

      await upload.save();
      await upload.populate(['student', 'uploadedBy'], 'name email');

      res.status(201).json({
        message: 'Upload record created successfully',
        upload
      });
    } catch (error) {
      console.error('Create upload record error:', error);
      res.status(500).json({ message: 'Server error while creating upload record' });
    }
  },

  // Get all uploads for a student
  getStudentUploads: async (req, res) => {
    try {
      // First verify the student belongs to the authenticated teacher
      const studentExists = await Student.findOne({
        _id: req.params.studentId,
        createdBy: req.teacher._id
      });
      if (!studentExists || !studentExists.isActive) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const { type, page = 1, limit = 10 } = req.query;
      const query = { 
        student: req.params.studentId, 
        isActive: true,
        uploadedBy: req.teacher._id
      };

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
  },

  // Get a specific upload
  getUploadById: async (req, res) => {
    try {
      const upload = await Upload.findOne({
        _id: req.params.id,
        uploadedBy: req.teacher._id
      })
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
  },

  // Update an upload
  updateUpload: async (req, res) => {
    try {
      const { title, description, subject, tags } = req.body;
      const upload = await Upload.findOne({
        _id: req.params.id,
        uploadedBy: req.teacher._id
      });

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
  },

  // Delete an upload
  deleteUpload: async (req, res) => {
    try {
      const upload = await Upload.findOne({
        _id: req.params.id,
        uploadedBy: req.teacher._id
      });

      if (!upload) {
        return res.status(404).json({ message: 'Upload not found' });
      }

      // Delete from Supabase Storage
      if (upload.file.publicId) {
        try {
          await supabaseStorageService.deleteFile(upload.file.publicId);
        } catch (deleteError) {
          console.error('Error deleting file from Supabase Storage:', deleteError);
          // Continue with soft delete even if file deletion fails
        }
      }

      // Soft delete
      upload.isActive = false;
      await upload.save();

      res.json({ message: 'Upload deleted successfully' });
    } catch (error) {
      console.error('Delete upload error:', error);
      res.status(500).json({ message: 'Server error while deleting upload' });
    }
  }
};

module.exports = uploadsController;
