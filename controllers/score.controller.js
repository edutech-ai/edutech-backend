const { validationResult } = require('express-validator');
const StudentScore = require('../models/StudentScore');
const Classroom = require('../models/Classroom');
const Student = require('../models/Student');
const ClassroomStudent = require('../models/ClassroomStudent');
const { recalculatePerformance } = require('../utils/performanceCalculator');
const xlsx = require('xlsx');

// ============================================================
// STUDENT SCORES CRUD
// ============================================================

/**
 * @desc    Tạo điểm mới cho học sinh
 * @route   POST /api/v1/classrooms/:classroomId/scores
 * @access  Private (Teacher)
 */
exports.createScore = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { classroomId } = req.params;
    const teacher_id = req.user.id;
    const { student_id, quiz_id, score, max_score, subject, exam_name, exam_type, exam_date, notes } = req.body;

    // Kiểm tra lớp học tồn tại và thuộc về giáo viên
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    if (classroom.teacher_id !== teacher_id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thêm điểm vào lớp này'
      });
    }

    // Kiểm tra học sinh tồn tại
    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học sinh'
      });
    }

    // Tạo điểm
    const scoreId = await StudentScore.create({
      classroom_id: classroomId,
      student_id,
      quiz_id,
      score,
      max_score,
      subject,
      exam_name,
      exam_type,
      exam_date,
      notes
    });

    // Tự động cập nhật performance
    await recalculatePerformance(classroomId, student_id);

    const newScore = await StudentScore.findById(scoreId);

    res.status(201).json({
      success: true,
      message: 'Thêm điểm thành công',
      data: newScore
    });
  } catch (error) {
    console.error('Error creating score:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm điểm',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy danh sách điểm của lớp
 * @route   GET /api/v1/classrooms/:classroomId/scores
 * @access  Private (Teacher)
 */
exports.getClassroomScores = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const teacher_id = req.user.id;
    const { page = 1, limit = 20, subject, exam_type } = req.query;

    // Kiểm tra quyền
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    if (classroom.teacher_id !== teacher_id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem điểm của lớp này'
      });
    }

    const offset = (page - 1) * limit;
    const filters = {
      subject,
      exam_type,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const scores = await StudentScore.findByClassroom(classroomId, filters);
    const count = await StudentScore.count(classroomId);

    res.status(200).json({
      success: true,
      data: {
        scores,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting classroom scores:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách điểm',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy điểm của một học sinh
 * @route   GET /api/v1/classrooms/:classroomId/students/:studentId/scores
 * @access  Private (Teacher)
 */
exports.getStudentScores = async (req, res) => {
  try {
    const { classroomId, studentId } = req.params;
    const teacher_id = req.user.id;
    const { subject, exam_type, from_date, to_date } = req.query;

    // Kiểm tra quyền
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    if (classroom.teacher_id !== teacher_id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem điểm của lớp này'
      });
    }

    const filters = {
      subject,
      exam_type,
      from_date,
      to_date
    };

    const scores = await StudentScore.findByClassroomStudent(classroomId, studentId, filters);
    const stats = await StudentScore.getStatistics(classroomId, studentId);

    res.status(200).json({
      success: true,
      data: {
        scores,
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Error getting student scores:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy điểm của học sinh',
      error: error.message
    });
  }
};

/**
 * @desc    Cập nhật điểm
 * @route   PUT /api/v1/classrooms/:classroomId/scores/:scoreId
 * @access  Private (Teacher)
 */
exports.updateScore = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { classroomId, scoreId } = req.params;
    const teacher_id = req.user.id;
    const { score, max_score, subject, exam_name, exam_type, exam_date, notes } = req.body;

    // Kiểm tra quyền
    const classroom = await Classroom.findById(classroomId);
    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật điểm này'
      });
    }

    // Lấy thông tin điểm cũ
    const oldScore = await StudentScore.findById(scoreId);
    if (!oldScore || oldScore.classroom_id !== classroomId) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy điểm'
      });
    }

    // Cập nhật
    await StudentScore.update(scoreId, {
      score,
      max_score,
      subject,
      exam_name,
      exam_type,
      exam_date,
      notes
    });

    // Tự động cập nhật performance
    await recalculatePerformance(classroomId, oldScore.student_id);

    const updatedScore = await StudentScore.findById(scoreId);

    res.status(200).json({
      success: true,
      message: 'Cập nhật điểm thành công',
      data: updatedScore
    });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật điểm',
      error: error.message
    });
  }
};

/**
 * @desc    Xóa điểm
 * @route   DELETE /api/v1/classrooms/:classroomId/scores/:scoreId
 * @access  Private (Teacher)
 */
exports.deleteScore = async (req, res) => {
  try {
    const { classroomId, scoreId } = req.params;
    const teacher_id = req.user.id;

    // Kiểm tra quyền
    const classroom = await Classroom.findById(classroomId);
    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa điểm này'
      });
    }

    // Lấy thông tin điểm
    const score = await StudentScore.findById(scoreId);
    if (!score || score.classroom_id !== classroomId) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy điểm'
      });
    }

    const studentId = score.student_id;

    // Xóa
    await StudentScore.delete(scoreId);

    // Tự động cập nhật performance
    await recalculatePerformance(classroomId, studentId);

    res.status(200).json({
      success: true,
      message: 'Xóa điểm thành công'
    });
  } catch (error) {
    console.error('Error deleting score:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa điểm',
      error: error.message
    });
  }
};

/**
 * @desc    Upload file XLSX điểm học sinh hàng loạt
 * @route   POST /api/v1/classrooms/:classroomId/scores/upload
 * @access  Private (Teacher)
 */
exports.uploadScoresXLSX = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    // Kiểm tra file có được upload không
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng upload file XLSX'
      });
    }

    const { classroomId } = req.params;
    const teacher_id = req.user.id;
    
    // Lấy thông tin chung từ body
    const { quiz_id, max_score, subject, exam_name, exam_type } = req.body;
    // Nếu không có exam_date thì dùng ngày hiện tại
    const exam_date = req.body.exam_date || new Date().toISOString().split('T')[0];

    // Kiểm tra lớp học tồn tại và thuộc về giáo viên
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    if (classroom.teacher_id !== teacher_id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thêm điểm vào lớp này'
      });
    }

    // Đọc file XLSX
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Chuyển đổi dữ liệu từ worksheet sang JSON
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File không có dữ liệu'
      });
    }

    const results = {
      success: [],
      errors: [],
      total: data.length
    };

    // Xử lý từng điểm số
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 vì bắt đầu từ hàng 2 (hàng 1 là header)

      try {
        // Lấy dữ liệu từ file
        const student_code = row.student_code?.toString().trim();
        const student_name = row.student_name?.toString().trim();
        const score = parseFloat(row.score);
        const notes = row.notes?.toString().trim() || null;

        // Validate dữ liệu bắt buộc
        if (!student_code) {
          results.errors.push({
            row: rowNumber,
            data: row,
            message: 'Thiếu mã học sinh'
          });
          continue;
        }

        if (isNaN(score)) {
          results.errors.push({
            row: rowNumber,
            data: row,
            message: 'Điểm không hợp lệ'
          });
          continue;
        }

        // Tìm học sinh theo mã
        const student = await Student.findByStudentCode(student_code);
        if (!student) {
          results.errors.push({
            row: rowNumber,
            data: row,
            message: `Không tìm thấy học sinh với mã ${student_code}`
          });
          continue;
        }

        // Kiểm tra học sinh có trong lớp không
        const isInClassroom = await ClassroomStudent.exists(classroomId, student.id);
        if (!isInClassroom) {
          results.errors.push({
            row: rowNumber,
            data: row,
            message: `Học sinh ${student_code} - ${student.full_name} không có trong lớp`
          });
          continue;
        }

        // Tạo điểm mới
        const scoreId = await StudentScore.create({
          classroom_id: classroomId,
          student_id: student.id,
          quiz_id: quiz_id || null,
          score: score,
          max_score: max_score || 10,
          subject: subject,
          exam_name: exam_name,
          exam_type: exam_type,
          exam_date: exam_date,
          notes: notes
        });

        // Tự động cập nhật performance
        await recalculatePerformance(classroomId, student.id);

        results.success.push({
          row: rowNumber,
          student_code: student.student_code,
          student_name: student.full_name,
          score: score,
          score_id: scoreId
        });

      } catch (error) {
        results.errors.push({
          row: rowNumber,
          data: row,
          message: error.message
        });
      }
    }

    // Trả về kết quả
    res.status(200).json({
      success: true,
      message: `Đã xử lý ${results.total} điểm số`,
      data: {
        total: results.total,
        successCount: results.success.length,
        errorCount: results.errors.length,
        success: results.success,
        errors: results.errors
      }
    });

  } catch (error) {
    console.error('Error uploading scores XLSX:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi upload file XLSX điểm số',
      error: error.message
    });
  }
};
