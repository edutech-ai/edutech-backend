const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Multer configuration - store in memory
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, PPTX, XLSX, and images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  }
});

/**
 * Upload file to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} teacherId - Teacher ID for folder organization
 * @param {String} originalName - Original filename
 * @returns {Promise<Object>} Upload result with url and cloudinary_id
 */
const uploadToCloudinary = (fileBuffer, teacherId, originalName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `edutech/documents/${teacherId}`,
        resource_type: 'auto',
        public_id: `${Date.now()}_${uuidv4()}`,
        use_filename: false,
        unique_filename: true
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            cloudinary_id: result.public_id,
            format: result.format,
            resource_type: result.resource_type,
            bytes: result.bytes
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete file from Cloudinary
 * @param {String} cloudinaryId - Cloudinary public_id
 * @returns {Promise<Object>} Deletion result
 */
const deleteFromCloudinary = async (cloudinaryId) => {
  try {
    const result = await cloudinary.uploader.destroy(cloudinaryId, {
      resource_type: 'raw',
      invalidate: true
    });
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Get file type from mimetype
 * @param {String} mimetype - File mimetype
 * @returns {String} File type category
 */
const getFileType = (mimetype) => {
  const typeMap = {
    'application/pdf': 'pdf',
    'application/msword': 'docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-powerpoint': 'pptx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-excel': 'xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/gif': 'image',
    'image/webp': 'image'
  };

  return typeMap[mimetype] || 'other';
};

/**
 * Generate thumbnail URL for documents (Cloudinary transformation)
 * @param {String} cloudinaryId - Cloudinary public_id
 * @param {String} resourceType - Resource type (image, raw, etc)
 * @returns {String} Thumbnail URL
 */
const getThumbnailUrl = (cloudinaryId, resourceType) => {
  if (resourceType === 'image') {
    return cloudinary.url(cloudinaryId, {
      width: 300,
      height: 400,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto'
    });
  }
  
  // For PDFs and documents, return first page as thumbnail
  return cloudinary.url(cloudinaryId, {
    width: 300,
    height: 400,
    crop: 'fill',
    quality: 'auto',
    page: 1,
    format: 'jpg'
  });
};

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  getFileType,
  getThumbnailUrl
};
