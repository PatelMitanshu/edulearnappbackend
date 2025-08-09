const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Upload profile picture
router.post('/upload-profile-picture', auth, upload.single('profilePicture'), profileController.uploadProfilePicture);

// Delete profile picture
router.delete('/profile-picture', auth, profileController.deleteProfilePicture);

// Get teacher profile
router.get('/profile', auth, profileController.getProfile);

// Update teacher profile
router.put('/profile', auth, profileController.updateProfile);

// Change password
router.put('/change-password', auth, profileController.changePassword);

// Get profile settings/preferences
router.get('/settings', auth, profileController.getSettings);

// Update profile settings/preferences
router.put('/settings', auth, profileController.updateSettings);

module.exports = router;
