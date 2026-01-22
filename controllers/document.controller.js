const Document = require('../models/Document');
const Folder = require('../models/Folder');
const { validationResult } = require('express-validator');
const { uploadToCloudinary, deleteFromCloudinary, getFileType, getThumbnailUrl } = require('../utils/cloudinary');
const { Op } = require('sequelize');

/**
 * GET /documents
 * Get list of documents with filters
 */
exports.getDocuments = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { folder_id, page = 1, limit = 20, is_public } = req.query;
    const teacher_id = req.user.id;

    const where = { teacher_id };

    if (folder_id) {
      where.folder_id = folder_id === 'null' ? null : folder_id;
    }

    if (is_public !== undefined) {
      where.is_public = is_public === 'true';
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Document.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        documents: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve documents'
      }
    });
  }
};

/**
 * GET /documents/:id
 * Get document details
 */
exports.getDocumentById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const teacher_id = req.user.id;

    const document = await Document.findOne({
      where: { id, teacher_id },
      include: [
        {
          model: Folder,
          as: 'folder',
          attributes: ['id', 'name', 'color']
        }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found'
        }
      });
    }

    // Increment view count
    document.view_count += 1;
    await document.save();

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Get document by id error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve document'
      }
    });
  }
};

/**
 * POST /documents/upload
 * Upload new document to Cloudinary
 */
exports.uploadDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded'
        }
      });
    }

    const { name, folder_id, is_public = false, subject, grade, tags, description } = req.body;
    const teacher_id = req.user.id;
    const file = req.file;

    // Validate folder if provided
    if (folder_id) {
      const folder = await Folder.findOne({
        where: { id: folder_id, teacher_id }
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FOLDER_NOT_FOUND',
            message: 'Folder not found'
          }
        });
      }
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      file.buffer,
      teacher_id,
      file.originalname
    );

    // Create document record
    const document = await Document.create({
      teacher_id,
      folder_id: folder_id || null,
      name,
      description: description || null,
      type: getFileType(file.mimetype),
      file_url: uploadResult.url,
      cloudinary_id: uploadResult.cloudinary_id,
      file_size: uploadResult.bytes,
      mime_type: file.mimetype,
      original_filename: file.originalname,
      is_public: is_public === 'true' || is_public === true,
      subject: subject || null,
      grade: grade ? parseInt(grade) : null,
      tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : []
    });

    // Update folder item_count
    if (folder_id) {
      await Folder.increment('item_count', {
        where: { id: folder_id, teacher_id }
      });
    }

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Upload document error:', error);
    
    // Clean up Cloudinary upload if database save failed
    if (req.cloudinaryResult) {
      await deleteFromCloudinary(req.cloudinaryResult.cloudinary_id).catch(err => {
        console.error('Cleanup cloudinary error:', err);
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'Failed to upload document'
      }
    });
  }
};

/**
 * PUT /documents/:id
 * Update document metadata
 */
exports.updateDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, subject, grade, tags } = req.body;
    const teacher_id = req.user.id;

    const document = await Document.findOne({
      where: { id, teacher_id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found'
        }
      });
    }

    if (name) document.name = name;
    if (description !== undefined) document.description = description;
    if (subject !== undefined) document.subject = subject;
    if (grade !== undefined) document.grade = grade ? parseInt(grade) : null;
    if (tags) document.tags = tags;

    await document.save();

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update document'
      }
    });
  }
};

/**
 * DELETE /documents/:id
 * Delete document from database and Cloudinary
 */
exports.deleteDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const teacher_id = req.user.id;

    const document = await Document.findOne({
      where: { id, teacher_id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found'
        }
      });
    }

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(document.cloudinary_id);
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Update folder item_count
    if (document.folder_id) {
      await Folder.decrement('item_count', {
        where: { id: document.folder_id, teacher_id }
      });
    }

    // Delete from database
    await document.destroy();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete document'
      }
    });
  }
};

/**
 * POST /documents/:id/move
 * Move document to different folder
 */
exports.moveDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { folder_id } = req.body;
    const teacher_id = req.user.id;

    const document = await Document.findOne({
      where: { id, teacher_id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found'
        }
      });
    }

    // Validate new folder if provided
    if (folder_id) {
      const folder = await Folder.findOne({
        where: { id: folder_id, teacher_id }
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FOLDER_NOT_FOUND',
            message: 'Folder not found'
          }
        });
      }
    }

    const oldFolderId = document.folder_id;

    // Update document
    document.folder_id = folder_id || null;
    await document.save();

    // Update item counts
    if (oldFolderId) {
      await Folder.decrement('item_count', {
        where: { id: oldFolderId, teacher_id }
      });
    }

    if (folder_id) {
      await Folder.increment('item_count', {
        where: { id: folder_id, teacher_id }
      });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Move document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to move document'
      }
    });
  }
};

/**
 * POST /documents/:id/share
 * Toggle document public/private status
 */
exports.shareDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { is_public } = req.body;
    const teacher_id = req.user.id;

    const document = await Document.findOne({
      where: { id, teacher_id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found'
        }
      });
    }

    document.is_public = is_public;
    await document.save();

    res.json({
      success: true,
      data: document,
      message: `Document is now ${is_public ? 'public' : 'private'}`
    });
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update document sharing status'
      }
    });
  }
};
