const express = require('express');
const router = express.Router();

const APP_VERSION_CONFIG = {
  latestVersion: '2.2.0',
  downloadUrl: 'https://edulearnappbackend.onrender.com/downloads/edulearn-v2.2.0.apk',
  forceUpdate: false,
  message: 'New version available with enhanced update system!',
  minimumSupportedVersion: '2.2.0'
};

router.get('/version', async (req, res) => {
  try {
    console.log('Version check requested');
    res.json({
      latestVersion: APP_VERSION_CONFIG.latestVersion,
      downloadUrl: APP_VERSION_CONFIG.downloadUrl,
      forceUpdate: APP_VERSION_CONFIG.forceUpdate,
      message: APP_VERSION_CONFIG.message,
      minimumSupportedVersion: APP_VERSION_CONFIG.minimumSupportedVersion,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting version info:', error);
    res.status(500).json({ 
      error: 'Failed to get version information',
      latestVersion: '2.2.0',
      forceUpdate: false,
      message: 'Unable to check for updates at this time.'
    });
  }
});

module.exports = router;