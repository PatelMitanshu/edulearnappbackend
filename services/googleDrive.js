const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.init();
  }

  async init() {
    try {
      // Check if required environment variables exist
      if (!process.env.GOOGLE_PROJECT_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        console.error('Missing required Google credentials in environment variables');// Fallback to key file if environment variables are not complete
        if (process.env.GOOGLE_CLOUD_PRIVATE_KEY_FILE && require('fs').existsSync(process.env.GOOGLE_CLOUD_PRIVATE_KEY_FILE)) {const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_CLOUD_PRIVATE_KEY_FILE,
            scopes: ['https://www.googleapis.com/auth/drive.file']
          });
          this.drive = google.drive({ version: 'v3', auth });return;
        }
        
        throw new Error('Google Drive credentials not properly configured');
      }

      // Use service account credentials from environment variables
      const credentials = {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_CLIENT_EMAIL)}`
      };

      const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      this.drive = google.drive({ version: 'v3', auth });} catch (error) {
      console.error('Failed to initialize Google Drive API:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Google Drive
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Name of the file
   * @param {string} folder - Folder name for organization
   * @param {string} mimeType - MIME type of the file
   * @returns {Object} Upload result with file ID and public URL
   */
  async uploadFile(fileBuffer, fileName, folder, mimeType) {
    try {
      if (!this.drive) {
        await this.init();
      }

      // Create or get folder
      const folderId = await this.createOrGetFolder(folder);

      // Create file metadata
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      };

      // Upload the file
      const media = {
        mimeType: mimeType,
        body: require('stream').Readable.from(fileBuffer)
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink'
      });

      // Make the file publicly accessible
      await this.drive.permissions.create({
        fileId: response.data.id,
        resource: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // Get the public URL
      const publicUrl = `https://drive.google.com/uc?id=${response.data.id}&export=download`;
      
      return {
        fileId: response.data.id,
        fileName: fileName,
        url: publicUrl,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink
      };

    } catch (error) {
      console.error('Google Drive upload error:', error);
      throw new Error(`Google Drive upload failed: ${error.message}`);
    }
  }

  /**
   * Create or get a folder in Google Drive
   * @param {string} folderName - Name of the folder
   * @returns {string} Folder ID
   */
  async createOrGetFolder(folderName) {
    try {
      // Search for existing folder
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)'
      });

      if (response.data.files.length > 0) {
        return response.data.files[0].id;
      }

      // Create new folder if not exists
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      const folder = await this.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
      });

      return folder.data.id;
    } catch (error) {
      console.error('Error creating/getting folder:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Google Drive
   * @param {string} fileId - Google Drive file ID
   */
  async deleteFile(fileId) {
    try {
      if (!this.drive) {
        await this.init();
      }

      await this.drive.files.delete({
        fileId: fileId
      });} catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw error;
    }
  }

  /**
   * Check if a file exists in Google Drive
   * @param {string} fileId - Google Drive file ID
   * @returns {boolean} Whether the file exists
   */
  async fileExists(fileId) {
    try {
      if (!this.drive) {
        await this.init();
      }

      await this.drive.files.get({
        fileId: fileId,
        fields: 'id'
      });

      return true;
    } catch (error) {
      if (error.code === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata from Google Drive
   * @param {string} fileId - Google Drive file ID
   * @returns {Object} File metadata
   */
  async getFileMetadata(fileId) {
    try {
      if (!this.drive) {
        await this.init();
      }

      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, size, mimeType, createdTime, modifiedTime, webViewLink, webContentLink'
      });

      return response.data;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Get a shareable URL for a file (for documents that need restricted access)
   * @param {string} fileId - Google Drive file ID
   * @returns {string} Shareable URL
   */
  async getShareableUrl(fileId) {
    try {
      if (!this.drive) {
        await this.init();
      }

      // Get file metadata to get the web view link
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'webViewLink, webContentLink'
      });

      // For documents, return view link; for media, return direct download link
      return response.data.webContentLink || response.data.webViewLink;
    } catch (error) {
      console.error('Error getting shareable URL:', error);
      // Fallback to direct download URL
      return `https://drive.google.com/uc?id=${fileId}&export=download`;
    }
  }
}

// Create and export a singleton instance
const googleDriveService = new GoogleDriveService();
module.exports = googleDriveService;
