const { validationResult } = require('express-validator');
const StudentPerformance = require('../models/StudentPerformance');
const Classroom = require('../models/Classroom');
const Student = require('../models/Student');
const { recalculatePerformance, recalculateClassroomPerformance } = require('../utils/performanceCalculator');

// ============================================================
// STUDENT PERFORMANCE
// ============================================================

/**
 * @desc    Lấy hiệu suất của một học sinh
 * @route   GET /api/v1/classrooms/:classroomId/students/:studentId/performance
 * @access  Private (Teacher)
 */
exports.getStudentPerformance = async (req, res) => {
  try {
    const { classroomId, studentId } = req.params;
    const teacher_id = req.user.id;

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
        message: 'Bạn không có quyền xem hiệu suất của lớp này'
      });
    }

    // Lấy performance
    let performance = await StudentPerformance.findOne(classroomId, studentId);

    // Nếu chưa có, tính toán mới
    if (!performance) {
      await recalculatePerformance(classroomId, studentId);
      performance = await StudentPerformance.findOne(classroomId, studentId);
    }

    // Lấy thông tin học sinh
    const student = await Student.findById(studentId);

    res.status(200).json({
      success: true,
      data: {
        ...performance,
        student_info: {
          id: student.id,
          full_name: student.full_name,
          student_code: student.student_code
        }
      }
    });
  } catch (error) {
    console.error('Error getting student performance:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy hiệu suất học sinh',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy hiệu suất của tất cả học sinh trong lớp
 * @route   GET /api/v1/classrooms/:classroomId/performance
 * @access  Private (Teacher)
 */
exports.getClassroomPerformance = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const teacher_id = req.user.id;

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
        message: 'Bạn không có quyền xem hiệu suất của lớp này'
      });
    }

    // Lấy tất cả performance
    const performances = await StudentPerformance.findByClassroom(classroomId);

    // Tính thống kê tổng quan của lớp
    const stats = {
      total_students: performances.length,
      excellent: performances.filter(p => p.performance_level === 'excellent').length,
      good: performances.filter(p => p.performance_level === 'good').length,
      average: performances.filter(p => p.performance_level === 'average').length,
      needs_improvement: performances.filter(p => p.performance_level === 'needs_improvement').length,
      at_risk: performances.filter(p => p.performance_level === 'at_risk').length,
      class_average_score: performances.length > 0
        ? performances.reduce((sum, p) => sum + (p.average_score || 0), 0) / performances.length
        : 0,
      class_avg_participation: performances.length > 0
        ? performances.reduce((sum, p) => sum + (p.avg_hand_raises_per_week || 0), 0) / performances.length
        : 0
    };

    res.status(200).json({
      success: true,
      data: {
        performances,
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Error getting classroom performance:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy hiệu suất lớp học',
      error: error.message
    });
  }
};

/**
 * @desc    Cập nhật ghi chú của giáo viên
 * @route   PUT /api/v1/classrooms/:classroomId/students/:studentId/performance/notes
 * @access  Private (Teacher)
 */
exports.updateTeacherNotes = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { classroomId, studentId } = req.params;
    const teacher_id = req.user.id;
    const { teacher_notes } = req.body;

    // Kiểm tra quyền
    const classroom = await Classroom.findById(classroomId);
    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật ghi chú này'
      });
    }

    // Kiểm tra performance có tồn tại không
    let performance = await StudentPerformance.findOne(classroomId, studentId);
    if (!performance) {
      // Nếu chưa có, tạo mới
      await recalculatePerformance(classroomId, studentId);
    }

    // Cập nhật notes
    await StudentPerformance.update(classroomId, studentId, { teacher_notes });

    const updatedPerformance = await StudentPerformance.findOne(classroomId, studentId);

    res.status(200).json({
      success: true,
      message: 'Cập nhật ghi chú thành công',
      data: updatedPerformance
    });
  } catch (error) {
    console.error('Error updating teacher notes:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật ghi chú',
      error: error.message
    });
  }
};

/**
 * @desc    Tính lại hiệu suất cho một học sinh
 * @route   POST /api/v1/classrooms/:classroomId/students/:studentId/performance/recalculate
 * @access  Private (Teacher)
 */
exports.recalculateStudentPerformance = async (req, res) => {
  try {
    const { classroomId, studentId } = req.params;
    const teacher_id = req.user.id;

    // Kiểm tra quyền
    const classroom = await Classroom.findById(classroomId);
    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }

    // Tính lại
    await recalculatePerformance(classroomId, studentId);

    const performance = await StudentPerformance.findOne(classroomId, studentId);

    res.status(200).json({
      success: true,
      message: 'Tính lại hiệu suất thành công',
      data: performance
    });
  } catch (error) {
    console.error('Error recalculating student performance:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tính lại hiệu suất',
      error: error.message
    });
  }
};

/**
 * @desc    Tính lại hiệu suất cho tất cả học sinh trong lớp
 * @route   POST /api/v1/classrooms/:classroomId/performance/recalculate
 * @access  Private (Teacher)
 */
exports.recalculateAllPerformance = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const teacher_id = req.user.id;

    // Kiểm tra quyền
    const classroom = await Classroom.findById(classroomId);
    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }

    // Tính lại cho tất cả
    const results = await recalculateClassroomPerformance(classroomId);

    res.status(200).json({
      success: true,
      message: `Tính lại hiệu suất thành công. Thành công: ${results.success.length}, Lỗi: ${results.errors.length}`,
      data: results
    });
  } catch (error) {
    console.error('Error recalculating classroom performance:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tính lại hiệu suất lớp học',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy bảng xếp hạng lớp học
 * @route   GET /api/v1/classrooms/:classroomId/leaderboard
 * @access  Private (Teacher)
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const teacher_id = req.user.id;
    const { order_by = 'overall', limit = 20 } = req.query;

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
        message: 'Bạn không có quyền xem bảng xếp hạng của lớp này'
      });
    }

    // Lấy leaderboard
    const leaderboard = await StudentPerformance.getLeaderboard(
      classroomId, 
      order_by, 
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      data: {
        order_by,
        total: leaderboard.length,
        leaderboard
      }
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy bảng xếp hạng',
      error: error.message
    });
  }
};
