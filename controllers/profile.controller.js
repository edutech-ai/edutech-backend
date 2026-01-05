const UserProfile = require('../models/UserProfile');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const { deleteLocalFile } = require('../middlewares/upload');

class ProfileController {
  static async getMyProfile(req, res) {
    try {
      const profile = await UserProfile.findFullProfileByUserId(req.user.id);
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }

  static async createProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const existingProfile = await UserProfile.findByUserId(req.user.id);
      if (existingProfile) {
        return res.status(409).json({
          success: false,
          message: 'Profile already exists'
        });
      }

      const profileData = {
        name: req.body.name,
        date_of_birth: req.body.date_of_birth,
        gender: req.body.gender,
        avatar_url: req.body.avatar_url,
        address: req.body.address,
        email_notification: req.body.email_notification,
        push_notification: req.body.push_notification
      };

      const profile = await UserProfile.create(req.user.id, profileData);

      res.status(201).json({
        success: true,
        message: 'Profile created successfully',
        data: profile
      });
    } catch (error) {
      console.error('Create profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create profile',
        error: error.message
      });
    }
  }

  static async updateProfile(req, res) {
    let uploadedUrl = null;

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;

      // Nếu có file avatar được upload
      if (req.file) {
        // Upload lên Cloudinary
        const result = await uploadImage(req.file, 'edutech/avatars');
        uploadedUrl = result.url;

        // Xóa file local
        deleteLocalFile(req.file.path);

        // Lấy profile hiện tại để xóa avatar cũ
        const currentProfile = await UserProfile.findByUserId(userId);
        
        // Nếu có avatar cũ từ Cloudinary, xóa đi
        if (currentProfile && currentProfile.avatar_url) {
          const oldPublicId = extractPublicId(currentProfile.avatar_url);
          if (oldPublicId) {
            await deleteImage(oldPublicId).catch(err => 
              console.log('Could not delete old avatar:', err.message)
            );
          }
        }
      }

      const existingProfile = await UserProfile.findByUserId(userId);
      
      // Helper: Convert string to boolean (for form-data)
      const toBoolean = (value) => {
        if (value === undefined || value === null) return undefined;
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return undefined;
      };

      const profileData = {
        name: req.body.name,
        date_of_birth: req.body.date_of_birth,
        gender: req.body.gender,
        avatar_url: uploadedUrl || req.body.avatar_url, // Ưu tiên file upload
        address: req.body.address,
        email_notification: toBoolean(req.body.email_notification),
        push_notification: toBoolean(req.body.push_notification)
      };

      if (!existingProfile) {
        const newProfile = await UserProfile.create(userId, profileData);
        
        return res.status(201).json({
          success: true,
          message: 'Profile created successfully',
          data: newProfile
        });
      }

      const updatedProfile = await UserProfile.update(userId, profileData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile
      });
    } catch (error) {
      // Xóa file local nếu có lỗi
      if (req.file) {
        deleteLocalFile(req.file.path);
      }

      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }

  static async deleteProfile(req, res) {
    try {
      const existingProfile = await UserProfile.findByUserId(req.user.id);
      if (!existingProfile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      await UserProfile.delete(req.user.id);

      res.json({
        success: true,
        message: 'Profile deleted successfully'
      });
    } catch (error) {
      console.error('Delete profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete profile',
        error: error.message
      });
    }
  }

  static async getProfileById(req, res) {
    try {
      const { userId } = req.params;

      const profile = await UserProfile.findFullProfileByUserId(userId);
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      delete profile.email_notification;
      delete profile.push_notification;

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Get profile by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }
}

// Helper: Extract public ID from Cloudinary URL
function extractPublicId(url) {
  try {
    if (!url || !url.includes('cloudinary.com')) {
      return null;
    }
    
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    // Get everything after /upload/ (skip version if exists)
    const afterUpload = parts.slice(uploadIndex + 1).join('/');
    
    // Remove version if starts with v + digits
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    
    // Remove file extension
    const publicId = withoutVersion.replace(/\.[^.]+$/, '');
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
}

module.exports = ProfileController;
