    const Jimp = require('jimp');
const omrService = require('../services/omr.service');
const templateConfig = require('../config/omr-template');

/**
 * Debug endpoint - Vẽ detection regions lên ảnh
 */
exports.debugOMRCoordinates = async (req, res) => {
  try {
    // Check for uploaded file
    if (!req.files || !req.files.answer_sheet) {
      return res.status(400).json({ error: 'answer_sheet file required' });
    }

    const file = req.files.answer_sheet;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Only JPG/PNG images allowed' });
    }

    // Load image from temp file path (express-fileupload saves to tempFilePath)
    let image = await Jimp.read(file.tempFilePath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    console.log(`📐 Debug image: ${width}x${height}`);

    // Adjust template
    const adjusted = omrService.adjustTemplateWithMarkers(templateConfig, null, image);

    // Draw student ID grid (RED)
    if (adjusted.student_id_region) {
      const region = adjusted.student_id_region;
      const grid = region.grid;
      
      console.log(`🔴 Drawing Student ID: start=(${region.x}, ${region.y}), cols=${grid.cols}, rows=${grid.rows}, spacing=(${grid.spacing_x}, ${grid.spacing_y})`);
      
      for (let col = 0; col < grid.cols; col++) {
        for (let row = 0; row < grid.rows; row++) {
          const x = region.x + col * grid.spacing_x;
          const y = region.y + row * grid.spacing_y;
          drawCircle(image, x, y, grid.bubble_size, 0xFF0000FF); // Red
        }
      }
    }

    // Draw exam code grid (BLUE)
    if (adjusted.exam_code_region) {
      const region = adjusted.exam_code_region;
      const grid = region.grid;
      
      console.log(`🔵 Drawing Exam Code: start=(${region.x}, ${region.y}), cols=${grid.cols}, rows=${grid.rows}`);
      
      for (let col = 0; col < grid.cols; col++) {
        for (let row = 0; row < grid.rows; row++) {
          const x = region.x + col * grid.spacing_x;
          const y = region.y + row * grid.spacing_y;
          drawCircle(image, x, y, grid.bubble_size, 0x0000FFFF); // Blue
        }
      }
    }

    // Draw answer regions (GREEN for col1, YELLOW for col2)
    if (adjusted.answer_regions) {
      // Column 1 - GREEN
      const col1 = adjusted.answer_regions.column_1;
      for (let q = 0; q < 25; q++) {
        const y = col1.start_y + q * col1.row_height;
        
        // Draw all 4 options
        ['A', 'B', 'C', 'D'].forEach(option => {
          const x = col1.start_x + col1.options[option].offset_x;
          drawCircle(image, x, y, col1.bubble_diameter, 0x00FF00FF); // Green
        });
      }

      // Column 2 - YELLOW
      const col2 = adjusted.answer_regions.column_2;
      for (let q = 0; q < 25; q++) {
        const y = col2.start_y + q * col2.row_height;
        
        ['A', 'B', 'C', 'D'].forEach(option => {
          const x = col2.start_x + col2.options[option].offset_x;
          drawCircle(image, x, y, col2.bubble_diameter, 0xFFFF00FF); // Yellow
        });
      }
    }

    // Convert to buffer
    const outputBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    res.set('Content-Type', 'image/jpeg');
    res.send(outputBuffer);

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Draw circle helper
 */
function drawCircle(image, centerX, centerY, radius, color) {
  const r = Math.floor(radius / 2);
  
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        const x = Math.floor(centerX + dx);
        const y = Math.floor(centerY + dy);
        
        if (x >= 0 && x < image.bitmap.width && y >= 0 && y < image.bitmap.height) {
          image.setPixelColor(color, x, y);
        }
      }
    }
  }
}
