const express = require('express');
const router = express.Router();
const LessonPlan = require('../models/LessonPlan');
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Note: Now using Supabase Storage for file uploads with local fallback
const supabaseStorageService = require('../services/supabaseStorageService');

// Local storage for lesson plan materials (fallback)
const createLocalUpload = async (fileBuffer, originalName, mimeType) => {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    const extension = path.extname(originalName) || '';
    const filename = `${timestamp}-${randomString}${extension}`;
    const filepath = path.join(uploadsDir, filename);
    
    // Save file to local storage
    fs.writeFileSync(filepath, fileBuffer);
    
    // Generate accessible URL
    const baseUrl = process.env.BASE_URL || 'http://192.168.1.3:3000';
    const fileUrl = `${baseUrl}/uploads/documents/${filename}`;
    
    console.log('Document saved locally:', fileUrl);
    
    return {
      secure_url: fileUrl,
      public_id: `local_${timestamp}_${randomString}`,
      original_filename: originalName,
      bytes: fileBuffer.length
    };
  } catch (error) {
    console.error('Local upload failed:', error);
    throw new Error('Local file storage failed');
  }
};

// @route   GET /api/lesson-plans
// @desc    Get all lesson plans for authenticated teacher
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching lesson plans for teacher:', req.user.id);
    
    // Build query object
    const query = {
      teacherId: req.user.id
    };

    // Extract query parameters
    const { date, startDate, endDate, completed, subject, search } = req.query;

    // Filter by specific date
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
      query.date = {
        $gte: targetDate,
        $lt: nextDay
      };
    }

    // Filter by date range
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Filter by completion status
    if (completed !== undefined) {
      query.completed = completed === 'true';
    }

    const lessonPlans = await LessonPlan.find(query)
      .populate('standardId', 'name')
      .sort({ date: 1, startTime: 1 });

    res.json({
      success: true,
      data: lessonPlans,
      count: lessonPlans.length
    });
    
  } catch (error) {
    console.error('Error fetching lesson plans:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lesson plans',
      error: error.message
    });
  }
});

// @route   POST /api/lesson-plans/upload-material
// @desc    Upload material file for lesson plans using Supabase Storage
// @access  Private
const uploadMW = require('../middleware/upload');

router.post('/upload-material', auth, uploadMW.singleWithErrors ? uploadMW.singleWithErrors('file') : uploadMW.single('file'), async (req, res) => {
  try {
    console.log('📚 Lesson plan material upload request...');
    console.log('Material upload request body:', req.body);
    console.log('Material upload request file:', req.file ? 'File present' : 'No file');

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title, type, description } = req.body;

    // Helper: classify resource type for folder organization
    const classifyResourceType = (mimetype) => {
      if (mimetype.startsWith('video/')) return 'videos';
      if (mimetype.startsWith('image/')) return 'images';
      return 'documents';
    };

    const resourceType = classifyResourceType(req.file.mimetype);
    
    try {
      console.log('🔄 Attempting Supabase Storage upload for lesson plan material...');
      
      // Create folder path for lesson plan materials
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substr(2, 9);
      const extension = path.extname(req.file.originalname) || '';
      const fileName = `${timestamp}-${randomString}${extension}`;
      const folderPath = `lesson-materials/${resourceType}/${fileName}`;
      
      // Upload to Supabase Storage
      const uploadResult = await supabaseStorageService.uploadFile(
        req.file.buffer,
        folderPath,
        req.file.mimetype
      );

      console.log('✅ Lesson plan material uploaded to Supabase Storage successfully');

      // Return the uploaded file info
      res.json({
        success: true,
        data: {
          url: uploadResult.url,
          publicId: uploadResult.path,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          title: title,
          type: type
        }
      });

    } catch (supabaseError) {
      console.error('❌ Supabase upload failed for lesson plan material:', supabaseError);
      console.log('🔄 Falling back to local storage...');
      
      // Fallback to local storage
      const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'lesson-materials', resourceType);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substr(2, 9);
      const extension = path.extname(req.file.originalname) || '';
      const fileName = `${timestamp}-${randomString}${extension}`;
      const filepath = path.join(uploadsDir, fileName);
      
      // Save file to local storage
      fs.writeFileSync(filepath, req.file.buffer);
      
      // Generate accessible URL
      const baseUrl = process.env.BASE_URL || 'http://192.168.1.3:3000';
      const fileUrl = `${baseUrl}/uploads/lesson-materials/${resourceType}/${fileName}`;

      console.log('✅ Lesson plan material saved to local storage as fallback');

      // Return the uploaded file info
      res.json({
        success: true,
        data: {
          url: fileUrl,
          publicId: `local_${timestamp}_${randomString}`,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          title: title,
          type: type
        }
      });
    }

  } catch (error) {
    console.error('❌ Error uploading lesson plan material:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading lesson plan material',
      error: error.message
    });
  }
});

module.exports = router;
