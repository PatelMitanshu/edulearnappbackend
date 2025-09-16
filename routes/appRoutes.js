const express = require('express');
const router = express.Router();

// App version configuration
const APP_VERSION_CONFIG = {
  latestVersion: '2.1.0', // Update this when you release a new version
  downloadUrl: 'https://github.com/PatelMitanshu/edufrontend/releases/latest/app-release.apk', // Direct APK download URL
  forceUpdate: false, // Set to true if you want to force users to update
  message: 'A new version of the Education App is available with automatic update notifications and improved performance!',
  minimumSupportedVersion: '2.1.0', // Versions below this will be forced to update
};

// GET /api/app/version - Get current app version info
router.get('/version', async (req, res) => {
  try {
    console.log('Version check requested');
    
    // You can add logic here to dynamically determine force update
    // based on client version, user type, etc.
    const clientVersion = req.query.version || req.headers['app-version'];
    
    let forceUpdate = APP_VERSION_CONFIG.forceUpdate;
    
    // Force update if client version is below minimum supported version
    if (clientVersion && compareVersions(clientVersion, APP_VERSION_CONFIG.minimumSupportedVersion) < 0) {
      forceUpdate = true;
    }
    
    const versionInfo = {
      latestVersion: APP_VERSION_CONFIG.latestVersion,
      downloadUrl: APP_VERSION_CONFIG.downloadUrl,
      forceUpdate: forceUpdate,
      message: APP_VERSION_CONFIG.message,
      minimumSupportedVersion: APP_VERSION_CONFIG.minimumSupportedVersion,
      serverTime: new Date().toISOString(),
    };
    
    res.json(versionInfo);
  } catch (error) {
    console.error('Error getting version info:', error);
    res.status(500).json({ 
      error: 'Failed to get version information',
      latestVersion: '2.1.0', // Fallback version
      forceUpdate: false,
      message: 'Unable to check for updates at this time.'
    });
  }
});

// PUT /api/app/version - Update app version config (admin only)
router.put('/version', async (req, res) => {
  try {
    const { latestVersion, downloadUrl, forceUpdate, message, minimumSupportedVersion } = req.body;
    
    // Simple validation
    if (!latestVersion || !isValidVersion(latestVersion)) {
      return res.status(400).json({ error: 'Invalid version format' });
    }
    
    // Update configuration
    if (latestVersion) APP_VERSION_CONFIG.latestVersion = latestVersion;
    if (downloadUrl) APP_VERSION_CONFIG.downloadUrl = downloadUrl;
    if (typeof forceUpdate === 'boolean') APP_VERSION_CONFIG.forceUpdate = forceUpdate;
    if (message) APP_VERSION_CONFIG.message = message;
    if (minimumSupportedVersion) APP_VERSION_CONFIG.minimumSupportedVersion = minimumSupportedVersion;
    
    console.log('App version config updated:', APP_VERSION_CONFIG);
    
    res.json({ 
      success: true,
      message: 'Version configuration updated successfully',
      config: APP_VERSION_CONFIG
    });
  } catch (error) {
    console.error('Error updating version config:', error);
    res.status(500).json({ error: 'Failed to update version configuration' });
  }
});

// GET /api/app/version/config - Get current version configuration (admin only)
router.get('/version/config', async (req, res) => {
  try {
    res.json(APP_VERSION_CONFIG);
  } catch (error) {
    console.error('Error getting version config:', error);
    res.status(500).json({ error: 'Failed to get version configuration' });
  }
});

// Helper function to compare version strings
function compareVersions(version1, version2) {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part < v2Part) return -1;
    if (v1Part > v2Part) return 1;
  }
  
  return 0;
}

// Helper function to validate version format
function isValidVersion(version) {
  const versionRegex = /^\d+\.\d+\.\d+$/;
  return versionRegex.test(version);
}

module.exports = router;
