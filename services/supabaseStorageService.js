const supabase = require('../config/supabase');

class SupabaseStorageService {
  constructor() {
    this.bucketName = process.env.SUPABASE_BUCKET_NAME || 'education-app-uploads';
  }

  /**
   * Upload a file to Supabase Storage
   * @param {Buffer} fileBuffer - The file buffer
   * @param {string} filePath - The path where the file should be stored
   * @param {string} mimeType - The MIME type of the file
   * @returns {Promise<{url: string, path: string}>}
   */
  async uploadFile(fileBuffer, filePath, mimeType) {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        url: publicUrlData.publicUrl,
        path: filePath,
        publicId: filePath
      };
    } catch (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Supabase Storage
   * @param {string} filePath - The path of the file to delete
   * @returns {Promise<boolean>}
   */
  async deleteFile(filePath) {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file from Supabase:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Supabase delete error:', error);
      return false;
    }
  }

  /**
   * Upload profile picture
   * @param {Buffer} fileBuffer - The file buffer
   * @param {string} userId - The user ID
   * @param {string} userType - 'teacher' or 'student'
   * @param {string} originalName - Original filename
   * @param {string} mimeType - MIME type
   * @returns {Promise<{url: string, path: string}>}
   */
  async uploadProfilePicture(fileBuffer, userId, userType, originalName, mimeType) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    const extension = originalName.split('.').pop() || 'jpg';
    const filePath = `profiles/${userType}s/${userId}/${timestamp}-${randomString}.${extension}`;
    
    return this.uploadFile(fileBuffer, filePath, mimeType);
  }

  /**
   * Upload student document/media
   * @param {Buffer} fileBuffer - The file buffer
   * @param {string} studentId - The student ID
   * @param {string} teacherId - The teacher ID
   * @param {string} type - Upload type (video, document, image)
   * @param {string} originalName - Original filename
   * @param {string} mimeType - MIME type
   * @returns {Promise<{url: string, path: string}>}
   */
  async uploadStudentFile(fileBuffer, studentId, teacherId, type, originalName, mimeType) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    const extension = originalName.split('.').pop() || 'file';
    const filePath = `student-uploads/${teacherId}/${studentId}/${type}/${timestamp}-${randomString}.${extension}`;
    
    return this.uploadFile(fileBuffer, filePath, mimeType);
  }

  /**
   * Get file URL
   * @param {string} filePath - The file path
   * @returns {string}
   */
  getFileUrl(filePath) {
    const { data } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  /**
   * Create a signed URL for private files
   * @param {string} filePath - The file path
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {Promise<string>}
   */
  async createSignedUrl(filePath, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseStorageService();
