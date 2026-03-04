const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLib, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');

/**
 * ===== TEMPLATE SERVICE =====
 * Generate PDF answer sheets với QR code
 */

class TemplateService {
  /**
   * Tạo phiếu trả lời cho một exam batch
   * @param {Object} options - Thông tin để tạo phiếu
   * @param {string} options.batch_id - ID của exam batch
   * @param {string} options.student_id - ID của student
   * @param {string} options.student_code - Mã sinh viên
   * @param {string} options.student_name - Tên sinh viên
   * @param {string} options.exam_name - Tên kỳ thi
   * @param {string} options.exam_code - Mã đề thi
   * @param {number} options.total_questions - Tổng số câu hỏi (default: 50)
   * @returns {Promise<string>} - URL của PDF đã upload
   */
  async generateAnswerSheet(options) {
    const {
      batch_id,
      student_id,
      student_code,
      student_name,
      exam_name,
      exam_code = '001',
      total_questions = 50
    } = options;

    try {
      // Load template PDF
      const templatePath = path.join(__dirname, '../templates/answer_sheet_template.pdf');
      
      // Check if template exists
      if (!fs.existsSync(templatePath)) {
        throw new Error('Template PDF không tồn tại. Vui lòng copy file "Form_50_VI_NOLABEL - BLACK.pdf" vào thư mục backend/templates/ và đổi tên thành "answer_sheet_template.pdf"');
      }

      const templateBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFLib.load(templateBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Generate QR code
      const qrData = JSON.stringify({
        batch_id,
        student_id,
        student_code,
        timestamp: new Date().toISOString()
      });

      const qrBuffer = await QRCode.toBuffer(qrData, {
        width: 400,
        margin: 1,
        errorCorrectionLevel: 'H'
      });

      // Embed QR code
      const qrImage = await pdfDoc.embedPng(qrBuffer);
      
      // Draw QR code (adjust coordinates based on template)
      firstPage.drawImage(qrImage, {
        x: 74,  // X position for QR code
        y: 595, // Y position (PDF coordinates start from bottom)
        width: 120,
        height: 120,
      });

      // Draw student info
      firstPage.drawText(student_name, {
        x: 460,
        y: 685,
        size: 10,
      });

      firstPage.drawText(student_code, {
        x: 460,
        y: 655,
        size: 10,
      });

      firstPage.drawText(exam_code, {
        x: 460,
        y: 625,
        size: 10,
      });

      firstPage.drawText(total_questions.toString(), {
        x: 460,
        y: 595,
        size: 10,
      });

      // Save modified PDF
      const pdfBytes = await pdfDoc.save();

      // Save to public folder
      const publicDir = path.join(__dirname, '../public/omr/answer-sheets');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const fileName = `answer_sheet_${batch_id}_${student_id}_${Date.now()}.pdf`;
      const filePath = path.join(publicDir, fileName);
      
      fs.writeFileSync(filePath, pdfBytes);

      // Return URL
      return `/public/omr/answer-sheets/${fileName}`;

    } catch (error) {
      console.error('Generate answer sheet error:', error);
      throw error;
    }
  }

  /**
   * Vẽ một hàng câu hỏi với 4 ô tròn A, B, C, D
   */
  drawQuestionRow(doc, questionNumber, x, y, radius, optionSpacing) {
    // Số câu hỏi
    doc.fontSize(10).font('Helvetica').text(`${questionNumber}.`, x - 20, y - 3);

    // Vẽ 4 ô tròn A, B, C, D
    const options = ['A', 'B', 'C', 'D'];
    options.forEach((option, index) => {
      const circleX = x + (index * optionSpacing);
      const circleY = y + 4;

      // Vẽ hình tròn
      doc.circle(circleX, circleY, radius).stroke();

      // Vẽ chữ bên trong
      doc.fontSize(9).font('Helvetica').text(option, circleX - 3, circleY - 5);
    });
  }

  /**
   * Tạo hàng loạt phiếu cho tất cả sinh viên trong classroom
   * @param {Object} options
   * @param {string} options.batch_id
   * @param {Array} options.students - Danh sách sinh viên [{ id, student_code, name }]
   * @param {string} options.exam_name
   * @returns {Promise<Array>} - Mảng các URL của PDF
   */
  async generateBulkAnswerSheets(options) {
    const { batch_id, students, exam_name, exam_code } = options;
    const results = [];

    for (const student of students) {
      try {
        const pdfUrl = await this.generateAnswerSheet({
          batch_id,
          student_id: student.id,
          student_code: student.student_code,
          student_name: student.name,
          exam_name,
          exam_code
        });

        results.push({
          student_id: student.id,
          student_code: student.student_code,
          pdf_url: pdfUrl,
          success: true
        });
      } catch (error) {
        results.push({
          student_id: student.id,
          student_code: student.student_code,
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }

  /**
   * Tạo template trống (không có thông tin sinh viên) để in hàng loạt
   * @param {Object} options
   * @param {string} options.exam_name
   * @param {number} options.total_questions
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generateBlankTemplate(options) {
    const { exam_name, exam_code = '___', total_questions = 50 } = options;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 30
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // ===== HEADER =====
        doc.fontSize(18).font('Helvetica-Bold').text('PHIẾU TRẢ LỜI TRẮC NGHIỆM', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(exam_name, { align: 'center' });
        doc.moveDown(1);

        // ===== THÔNG TIN SINH VIÊN (để trống) =====
        const startY = doc.y;
        const infoX = 80;
        
        doc.fontSize(11).font('Helvetica-Bold').text('Thông tin sinh viên:', infoX, startY);
        doc.fontSize(10).font('Helvetica');
        doc.text('Họ tên: ___________________________________', infoX, startY + 25);
        doc.text('Mã SV: ___________________________________', infoX, startY + 45);
        doc.text(`Mã đề: ${exam_code}`, infoX, startY + 65);
        doc.text(`Số câu: ${total_questions}`, infoX, startY + 85);

        // Hướng dẫn
        doc.fontSize(9).font('Helvetica-Oblique');
        doc.text('Lưu ý:', infoX + 280, startY);
        doc.fontSize(8);
        doc.text('- Tô kín ô tròn bằng bút chì 2B', infoX + 280, startY + 15);
        doc.text('- Không làm nhăn, rách phiếu', infoX + 280, startY + 30);
        doc.text('- Mỗi câu chỉ chọn 1 đáp án', infoX + 280, startY + 45);

        // ===== PHẦN TÔ ĐÁP ÁN =====
        const answerStartY = startY + 120;
        
        doc.fontSize(11).font('Helvetica-Bold').text('PHẦN TRẢ LỜI:', 50, answerStartY);
        doc.moveDown(0.5);

        // Chia làm 2 cột
        const col1X = 80;
        const col2X = 320;
        const bubbleRadius = 8;
        const rowHeight = 16;
        const optionSpacing = 35;

        // Cột 1: Câu 1-25
        let currentY = answerStartY + 30;
        for (let i = 1; i <= 25; i++) {
          this.drawQuestionRow(doc, i, col1X, currentY, bubbleRadius, optionSpacing);
          currentY += rowHeight;
        }

        // Cột 2: Câu 26-50
        currentY = answerStartY + 30;
        for (let i = 26; i <= 50; i++) {
          this.drawQuestionRow(doc, i, col2X, currentY, bubbleRadius, optionSpacing);
          currentY += rowHeight;
        }

        // ===== FOOTER =====
        doc.fontSize(8).font('Helvetica-Oblique');
        doc.text('Hệ thống chấm điểm tự động - AIEduTech', 50, 780, { align: 'center' });

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new TemplateService();
