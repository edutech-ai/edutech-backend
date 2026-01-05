const cloudinary = require('cloudinary').v2;

// Debug: Check if env variables are loaded
console.log('🔧 Cloudinary Configuration:');
console.log('   Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('   API key:', process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'NOT SET');
console.log('   API secret:', process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'NOT SET');

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Verify connection
const verifyConnection = async () => {
  try {
    // Test connection by calling API resources with limit 1
    await cloudinary.api.resources({ max_results: 1 });
    console.log('✅ Cloudinary Connected');
  } catch (error) {
    console.error('❌ Cloudinary connection error:', error.message || error);
  }
};

// Upload image to Cloudinary
const uploadImage = async (file, folder = 'edutech') => {
  try {
    console.log(`🔄 Uploading image: ${file.path}`);
    
    const result = await cloudinary.uploader.upload(file.path, {
      folder: folder,
      resource_type: 'auto'
      // Tạm bỏ transformation để test
    });

    console.log(`✅ Image uploaded: ${result.secure_url}`);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error('Failed to upload image: ' + error.message);
  }
};

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`✅ Image deleted: ${publicId}`);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw error;
  }
};

// Upload video
const uploadVideo = async (file, folder = 'edutech/videos') => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: folder,
      resource_type: 'video',
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    console.log(`✅ Video uploaded: ${result.secure_url}`);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('❌ Cloudinary video upload error:', error);
    throw new Error('Failed to upload video');
  }
};

// Initialize connection check
verifyConnection();

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  uploadVideo
};
