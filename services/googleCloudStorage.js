const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize Google Cloud Storage
let storage;
let bucket;

const initializeGCS = () => {
  try {
    // Initialize storage with service account key or application default credentials
    if (process.env.GOOGLE_CLOUD_PRIVATE_KEY_FILE && process.env.GOOGLE_CLOUD_PRIVATE_KEY_FILE !== 'path/to/service-account-key.json') {
      storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_CLOUD_PRIVATE_KEY_FILE,
      });
    } else {
      // For development, use simplified credentials
      storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'educationapp-dev',
      });
    }
    
    bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME || 'educationapp-storage');} catch (error) {
    console.error('Failed to initialize Google Cloud Storage:', error.message);}
};

// Initialize on module load
initializeGCS();

const googleCloudStorage = {
  // Upload file buffer to Google Cloud Storage
  async uploadFile(fileBuffer, fileName, mimeType, folder = '') {
    try {
      if (!bucket) {
        throw new Error('Google Cloud Storage not initialized');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substr(2, 9);
      const extension = path.extname(fileName) || '';
      const baseName = path.basename(fileName, extension);
      const uniqueFileName = `${baseName}-${timestamp}-${randomString}${extension}`;
      
      // Create full path with folder
      const filePath = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;
      
      // Create file in bucket
      const file = bucket.file(filePath);
      
      // Upload the buffer
      await file.save(fileBuffer, {
        metadata: {
          contentType: mimeType,
          cacheControl: 'public, max-age=31536000', // 1 year cache
        },
        resumable: false, // For small files, use simple upload
      });

      // Make file publicly readable if it's an image or video
      if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
        await file.makePublic();
      }

      // Generate public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      
      // Generate signed URL for private files (documents)
      let signedUrl = null;
      if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        });
        signedUrl = url;
      }return {
        success: true,
        data: {
          url: signedUrl || publicUrl,
          publicUrl: publicUrl,
          signedUrl: signedUrl,
          filePath: filePath,
          fileName: uniqueFileName,
          originalName: fileName,
          mimeType: mimeType,
          size: fileBuffer.length,
          bucket: bucket.name,
        }
      };
    } catch (error) {
      console.error('GCS upload failed:', error.message);
      throw error;
    }
  },

  // Generate a new signed URL for existing file
  async getSignedUrl(filePath, action = 'read', expiresInHours = 24) {
    try {
      if (!bucket) {
        throw new Error('Google Cloud Storage not initialized');
      }

      const file = bucket.file(filePath);
      const [url] = await file.getSignedUrl({
        action: action,
        expires: Date.now() + expiresInHours * 60 * 60 * 1000,
      });

      return url;
    } catch (error) {
      console.error('Failed to generate signed URL:', error.message);
      throw error;
    }
  },

  // Delete file from Google Cloud Storage
  async deleteFile(filePath) {
    try {
      if (!bucket) {
        throw new Error('Google Cloud Storage not initialized');
      }

      const file = bucket.file(filePath);
      await file.delete();return true;
    } catch (error) {
      console.error('Failed to delete file from GCS:', error.message);
      return false;
    }
  },

  // Check if file exists
  async fileExists(filePath) {
    try {
      if (!bucket) {
        return false;
      }

      const file = bucket.file(filePath);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      console.error('Failed to check file existence:', error.message);
      return false;
    }
  },

  // Get file metadata
  async getFileMetadata(filePath) {
    try {
      if (!bucket) {
        throw new Error('Google Cloud Storage not initialized');
      }

      const file = bucket.file(filePath);
      const [metadata] = await file.getMetadata();
      return metadata;
    } catch (error) {
      console.error('Failed to get file metadata:', error.message);
      throw error;
    }
  }
};

module.exports = googleCloudStorage;
