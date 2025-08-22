const Teacher = require('../models/Teacher');
const bcrypt = require('bcryptjs');
const supabaseStorageService = require('../services/supabaseStorageService');

const profileController = {
  // Upload profile picture
  uploadProfilePicture: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Upload to Supabase Storage
      const uploadResult = await supabaseStorageService.uploadProfilePicture(
        req.file.buffer,
        req.user.id,
        'teacher',
        req.file.originalname,
        req.file.mimetype
      );

      // Update teacher profile with new picture URL
      const teacher = await Teacher.findByIdAndUpdate(
        req.user.id,
        { profilePicture: uploadResult.url },
        { new: true, runValidators: true }
      ).select('-password');

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          profilePicture: uploadResult.url,
          teacher: {
            id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            phone: teacher.phone || '',
            school: teacher.school || '',
            subject: teacher.subject || '',
            profilePicture: teacher.profilePicture,
            role: teacher.role,
            isActive: teacher.isActive,
            createdAt: teacher.createdAt,
            updatedAt: teacher.updatedAt,
            lastLogin: teacher.lastLogin
          }
        }
      });
    } catch (error) {
      console.error('Upload profile picture error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while uploading profile picture'
      });
    }
  },

  // Delete profile picture
  deleteProfilePicture: async (req, res) => {
    try {
      const teacher = await Teacher.findById(req.user.id);
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }

      // Delete from Supabase Storage if exists
      if (teacher.profilePicture) {
        try {
          // Extract the file path from the URL
          const url = new URL(teacher.profilePicture);
          const pathSegments = url.pathname.split('/');
          // Remove the first empty segment and the bucket name segment
          const filePath = pathSegments.slice(3).join('/');
          
          await supabaseStorageService.deleteFile(filePath);
        } catch (deleteError) {
          console.error('Error deleting from Supabase Storage:', deleteError);
          // Continue anyway as we still want to remove from database
        }
      }

      // Remove from database
      teacher.profilePicture = null;
      await teacher.save();

      res.json({
        success: true,
        message: 'Profile picture removed successfully',
        data: {
          teacher: {
            id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            phone: teacher.phone || '',
            school: teacher.school || '',
            subject: teacher.subject || '',
            profilePicture: teacher.profilePicture,
            role: teacher.role,
            isActive: teacher.isActive,
            createdAt: teacher.createdAt,
            updatedAt: teacher.updatedAt,
            lastLogin: teacher.lastLogin
          }
        }
      });
    } catch (error) {
      console.error('Delete profile picture error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while deleting profile picture'
      });
    }
  },

  // Get teacher profile
  getProfile: async (req, res) => {
    try {
      const teacher = await Teacher.findById(req.user.id).select('-password');
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }

      res.json({
        success: true,
        data: {
          teacher: {
            id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            phone: teacher.phone || '',
            school: teacher.school || '',
            subject: teacher.subject || '',
            profilePicture: teacher.profilePicture,
            role: teacher.role,
            isActive: teacher.isActive,
            createdAt: teacher.createdAt,
            updatedAt: teacher.updatedAt,
            lastLogin: teacher.lastLogin
          }
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching profile'
      });
    }
  },

  // Update teacher profile
  updateProfile: async (req, res) => {
    try {
      const { name, email, phone, school, subject } = req.body;
      
      // Validation
      const updates = {};
      if (name !== undefined) {
        if (!name.trim() || name.length < 2 || name.length > 50) {
          return res.status(400).json({
            success: false,
            message: 'Name must be between 2 and 50 characters'
          });
        }
        updates.name = name.trim();
      }
      
      if (email !== undefined) {
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            message: 'Please enter a valid email address'
          });
        }
        
        // Check if email is already taken by another user
        const existingTeacher = await Teacher.findOne({ 
          email: email.toLowerCase(),
          _id: { $ne: req.user.id }
        });
        
        if (existingTeacher) {
          return res.status(400).json({
            success: false,
            message: 'Email is already registered with another account'
          });
        }
        
        updates.email = email.toLowerCase();
      }
      
      if (phone !== undefined) {
        if (phone.trim() && (phone.length < 10 || phone.length > 15)) {
          return res.status(400).json({
            success: false,
            message: 'Phone number must be between 10 and 15 characters'
          });
        }
        updates.phone = phone.trim();
      }
      
      if (school !== undefined) {
        if (school.length > 100) {
          return res.status(400).json({
            success: false,
            message: 'School name cannot exceed 100 characters'
          });
        }
        updates.school = school.trim();
      }
      
      if (subject !== undefined) {
        if (subject.length > 50) {
          return res.status(400).json({
            success: false,
            message: 'Subject cannot exceed 50 characters'
          });
        }
        updates.subject = subject.trim();
      }

      // Update teacher profile
      const updatedTeacher = await Teacher.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true, runValidators: true }
      ).select('-password');

      if (!updatedTeacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          teacher: {
            id: updatedTeacher._id,
            name: updatedTeacher.name,
            email: updatedTeacher.email,
            phone: updatedTeacher.phone || '',
            school: updatedTeacher.school || '',
            subject: updatedTeacher.subject || '',
            profilePicture: updatedTeacher.profilePicture,
            role: updatedTeacher.role,
            isActive: updatedTeacher.isActive,
            createdAt: updatedTeacher.createdAt,
            updatedAt: updatedTeacher.updatedAt,
            lastLogin: updatedTeacher.lastLogin
          }
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.name === 'ValidationError') {
        const errorMessage = Object.values(error.errors)[0].message;
        return res.status(400).json({
          success: false,
          message: errorMessage
        });
      }
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error while updating profile'
      });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'All password fields are required'
        });
      }
      
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password and confirm password do not match'
        });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long'
        });
      }
      
      // Get teacher with password
      const teacher = await Teacher.findById(req.user.id).select('+password');
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }
      
      // Check current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, teacher.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Update password
      teacher.password = newPassword;
      await teacher.save();
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
      
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while changing password'
      });
    }
  },

  // Get profile settings/preferences
  getSettings: async (req, res) => {
    try {
      const teacher = await Teacher.findById(req.user.id).select('settings');
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }

      const defaultSettings = {
        notifications: {
          email: true,
          push: true,
          studentUpdates: true,
          systemAlerts: true
        },
        privacy: {
          profileVisibility: 'private',
          shareData: false
        },
        appearance: {
          theme: 'light',
          language: 'en'
        },
        backup: {
          autoBackup: true,
          backupFrequency: 'weekly'
        }
      };

      res.json({
        success: true,
        data: {
          settings: teacher.settings || defaultSettings
        }
      });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching settings'
      });
    }
  },

  // Update profile settings/preferences
  updateSettings: async (req, res) => {
    try {
      const { settings } = req.body;
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Settings object is required'
        });
      }
      console.log('Settings data:', JSON.stringify(settings, null, 2));

      const updatedTeacher = await Teacher.findByIdAndUpdate(
        req.user.id,
        { settings },
        { new: true, runValidators: true }
      ).select('settings');

      if (!updatedTeacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: {
          settings: updatedTeacher.settings
        }
      });
    } catch (error) {
      console.error('Update settings error:', error);
      
      if (error.name === 'ValidationError') {
        console.error('Validation error details:', error.errors);
        const errorMessages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessages.join(', ')}`
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error while updating settings'
      });
    }
  }
};

module.exports = profileController;
