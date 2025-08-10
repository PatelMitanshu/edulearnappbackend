const cloudinary = require('cloudinary').v2;
const Upload = require('../models/Upload');
const Student = require('../models/Student');

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

const uploadsController = {
  // Upload a file for a student
  uploadFile: async (req, res) => {
    try {
      console.log('Upload request body:', req.body);
      console.log('Upload request file:', req.file);

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

      // Determine resource type for Cloudinary based on file mimetype
      let resourceType = 'auto';
      let uploadOptions = {
        resource_type: 'auto',
        folder: `education-app/${type}s`,
        public_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      if (req.file.mimetype.startsWith('video/')) {
        uploadOptions.resource_type = 'video';
      } else if (req.file.mimetype.startsWith('image/')) {
        uploadOptions.resource_type = 'image';
      } else {
        // For documents, use 'raw' type and specify format
        uploadOptions.resource_type = 'raw';
        
        // Extract file extension from original filename for better format detection
        const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
        if (fileExtension) {
          uploadOptions.format = fileExtension;
        }
        
        // Set specific format based on mimetype for better Cloudinary handling
        if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          uploadOptions.format = 'xlsx';
        } else if (req.file.mimetype === 'application/vnd.ms-excel') {
          uploadOptions.format = 'xls';
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          uploadOptions.format = 'docx';
        } else if (req.file.mimetype === 'application/msword') {
          uploadOptions.format = 'doc';
        } else if (req.file.mimetype === 'application/pdf') {
          uploadOptions.format = 'pdf';
        } else if (req.file.mimetype === 'text/csv') {
          uploadOptions.format = 'csv';
        }
      }

      // Upload to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer, uploadOptions);

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
  }
};

module.exports = uploadsController;
