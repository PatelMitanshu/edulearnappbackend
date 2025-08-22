const express = require('express');
const router = express.Router();
const LessonPlan = require('../models/LessonPlan');
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Note: Now using Supabase Storage for file uploads with local fallback
const supabaseStorageService = require('../services/supabaseStorageService');

// Helper function to extract file path from Supabase URL
const extractFilePathFromUrl = (url) => {
  try {
    if (!url || typeof url !== 'string') return null;
    
    // Check if it's a Supabase Storage URL
    const supabaseStoragePattern = /\/storage\/v1\/object\/public\/[^\/]+\/(.+)$/;
    const match = url.match(supabaseStoragePattern);
    
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    return null;
  }
};

// Helper function to delete files from lesson plan materials
const deleteFilesFromMaterials = async (materials) => {
  if (!materials || !Array.isArray(materials)) return;
  
  const deletePromises = [];
  
  for (const material of materials) {
    // Delete files for photo, video, and document types
    if ((material.type === 'photo' || material.type === 'video' || material.type === 'document') && material.content) {
      const filePath = extractFilePathFromUrl(material.content);
      if (filePath) {
        deletePromises.push(
          supabaseStorageService.deleteFile(filePath).catch(error => {
            console.error('Failed to delete file:', filePath, error);
          })
        );
      }
    }
  }
  
  if (deletePromises.length > 0) {
    await Promise.all(deletePromises);
  }
};

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

// @route   POST /api/lesson-plans
// @desc    Create new lesson plan
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      subject,
      topic,
      date,
      startTime,
      duration,
      description,
      materials,
      standardId,
      tags
    } = req.body;

    // Validate required fields
    if (!subject || !topic || !date || !startTime || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subject, topic, date, startTime, duration'
      });
    }

    // Create new lesson plan
    const lessonPlan = new LessonPlan({
      teacherId: req.user.id,
      subject,
      topic,
      date: new Date(date),
      startTime,
      duration,
      description: description || '',
      materials: materials || [],
      standardId: standardId || undefined,
      tags: tags || []
    });

    const savedLessonPlan = await lessonPlan.save();
    
    // Populate standardId for response
    await savedLessonPlan.populate('standardId', 'name');
    res.status(201).json({
      success: true,
      data: savedLessonPlan,
      message: 'Lesson plan created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating lesson plan:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating lesson plan',
      error: error.message
    });
  }
});

// @route   PUT /api/lesson-plans/:id
// @desc    Update lesson plan
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const lessonPlanId = req.params.id;
    const {
      subject,
      topic,
      date,
      startTime,
      duration,
      description,
      materials,
      completed,
      standardId,
      tags
    } = req.body;

    // Find the lesson plan and verify ownership
    const lessonPlan = await LessonPlan.findById(lessonPlanId);
    
    if (!lessonPlan) {
      return res.status(404).json({
        success: false,
        message: 'Lesson plan not found'
      });
    }

    // Verify the lesson plan belongs to the authenticated teacher
    if (lessonPlan.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this lesson plan'
      });
    }

    // Handle file cleanup when materials are updated
    if (materials !== undefined) {
      const oldMaterials = lessonPlan.materials || [];
      const newMaterials = materials || [];
      
      // Find materials that are being removed (exist in old but not in new)
      const removedMaterials = oldMaterials.filter(oldMaterial => {
        // Check if this material still exists in the new materials
        return !newMaterials.some(newMaterial => 
          newMaterial.content === oldMaterial.content && 
          newMaterial.type === oldMaterial.type
        );
      });
      
      if (removedMaterials.length > 0) {
        await deleteFilesFromMaterials(removedMaterials);
      }
    }

    // Prepare update object
    const updateData = {};
    if (subject !== undefined) updateData.subject = subject;
    if (topic !== undefined) updateData.topic = topic;
    if (date !== undefined) updateData.date = new Date(date);
    if (startTime !== undefined) updateData.startTime = startTime;
    if (duration !== undefined) updateData.duration = duration;
    if (description !== undefined) updateData.description = description;
    if (materials !== undefined) updateData.materials = materials;
    if (standardId !== undefined) updateData.standardId = standardId;
    if (tags !== undefined) updateData.tags = tags;
    
    // Handle completion status
    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.completedAt = completed ? new Date() : null;
    }

    // Update the lesson plan
    const updatedLessonPlan = await LessonPlan.findByIdAndUpdate(
      lessonPlanId,
      updateData,
      { new: true, runValidators: true }
    ).populate('standardId', 'name');
    res.json({
      success: true,
      data: updatedLessonPlan,
      message: 'Lesson plan updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating lesson plan:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating lesson plan',
      error: error.message
    });
  }
});

// @route   DELETE /api/lesson-plans/:id
// @desc    Delete lesson plan
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const lessonPlanId = req.params.id;

    // Find the lesson plan and verify ownership
    const lessonPlan = await LessonPlan.findById(lessonPlanId);
    
    if (!lessonPlan) {
      return res.status(404).json({
        success: false,
        message: 'Lesson plan not found'
      });
    }

    // Verify the lesson plan belongs to the authenticated teacher
    if (lessonPlan.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this lesson plan'
      });
    }

    // Delete associated files from Supabase Storage before deleting the lesson plan
    await deleteFilesFromMaterials(lessonPlan.materials);

    // Delete the lesson plan
    await LessonPlan.findByIdAndDelete(lessonPlanId);
    res.json({
      success: true,
      message: 'Lesson plan deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting lesson plan:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting lesson plan',
      error: error.message
    });
  }
});

// @route   GET /api/lesson-plans/today
// @desc    Get today's lesson plans for authenticated teacher
// @access  Private
router.get('/today', auth, async (req, res) => {
  try {
    const todaysLessons = await LessonPlan.getTodaysLessons(req.user.id);

    res.json({
      success: true,
      data: todaysLessons,
      count: todaysLessons.length
    });

  } catch (error) {
    console.error('❌ Error fetching today\'s lesson plans:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching today\'s lesson plans',
      error: error.message
    });
  }
});

// @route   GET /api/lesson-plans/:id
// @desc    Get specific lesson plan by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const lessonPlanId = req.params.id;

    // Find the lesson plan and verify ownership
    const lessonPlan = await LessonPlan.findById(lessonPlanId)
      .populate('standardId', 'name');
    
    if (!lessonPlan) {
      return res.status(404).json({
        success: false,
        message: 'Lesson plan not found'
      });
    }

    // Verify the lesson plan belongs to the authenticated teacher
    if (lessonPlan.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this lesson plan'
      });
    }
    res.json({
      success: true,
      data: lessonPlan
    });

  } catch (error) {
    console.error('❌ Error fetching lesson plan:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lesson plan',
      error: error.message
    });
  }
});

// @route   PATCH /api/lesson-plans/:id/toggle-completion
// @desc    Toggle completion status for a lesson plan
// @access  Private
router.patch('/:id/toggle-completion', auth, async (req, res) => {
  try {
    const lessonPlanId = req.params.id;

    const lessonPlan = await LessonPlan.findById(lessonPlanId);
    if (!lessonPlan) {
      return res.status(404).json({ success: false, message: 'Lesson plan not found' });
    }

    // Verify ownership
    if (lessonPlan.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this lesson plan' });
    }

    // Toggle completed flag and set completedAt accordingly
    lessonPlan.completed = !lessonPlan.completed;
    lessonPlan.completedAt = lessonPlan.completed ? new Date() : null;

    const saved = await lessonPlan.save();
    await saved.populate('standardId', 'name');

    res.json({
      success: true,
      data: {
        id: saved._id,
        completed: saved.completed,
        completedAt: saved.completedAt
      },
      message: 'Lesson plan completion toggled'
    });

  } catch (error) {
    console.error('❌ Error toggling lesson plan completion:', error);
    res.status(500).json({ success: false, message: 'Server error while toggling completion', error: error.message });
  }
});

// @route   DELETE /api/lesson-plans/:id/material
// @desc    Delete a specific material file from lesson plan and Supabase Storage
// @access  Private
router.delete('/:id/material', auth, async (req, res) => {
  try {
    const lessonPlanId = req.params.id;
    const { materialIndex, materialContent } = req.body;

    // Validate required fields
    if (materialIndex === undefined && !materialContent) {
      return res.status(400).json({
        success: false,
        message: 'Either materialIndex or materialContent is required'
      });
    }

    // Find the lesson plan and verify ownership
    const lessonPlan = await LessonPlan.findById(lessonPlanId);
    
    if (!lessonPlan) {
      return res.status(404).json({
        success: false,
        message: 'Lesson plan not found'
      });
    }

    // Verify the lesson plan belongs to the authenticated teacher
    if (lessonPlan.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this lesson plan'
      });
    }

    let materialToDelete = null;
    let updatedMaterials = [...lessonPlan.materials];

    // Find and remove the material
    if (materialIndex !== undefined && materialIndex >= 0 && materialIndex < updatedMaterials.length) {
      materialToDelete = updatedMaterials[materialIndex];
      updatedMaterials.splice(materialIndex, 1);
    } else if (materialContent) {
      const index = updatedMaterials.findIndex(material => material.content === materialContent);
      if (index !== -1) {
        materialToDelete = updatedMaterials[index];
        updatedMaterials.splice(index, 1);
      }
    }

    if (!materialToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Material not found in lesson plan'
      });
    }

    // Delete the file from Supabase Storage if it's a file (photo, video, or document)
    if ((materialToDelete.type === 'photo' || materialToDelete.type === 'video' || materialToDelete.type === 'document') && materialToDelete.content) {
      const filePath = extractFilePathFromUrl(materialToDelete.content);
      if (filePath) {
        const deleteSuccess = await supabaseStorageService.deleteFile(filePath);
      }
    }

    // Update the lesson plan with the new materials array
    const updatedLessonPlan = await LessonPlan.findByIdAndUpdate(
      lessonPlanId,
      { materials: updatedMaterials },
      { new: true, runValidators: true }
    ).populate('standardId', 'name');

    res.json({
      success: true,
      data: updatedLessonPlan,
      message: 'Material deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting material:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting material',
      error: error.message
    });
  }
});

module.exports = router;
