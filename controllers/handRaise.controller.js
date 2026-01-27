const { validationResult } = require('express-validator');
const StudentHandRaise = require('../models/StudentHandRaise');
const Classroom = require('../models/Classroom');
const { recalculatePerformance, getWeekStartDate } = require('../utils/performanceCalculator');

// ============================================================
// STUDENT HAND RAISES
// ============================================================

/**
 * @desc    Lưu/Cập nhật giơ tay cho nhiều học sinh trong 1 tuần
 * @route   POST /api/v1/classrooms/:classroomId/hand-raises/weekly
 * @access  Private (Teacher)
 */
exports.saveWeeklyHandRaises = async (req, res) => {
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
    let { week_start_date, students } = req.body;

    // Nếu không có week_start_date, lấy tuần hiện tại
    if (!week_start_date) {
      week_start_date = getWeekStartDate();
    }

    // Kiểm tra lớp học và quyền
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
        message: 'Bạn không có quyền cập nhật giơ tay cho lớp này'
      });
    }

    // Batch upsert
    const results = await StudentHandRaise.batchUpsert(classroomId, week_start_date, students);

    // Tự động cập nhật performance cho từng học sinh
    const performanceUpdates = [];
    for (const student of students) {
      try {
        await recalculatePerformance(classroomId, student.student_id);
        performanceUpdates.push({ student_id: student.student_id, success: true });
      } catch (error) {
        performanceUpdates.push({ student_id: student.student_id, success: false, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Đã cập nhật ${students.length} học sinh cho tuần ${week_start_date}`,
      data: {
        week_start_date,
        updated: results.length,
        results,
        performance_updates: performanceUpdates
      }
    });
  } catch (error) {
    console.error('Error saving weekly hand raises:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lưu dữ liệu giơ tay',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy dữ liệu giơ tay của tất cả học sinh trong 1 tuần
 * @route   GET /api/v1/classrooms/:classroomId/hand-raises/weekly
 * @access  Private (Teacher)
 */
exports.getWeeklyHandRaises = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const teacher_id = req.user.id;
    let { week_start_date } = req.query;

    // Nếu không có week_start_date, lấy tuần hiện tại
    if (!week_start_date) {
      week_start_date = getWeekStartDate();
    }

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
        message: 'Bạn không có quyền xem dữ liệu của lớp này'
      });
    }

    // Lấy tất cả học sinh trong lớp với dữ liệu giơ tay (nếu có)
    const students = await StudentHandRaise.findAllStudentsWithWeekData(classroomId, week_start_date);

    res.status(200).json({
      success: true,
      data: {
        week_start_date,
        total_students: students.length,
        students
      }
    });
  } catch (error) {
    console.error('Error getting weekly hand raises:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy dữ liệu giơ tay',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy lịch sử giơ tay của một học sinh
 * @route   GET /api/v1/classrooms/:classroomId/students/:studentId/hand-raises
 * @access  Private (Teacher)
 */
exports.getStudentHandRaises = async (req, res) => {
  try {
    const { classroomId, studentId } = req.params;
    const teacher_id = req.user.id;
    const { from_date, to_date, page = 1, limit = 20 } = req.query;

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
        message: 'Bạn không có quyền xem dữ liệu của lớp này'
      });
    }

    const offset = (page - 1) * limit;
    const filters = {
      from_date,
      to_date,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const handRaises = await StudentHandRaise.findByClassroomStudent(classroomId, studentId, filters);
    const stats = await StudentHandRaise.getStatistics(classroomId, studentId);

    res.status(200).json({
      success: true,
      data: {
        hand_raises: handRaises,
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Error getting student hand raises:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử giơ tay',
      error: error.message
    });
  }
};

/**
 * @desc    Xóa dữ liệu giơ tay của một học sinh trong một tuần
 * @route   DELETE /api/v1/classrooms/:classroomId/students/:studentId/hand-raises/:weekStartDate
 * @access  Private (Teacher)
 */
exports.deleteHandRaise = async (req, res) => {
  try {
    const { classroomId, studentId, weekStartDate } = req.params;
    const teacher_id = req.user.id;

    // Kiểm tra quyền
    const classroom = await Classroom.findById(classroomId);
    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa dữ liệu này'
      });
    }

    // Xóa
    await StudentHandRaise.delete(classroomId, studentId, weekStartDate);

    // Tự động cập nhật performance
    await recalculatePerformance(classroomId, studentId);

    res.status(200).json({
      success: true,
      message: 'Xóa dữ liệu giơ tay thành công'
    });
  } catch (error) {
    console.error('Error deleting hand raise:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa dữ liệu giơ tay',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy ngày bắt đầu tuần hiện tại
 * @route   GET /api/v1/utils/current-week
 * @access  Private
 */
exports.getCurrentWeek = async (req, res) => {
  try {
    const weekStartDate = getWeekStartDate();
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    res.status(200).json({
      success: true,
      data: {
        week_start_date: weekStartDate,
        week_end_date: weekEndDate.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin tuần',
      error: error.message
    });
  }
};
