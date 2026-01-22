const Document = require('../models/Document');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * GET /library/public
 * Get all public documents (simplified version - quizzes handled separately)
 */
exports.getPublicLibrary = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      subject,
      grade,
      search
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { is_public: true };

    if (subject) where.subject = subject;
    if (grade) where.grade = parseInt(grade);

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Document.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    const items = rows.map(doc => ({
      id: doc.id,
      type: 'document',
      title: doc.name,
      description: doc.description,
      subject: doc.subject,
      grade: doc.grade,
      file_url: doc.file_url,
      file_type: doc.type,
      file_size: doc.file_size,
      tags: doc.tags,
      is_public: doc.is_public,
      download_count: doc.download_count,
      view_count: doc.view_count,
      teacher_id: doc.teacher_id,
      created_at: doc.created_at
    }));

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get public library error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve public library'
      }
    });
  }
};

/**
 * GET /library/public/documents
 * Get only public documents
 */
exports.getPublicDocuments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      subject,
      grade,
      search
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { is_public: true };

    if (subject) where.subject = subject;
    if (grade) where.grade = parseInt(grade);

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

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
    console.error('Get public documents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve public documents'
      }
    });
  }
};

/**
 * GET /library/public/quizzes
 * Get only public quizzes - TODO: Implement when Quiz model uses Sequelize
 */
exports.getPublicQuizzes = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        quizzes: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          total_pages: 0
        }
      },
      message: 'Quiz library endpoint coming soon'
    });
  } catch (error) {
    console.error('Get public quizzes error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve public quizzes'
      }
    });
  }
};

/**
 * GET /library/public/search
 * Search in public library (documents only for now)
 */
exports.searchPublicLibrary = async (req, res) => {
  try {
    const {
      q,
      page = 1,
      limit = 20,
      subject,
      grade
    } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query is required'
        }
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchTerm = q.trim();

    const documentWhere = {
      is_public: true,
      [Op.or]: [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } },
        { original_filename: { [Op.like]: `%${searchTerm}%` } }
      ]
    };

    if (subject) documentWhere.subject = subject;
    if (grade) documentWhere.grade = parseInt(grade);

    const { count, rows } = await Document.findAndCountAll({
      where: documentWhere,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    const items = rows.map(doc => ({
      id: doc.id,
      type: 'document',
      title: doc.name,
      description: doc.description,
      subject: doc.subject,
      grade: doc.grade,
      file_url: doc.file_url,
      file_type: doc.type,
      tags: doc.tags,
      teacher_id: doc.teacher_id,
      created_at: doc.created_at
    }));

    res.json({
      success: true,
      data: {
        query: searchTerm,
        items,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Search public library error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to search public library'
      }
    });
  }
};
