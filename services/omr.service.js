const Jimp = require('jimp');
const jsQR = require('jsqr');
const coordConfig = require('../config/omr-coordinates.json');

/**
 * OMR Service - Xử lý nhận diện phiếu trả lời trắc nghiệm
 * Sử dụng Jimp (thuần JS) thay vì OpenCV để dễ deploy
 */

class OMRService {
  constructor() {
    // Ngưỡng để xác định ô được tô (0-255, càng thấp càng đen)
    this.MARK_THRESHOLD = 180;
    
    // Độ tin cậy tối thiểu để không cần review
    this.CONFIDENCE_THRESHOLD = 0.85;
    
    // Alignment markers (black squares)
    this.MARKER_SIZE_MIN = 30; // Minimum size in pixels
    this.MARKER_SIZE_MAX = 80; // Maximum size in pixels
    this.MARKER_THRESHOLD = 50; // Darkness threshold for black squares
  }

  /**
   * Xử lý phiếu trả lời hoàn chỉnh
   * @param {Buffer} imageBuffer - Buffer của ảnh
   * @param {Object} templateConfig - Cấu hình template
   * @returns {Object} Kết quả nhận diện
   */
  async processAnswerSheet(imageBuffer, templateConfig) {
    const startTime = Date.now();
    
    try {
      // 1. Load và tiền xử lý ảnh
      let image = await Jimp.read(imageBuffer);
      image = await this.preprocessImage(image);

      // 2. Adjust template dựa trên image size (% coordinates)
      const adjustedConfig = this.adjustTemplateWithMarkers(templateConfig, null, image);

      // 3. Detect QR Code
      const qrResult = await this.detectQRCode(image, adjustedConfig.qr_region);

      // 4. Detect student code từ grid (backup nếu QR fail)
      let studentCode = null;
      if (qrResult.success && qrResult.data.student_id) {
        studentCode = qrResult.data.student_id;
      } else if (adjustedConfig.student_id_region) {
        studentCode = await this.detectStudentCode(image, adjustedConfig.student_id_region);
        console.log(`📝 Detected student code: ${studentCode || 'none'}`);
      }

      // 5. Detect exam code
      const examCode = await this.detectExamCode(image, adjustedConfig.exam_code_region);
      console.log(`🔢 Detected exam code: ${examCode || 'none'}`);

      // 6. Detect answers
      const { detectedAnswers, confidence } = await this.detectAnswers(
        image, 
        adjustedConfig.answer_regions,
        adjustedConfig.total_questions
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        qrDetected: qrResult.success,
        qrData: qrResult.data,
        studentCode,
        examCode,
        detectedAnswers,
        accuracyScore: confidence,
        needsReview: confidence < this.CONFIDENCE_THRESHOLD,
        processingTimeMs: processingTime
      };

    } catch (error) {
      console.error('OMR Processing Error:', error);
      return {
        success: false,
        error: error.message,
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Tiền xử lý ảnh: chuyển grayscale, tăng contrast
   */
  async preprocessImage(image) {
    return image
      .greyscale()
      .contrast(0.3)  // Tăng độ tương phản
      .normalize();   // Chuẩn hóa histogram
  }

  /**
   * Phát hiện QR code
   */
  async detectQRCode(image, qrRegion) {
    try {
      if (!qrRegion) {
        return { success: false, data: null };
      }

      // Crop vùng QR
      const qrImage = image.clone().crop(
        qrRegion.x,
        qrRegion.y,
        qrRegion.width,
        qrRegion.height
      );

      // Convert sang format cho jsQR
      const imageData = {
        data: new Uint8ClampedArray(qrImage.bitmap.data),
        width: qrImage.bitmap.width,
        height: qrImage.bitmap.height
      };

      // Decode QR
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        const data = JSON.parse(code.data);
        return { success: true, data };
      }

      return { success: false, data: null };

    } catch (error) {
      console.error('QR Detection Error:', error);
      return { success: false, data: null };
    }
  }

  /**
   * Nhận diện số báo danh từ grid
   */
  async detectStudentCode(image, region) {
    try {
      const { grid } = region;
      const detectedDigits = [];
      const spacingX = grid.spacing_x || grid.bubble_size;
      const spacingY = grid.spacing_y || grid.bubble_size;

      // Mỗi cột là 1 digit (0-9)
      for (let col = 0; col < grid.cols; col++) {
        let maxFill = 0;
        let detectedDigit = null;

        // Kiểm tra 10 hàng (0-9)
        for (let row = 0; row < grid.rows; row++) {
          const bubbleX = region.x + col * spacingX + grid.bubble_size / 2;
          const bubbleY = region.y + row * spacingY + grid.bubble_size / 2;

          const fillLevel = await this.checkBubbleFill(
            image, 
            bubbleX, 
            bubbleY, 
            grid.bubble_size
          );

          if (fillLevel > maxFill) {
            maxFill = fillLevel;
            detectedDigit = row.toString();
          }
        }

        if (detectedDigit !== null && maxFill > 0.3) {
          detectedDigits.push(detectedDigit);
        }
      }

      return detectedDigits.join('');

    } catch (error) {
      console.error('Student Code Detection Error:', error);
      return null;
    }
  }

  /**
   * Nhận diện mã đề từ grid
   */
  async detectExamCode(image, region) {
    if (!region) return null;
    
    try {
      const { grid } = region;
      const detectedDigits = [];
      const spacingX = grid.spacing_x || grid.bubble_size;
      const spacingY = grid.spacing_y || grid.bubble_size;

      for (let col = 0; col < grid.cols; col++) {
        let maxFill = 0;
        let detectedDigit = null;

        for (let row = 0; row < grid.rows; row++) {
          const bubbleX = region.x + col * spacingX + grid.bubble_size / 2;
          const bubbleY = region.y + row * spacingY + grid.bubble_size / 2;

          const fillLevel = await this.checkBubbleFill(
            image, 
            bubbleX, 
            bubbleY, 
            grid.bubble_size
          );

          if (fillLevel > maxFill) {
            maxFill = fillLevel;
            detectedDigit = row.toString();
          }
        }

        if (detectedDigit !== null && maxFill > 0.3) {
          detectedDigits.push(detectedDigit);
        }
      }

      return detectedDigits.join('');

    } catch (error) {
      console.error('Exam Code Detection Error:', error);
      return null;
    }
  }

  /**
   * Nhận diện câu trả lời
   */
  async detectAnswers(image, answerRegions, totalQuestions) {
    const detectedAnswers = {};
    const confidenceScores = [];

    try {
      // Xử lý từng cột (column_1: 1-25, column_2: 26-50)
      for (const [columnName, columnConfig] of Object.entries(answerRegions)) {
        const [startQ, endQ] = columnConfig.questions;

        for (let q = startQ; q <= endQ; q++) {
          const rowIndex = q - startQ;
          const y = columnConfig.start_y + rowIndex * columnConfig.row_height;

          const optionFills = {};
          let maxFill = 0;
          let detectedOption = null;

          // Kiểm tra từng đáp án (A, B, C, D)
          for (const [option, config] of Object.entries(columnConfig.options)) {
            const x = columnConfig.start_x + config.offset_x;
            
            const fillLevel = await this.checkBubbleFill(
              image,
              x + columnConfig.bubble_diameter / 2,
              y + columnConfig.bubble_diameter / 2,
              columnConfig.bubble_diameter
            );

            optionFills[option] = fillLevel;

            if (fillLevel > maxFill) {
              maxFill = fillLevel;
              detectedOption = option;
            }
          }

          // Xác định câu trả lời và confidence
          if (maxFill > 0.22) { // Giảm threshold để nhận diện cả bubbles tô nhẹ (0.22 = 22%)
            // Kiểm tra xem có nhiều ô được tô không (ambiguous)
            const markedOptions = Object.entries(optionFills)
              .filter(([opt, fill]) => fill > 0.22)
              .map(([opt]) => opt);

            if (markedOptions.length > 1) {
              // Nhiều ô được tô -> confidence thấp
              detectedAnswers[q] = detectedOption;
              confidenceScores.push(0.5);
            } else {
              // Chỉ 1 ô được tô -> confidence cao
              detectedAnswers[q] = detectedOption;
              confidenceScores.push(Math.min(maxFill, 1.0));
            }
          } else {
            // Không có ô nào được tô
            detectedAnswers[q] = null;
            confidenceScores.push(1.0); // Empty answer có confidence cao
          }
          
          // DEBUG: Log detection cho 10 câu đầu
          if (q <= 10) {
            console.log(`Q${q}: ${detectedAnswers[q] || 'empty'} (fills: A=${optionFills.A.toFixed(2)}, B=${optionFills.B.toFixed(2)}, C=${optionFills.C.toFixed(2)}, D=${optionFills.D.toFixed(2)})`);
          }
        }
      }

      // Tính confidence trung bình
      const avgConfidence = confidenceScores.length > 0
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
        : 0;

      return {
        detectedAnswers,
        confidence: Math.round(avgConfidence * 100) / 100
      };

    } catch (error) {
      console.error('Answer Detection Error:', error);
      return {
        detectedAnswers: {},
        confidence: 0
      };
    }
  }

  /**
   * Kiểm tra mức độ tô của 1 ô tròn
   * @returns {number} 0-1, càng cao càng đen
   */
  async checkBubbleFill(image, centerX, centerY, diameter) {
    try {
      const radius = diameter / 2;
      const sampleSize = Math.floor(diameter * 0.7); // Sample 70% vùng giữa
      
      let totalPixels = 0;
      let darkPixels = 0;

      // Sample pixels trong vùng tròn
      for (let dy = -sampleSize / 2; dy < sampleSize / 2; dy += 2) {
        for (let dx = -sampleSize / 2; dx < sampleSize / 2; dx += 2) {
          const x = Math.floor(centerX + dx);
          const y = Math.floor(centerY + dy);

          // Kiểm tra trong boundary
          if (x >= 0 && x < image.bitmap.width && y >= 0 && y < image.bitmap.height) {
            const pixelColor = image.getPixelColor(x, y);
            const rgba = Jimp.intToRGBA(pixelColor);
            
            // Grayscale average
            const brightness = (rgba.r + rgba.g + rgba.b) / 3;

            totalPixels++;
            if (brightness < this.MARK_THRESHOLD) {
              darkPixels++;
            }
          }
        }
      }

      return totalPixels > 0 ? darkPixels / totalPixels : 0;

    } catch (error) {
      console.error('Bubble Fill Check Error:', error);
      return 0;
    }
  }

  /**
   * Vẽ kết quả lên ảnh (đúng = xanh, sai = đỏ)
   */
  async drawResultsOnImage(imageBuffer, detectedAnswers, correctAnswers, templateConfig) {
    try {
      const image = await Jimp.read(imageBuffer);
      const greenColor = Jimp.cssColorToHex('#00ff00');
      const redColor = Jimp.cssColorToHex('#ff0000');

      for (const [columnName, columnConfig] of Object.entries(templateConfig.answer_regions)) {
        const [startQ, endQ] = columnConfig.questions;

        for (let q = startQ; q <= endQ; q++) {
          const detected = detectedAnswers[q];
          const correct = correctAnswers[q];
          
          if (!detected) continue;

          const rowIndex = q - startQ;
          const y = columnConfig.start_y + rowIndex * columnConfig.row_height;
          const optionConfig = columnConfig.options[detected];
          const x = columnConfig.start_x + optionConfig.offset_x;

          const color = detected === correct ? greenColor : redColor;

          // Vẽ vòng tròn quanh ô được chọn
          const centerX = x + columnConfig.bubble_diameter / 2;
          const centerY = y + columnConfig.bubble_diameter / 2;
          const radius = columnConfig.bubble_diameter / 2 + 2;

          // Draw circle (approximate)
          for (let angle = 0; angle < 360; angle += 5) {
            const rad = angle * Math.PI / 180;
            const px = Math.floor(centerX + radius * Math.cos(rad));
            const py = Math.floor(centerY + radius * Math.sin(rad));
            
            if (px >= 0 && px < image.bitmap.width && py >= 0 && py < image.bitmap.height) {
              image.setPixelColor(color, px, py);
            }
          }
        }
      }

      return await image.getBufferAsync(Jimp.MIME_JPEG);

    } catch (error) {
      console.error('Draw Results Error:', error);
      return imageBuffer;
    }
  }

  /**
   * Detect và align ảnh dựa trên 3 black squares (alignment markers)
   */
  async detectAndAlignImage(image) {
    try {
      // Detect black squares
      const markers = await this.detectBlackSquares(image);
      
      if (markers.length < 3) {
        return { aligned: false, image, markers: [] };
      }

      // Sort markers: top-left, top-right, bottom-left
      const sorted = this.sortMarkers(markers);
      
      // Calculate rotation angle
      const rotation = this.calculateRotation(sorted);
      
      // Calculate scale (nếu cần)
      const scale = this.calculateScale(sorted, image.bitmap.width, image.bitmap.height);
      
      // Apply transformations
      let alignedImage = image.clone();
      
      if (Math.abs(rotation) > 0.5) {
        // Rotate nếu lệch > 0.5 độ
        alignedImage = alignedImage.rotate(-rotation, false); // false = không resize
      }
      
      return {
        aligned: true,
        image: alignedImage,
        rotation,
        scale,
        markers: sorted
      };

    } catch (error) {
      console.error('Alignment Error:', error);
      return { aligned: false, image, error: error.message };
    }
  }

  /**
   * Detect black squares trong ảnh
   */
  async detectBlackSquares(image) {
    const markers = [];
    const { width, height } = image.bitmap;
    const stepSize = 20; // Sample every 20 pixels để tăng tốc (tăng từ 10)

    // Scan toàn bộ ảnh tìm vùng đen
    for (let y = 0; y < height - this.MARKER_SIZE_MIN; y += stepSize) {
      for (let x = 0; x < width - this.MARKER_SIZE_MIN; x += stepSize) {
        
        // Check xem vị trí này có phải là góc top-left của black square không
        const squareResult = await this.checkIfBlackSquare(image, x, y);
        
        if (squareResult.isSquare) {
          // Tránh detect duplicate (cùng 1 square nhiều lần)
          const isDuplicate = markers.some(m => 
            Math.abs(m.x - x) < this.MARKER_SIZE_MIN && 
            Math.abs(m.y - y) < this.MARKER_SIZE_MIN
          );
          
          if (!isDuplicate) {
            markers.push({
              x: x + squareResult.size / 2, // Center X
              y: y + squareResult.size / 2, // Center Y
              size: squareResult.size
            });
          }
        }
      }
    }

    // Filter: Chỉ lấy 3 markers LỚN NHẤT (alignment markers thật)
    const sortedBySize = markers.sort((a, b) => b.size - a.size);
    const top3 = sortedBySize.slice(0, 3);

    console.log(`🔍 Found ${markers.length} black regions, filtered to ${top3.length} alignment markers`);
    return top3;
  }

  /**
   * Check xem một vị trí có phải là black square không
   */
  async checkIfBlackSquare(image, startX, startY) {
    const maxSize = Math.min(
      this.MARKER_SIZE_MAX,
      image.bitmap.width - startX,
      image.bitmap.height - startY
    );

    // Try different sizes
    for (let size = this.MARKER_SIZE_MIN; size <= maxSize; size += 5) {
      let blackPixelCount = 0;
      const totalPixels = size * size;
      const sampleSize = Math.max(1, Math.floor(size / 10)); // Sample để tăng tốc

      // Sample pixels trong square
      for (let dy = 0; dy < size; dy += sampleSize) {
        for (let dx = 0; dx < size; dx += sampleSize) {
          const x = startX + dx;
          const y = startY + dy;
          
          if (x >= image.bitmap.width || y >= image.bitmap.height) continue;
          
          const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
          const brightness = (pixel.r + pixel.g + pixel.b) / 3;
          
          if (brightness < this.MARKER_THRESHOLD) {
            blackPixelCount++;
          }
        }
      }

      const sampledTotal = Math.ceil(size / sampleSize) ** 2;
      const blackRatio = blackPixelCount / sampledTotal;

      // Nếu > 70% là đen thì đây là black square
      if (blackRatio > 0.7) {
        return { isSquare: true, size };
      }
    }

    return { isSquare: false };
  }

  /**
   * Sort markers thành top-left, top-right, bottom-left
   */
  sortMarkers(markers) {
    if (markers.length < 3) return markers;

    // Sort by Y (top to bottom)
    const sorted = [...markers].sort((a, b) => a.y - b.y);
    
    // 2 cái trên cùng
    const topTwo = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
    const topLeft = topTwo[0];
    const topRight = topTwo[1];
    
    // 1 cái dưới cùng (bottom-left)
    const bottomLeft = sorted[2];

    return { topLeft, topRight, bottomLeft };
  }

  /**
   * Calculate góc xoay dựa trên 2 markers trên cùng
   */
  calculateRotation(sorted) {
    const { topLeft, topRight } = sorted;
    
    const deltaX = topRight.x - topLeft.x;
    const deltaY = topRight.y - topLeft.y;
    
    // Angle in degrees
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    
    return angle;
  }

  /**
   * Calculate scale factor (nếu cần resize)
   */
  calculateScale(sorted, imageWidth, imageHeight) {
    // Expected distance between markers (in pixels) cho template chuẩn
    const EXPECTED_TOP_DISTANCE = 600; // pixels between top-left và top-right
    
    const { topLeft, topRight } = sorted;
    const actualDistance = Math.sqrt(
      (topRight.x - topLeft.x) ** 2 + 
      (topRight.y - topLeft.y) ** 2
    );
    
    const scale = actualDistance / EXPECTED_TOP_DISTANCE;
    
    return scale;
  }

  /**
   * Adjust template coordinates dựa trên kích thước ảnh thực tế
   * Sử dụng % thay vì hardcode pixels
   * EXPORTED for debug tool
   */
  adjustTemplateWithMarkers(config, markers, image) {
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    console.log(`📐 Image size: ${width}x${height}`);
    
    const adjusted = JSON.parse(JSON.stringify(config));
    const c = coordConfig; // Shorthand
    
    // Student ID - Read from JSON config
    if (adjusted.student_id_region) {
      adjusted.student_id_region.x = Math.floor(width * c.student_id.x_percent / 100);
      adjusted.student_id_region.y = Math.floor(height * c.student_id.y_percent / 100);
      adjusted.student_id_region.grid.bubble_size = Math.floor(width * c.student_id.bubble_size_percent / 100);
      adjusted.student_id_region.grid.spacing_x = Math.floor(width * c.student_id.spacing_x_percent / 100);
      adjusted.student_id_region.grid.spacing_y = Math.floor(height * c.student_id.spacing_y_percent / 100);
      
      console.log(`📝 Student ID: x=${adjusted.student_id_region.x}, y=${adjusted.student_id_region.y}`);
    }
    
    // Exam code
    if (adjusted.exam_code_region) {
      adjusted.exam_code_region.x = Math.floor(width * c.exam_code.x_percent / 100);
      adjusted.exam_code_region.y = Math.floor(height * c.exam_code.y_percent / 100);
      adjusted.exam_code_region.grid.bubble_size = Math.floor(width * c.exam_code.bubble_size_percent / 100);
      adjusted.exam_code_region.grid.spacing_x = Math.floor(width * c.exam_code.spacing_x_percent / 100);
      adjusted.exam_code_region.grid.spacing_y = Math.floor(height * c.exam_code.spacing_y_percent / 100);
      
      console.log(`🔢 Exam code: x=${adjusted.exam_code_region.x}, y=${adjusted.exam_code_region.y}`);
    }
    
    // Answer regions
    if (adjusted.answer_regions) {
      const col1 = c.answers.column_1;
      adjusted.answer_regions.column_1.start_x = Math.floor(width * col1.x_percent / 100);
      adjusted.answer_regions.column_1.start_y = Math.floor(height * col1.y_percent / 100);
      adjusted.answer_regions.column_1.row_height = Math.floor(height * col1.row_height_percent / 100);
      adjusted.answer_regions.column_1.bubble_diameter = Math.floor(width * col1.bubble_size_percent / 100);
      adjusted.answer_regions.column_1.spacing = Math.floor(width * col1.spacing_percent / 100);
      
      const spacing = adjusted.answer_regions.column_1.spacing;
      adjusted.answer_regions.column_1.options.A.offset_x = 0;
      adjusted.answer_regions.column_1.options.B.offset_x = spacing;
      adjusted.answer_regions.column_1.options.C.offset_x = spacing * 2;
      adjusted.answer_regions.column_1.options.D.offset_x = spacing * 3;
      
      const col2 = c.answers.column_2;
      adjusted.answer_regions.column_2.start_x = Math.floor(width * col2.x_percent / 100);
      adjusted.answer_regions.column_2.start_y = Math.floor(height * col2.y_percent / 100);
      adjusted.answer_regions.column_2.row_height = adjusted.answer_regions.column_1.row_height;
      adjusted.answer_regions.column_2.bubble_diameter = adjusted.answer_regions.column_1.bubble_diameter;
      adjusted.answer_regions.column_2.spacing = adjusted.answer_regions.column_1.spacing;
      adjusted.answer_regions.column_2.options = JSON.parse(JSON.stringify(adjusted.answer_regions.column_1.options));
      
      console.log(`📋 Col1: (${adjusted.answer_regions.column_1.start_x}, ${adjusted.answer_regions.column_1.start_y}), Col2: (${adjusted.answer_regions.column_2.start_x}, ${adjusted.answer_regions.column_2.start_y})`);
    }
    
    return adjusted;
  }
}

module.exports = new OMRService();
