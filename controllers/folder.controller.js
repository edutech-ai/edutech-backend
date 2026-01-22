const Folder = require('../models/Folder');
const Document = require('../models/Document');
const { validationResult } = require('express-validator');
const { MAX_FOLDER_DEPTH } = require('../middlewares/folder.validator');
const { Op } = require('sequelize');

/**
 * GET /folders
 * Get folders by parent_id
 */
exports.getFolders = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { parent_id } = req.query;
    const teacher_id = req.user.id;

    const folders = await Folder.findAll({
      where: {
        teacher_id,
        parent_id: parent_id === 'null' || !parent_id ? null : parent_id
      },
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'color', 'parent_id', 'depth', 'item_count', 'created_at', 'updated_at']
    });

    res.json({
      success: true,
      data: folders
    });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve folders'
      }
    });
  }
};

/**
 * GET /folders/tree
 * Get complete folder tree
 */
exports.getFolderTree = async (req, res) => {
  try {
    const teacher_id = req.user.id;

    const folders = await Folder.findAll({
      where: { teacher_id },
      order: [['depth', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'name', 'color', 'parent_id', 'depth', 'item_count']
    });

    // Build tree structure
    const buildTree = (parentId = null) => {
      return folders
        .filter(f => f.parent_id === parentId)
        .map(folder => ({
          id: folder.id,
          name: folder.name,
          color: folder.color,
          depth: folder.depth,
          item_count: folder.item_count,
          children: buildTree(folder.id)
        }));
    };

    const tree = buildTree();

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Get folder tree error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve folder tree'
      }
    });
  }
};

/**
 * GET /folders/:id
 * Get folder details
 */
exports.getFolderById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const teacher_id = req.user.id;

    const folder = await Folder.findOne({
      where: { id, teacher_id }
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

    res.json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Get folder by id error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve folder'
      }
    });
  }
};

/**
 * GET /folders/:id/path
 * Get breadcrumb path from root to folder
 */
exports.getFolderPath = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const teacher_id = req.user.id;

    const folder = await Folder.findOne({
      where: { id, teacher_id }
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

    // Build path from root to current folder
    const path = [];
    let currentFolder = folder;

    while (currentFolder) {
      path.unshift({
        id: currentFolder.id,
        name: currentFolder.name,
        depth: currentFolder.depth
      });

      if (currentFolder.parent_id) {
        currentFolder = await Folder.findOne({
          where: { id: currentFolder.parent_id, teacher_id }
        });
      } else {
        currentFolder = null;
      }
    }

    res.json({
      success: true,
      data: path
    });
  } catch (error) {
    console.error('Get folder path error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve folder path'
      }
    });
  }
};

/**
 * GET /folders/:id/children
 * Get direct children folders
 */
exports.getFolderChildren = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const teacher_id = req.user.id;

    const children = await Folder.findAll({
      where: {
        parent_id: id,
        teacher_id
      },
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: children
    });
  } catch (error) {
    console.error('Get folder children error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve folder children'
      }
    });
  }
};

/**
 * GET /folders/:id/items
 * Get all items (folders + documents) in folder
 */
exports.getFolderItems = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const teacher_id = req.user.id;

    // Get child folders
    const folders = await Folder.findAll({
      where: { parent_id: id, teacher_id },
      order: [['name', 'ASC']]
    });

    // Get documents in folder
    const documents = await Document.findAll({
      where: { folder_id: id, teacher_id },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        folders,
        documents
      }
    });
  } catch (error) {
    console.error('Get folder items error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve folder items'
      }
    });
  }
};

/**
 * POST /folders
 * Create new folder
 */
exports.createFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, color, parent_id } = req.body;
    const teacher_id = req.user.id;

    let depth = 0;
    
    // If parent_id is provided, validate and calculate depth
    if (parent_id) {
      const parentFolder = await Folder.findOne({
        where: { id: parent_id, teacher_id }
      });

      if (!parentFolder) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PARENT_NOT_FOUND',
            message: 'Parent folder not found'
          }
        });
      }

      depth = parentFolder.depth + 1;

      // Check max depth
      if (depth > MAX_FOLDER_DEPTH) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MAX_DEPTH_EXCEEDED',
            message: 'Đã đạt giới hạn 4 cấp thư mục'
          }
        });
      }
    }

    const folder = await Folder.create({
      teacher_id,
      name,
      color: color || 'blue',
      parent_id: parent_id || null,
      depth
    });

    res.status(201).json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create folder'
      }
    });
  }
};

/**
 * PUT /folders/:id
 * Update folder
 */
exports.updateFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { name, color } = req.body;
    const teacher_id = req.user.id;

    const folder = await Folder.findOne({
      where: { id, teacher_id }
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

    if (name) folder.name = name;
    if (color) folder.color = color;

    await folder.save();

    res.json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update folder'
      }
    });
  }
};

/**
 * PUT /folders/:id/move
 * Move folder to different parent
 */
exports.moveFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { new_parent_id } = req.body;
    const teacher_id = req.user.id;

    const folder = await Folder.findOne({
      where: { id, teacher_id }
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

    // Check if trying to move to itself
    if (new_parent_id === id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MOVE',
          message: 'Cannot move folder to itself'
        }
      });
    }

    let newDepth = 0;

    // If new_parent_id is provided, validate
    if (new_parent_id) {
      const newParent = await Folder.findOne({
        where: { id: new_parent_id, teacher_id }
      });

      if (!newParent) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PARENT_NOT_FOUND',
            message: 'New parent folder not found'
          }
        });
      }

      // Check if new parent is a descendant of current folder
      let currentParent = newParent;
      while (currentParent) {
        if (currentParent.id === id) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_MOVE',
              message: 'Cannot move folder to its own descendant'
            }
          });
        }

        if (currentParent.parent_id) {
          currentParent = await Folder.findOne({
            where: { id: currentParent.parent_id, teacher_id }
          });
        } else {
          currentParent = null;
        }
      }

      newDepth = newParent.depth + 1;

      // Calculate max depth of children
      const calculateMaxChildDepth = async (folderId, currentDepth = 0) => {
        const children = await Folder.findAll({
          where: { parent_id: folderId, teacher_id }
        });

        if (children.length === 0) return currentDepth;

        let maxDepth = currentDepth;
        for (const child of children) {
          const childDepth = await calculateMaxChildDepth(child.id, currentDepth + 1);
          maxDepth = Math.max(maxDepth, childDepth);
        }
        return maxDepth;
      };

      const maxChildDepth = await calculateMaxChildDepth(id);
      
      if (newDepth + maxChildDepth > MAX_FOLDER_DEPTH) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MAX_DEPTH_EXCEEDED',
            message: 'Moving this folder would exceed maximum depth limit'
          }
        });
      }
    }

    // Update folder and all descendants depths
    const updateDescendantsDepth = async (folderId, depthDiff) => {
      const children = await Folder.findAll({
        where: { parent_id: folderId, teacher_id }
      });

      for (const child of children) {
        child.depth += depthDiff;
        await child.save();
        await updateDescendantsDepth(child.id, depthDiff);
      }
    };

    const depthDiff = newDepth - folder.depth;
    folder.parent_id = new_parent_id || null;
    folder.depth = newDepth;
    await folder.save();

    if (depthDiff !== 0) {
      await updateDescendantsDepth(id, depthDiff);
    }

    res.json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Move folder error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to move folder'
      }
    });
  }
};

/**
 * DELETE /folders/:id
 * Delete folder (only if empty)
 */
exports.deleteFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const teacher_id = req.user.id;

    const folder = await Folder.findOne({
      where: { id, teacher_id }
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

    // Check if folder has children
    const childrenCount = await Folder.count({
      where: { parent_id: id, teacher_id }
    });

    const documentsCount = await Document.count({
      where: { folder_id: id, teacher_id }
    });

    if (childrenCount > 0 || documentsCount > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FOLDER_NOT_EMPTY',
          message: 'Cannot delete folder with items. Please delete all contents first.'
        }
      });
    }

    await folder.destroy();

    res.json({
      success: true,
      message: 'Folder deleted successfully'
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete folder'
      }
    });
  }
};
