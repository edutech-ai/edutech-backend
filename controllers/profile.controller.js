const UserProfile = require('../models/UserProfile');
const User = require('../models/User');
const { validationResult } = require('express-validator');

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
        avatar_url: req.body.avatar_url,
        address: req.body.address,
        email_notification: toBoolean(req.body.email_notification),
        push_notification: toBoolean(req.body.push_notification)
      };

      // Update subject trong users table nếu có
      if (req.body.subject !== undefined) {
        const User = require('../models/User');
        await User.update(userId, { subject: req.body.subject });
      }

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

module.exports = ProfileController;
