const { validationResult } = require('express-validator');
const StudentHandRaise = require('../models/StudentHandRaise');
const Classroom = require('../models/Classroom');
const { recalculatePerformance } = require('../utils/performanceCalculator');

// ============================================================
// STUDENT HAND RAISES
// ============================================================

/**
 * @desc    Batch cập nhật giơ tay cho nhiều học sinh (cuối giờ)
 * @route   POST /api/v1/classrooms/:classroomId/hand-raises/batch
 * @access  Private (Teacher)
 */
exports.batchUpdateHandRaises = async (req, res) => {
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
    const { students } = req.body;

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
        message: 'Bạn không có quyền cập nhật giơ tay cho lớp này'
      });
    }

    const results = {
      success: [],
      errors: []
    };

    // Cập nhật từng học sinh
    for (const student of students) {
      try {
        const { student_id, add_count } = student;
        
        if (add_count > 0) {
          // Tăng số lần giơ tay
          const existing = await StudentHandRaise.findOne(classroomId, student_id);
          
          if (existing) {
            const newTotal = existing.total_hand_raises + add_count;
            await StudentHandRaise.updateTotal(classroomId, student_id, newTotal);
          } else {
            await StudentHandRaise.create({
              classroom_id: classroomId,
              student_id: student_id,
              total_hand_raises: add_count
            });
          }

          // Tự động cập nhật performance
          await recalculatePerformance(classroomId, student_id);

          results.success.push({
            student_id,
            added: add_count
          });
        }
      } catch (error) {
        results.errors.push({
          student_id: student.student_id,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Đã cập nhật ${results.success.length} học sinh`,
      data: {
        total: students.length,
        successCount: results.success.length,
        errorCount: results.errors.length,
        success: results.success,
        errors: results.errors
      }
    });
  } catch (error) {
    console.error('Error batch updating hand raises:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật giơ tay',
      error: error.message
    });
  }
};

/**
 * @desc    Cập nhật tổng số lần giơ tay của học sinh (thủ công)
 * @route   PUT /api/v1/classrooms/:classroomId/students/:studentId/hand-raises
 * @access  Private (Teacher)
 */
exports.updateHandRaiseTotal = async (req, res) => {
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
    const { total_hand_raises } = req.body;

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
        message: 'Bạn không có quyền cập nhật giơ tay cho lớp này'
      });
    }

    // Cập nhật tổng
    await StudentHandRaise.updateTotal(classroomId, studentId, total_hand_raises);

    // Tự động cập nhật performance
    await recalculatePerformance(classroomId, studentId);

    const updated = await StudentHandRaise.findOne(classroomId, studentId);

    res.status(200).json({
      success: true,
      message: 'Cập nhật tổng giơ tay thành công',
      data: updated
    });
  } catch (error) {
    console.error('Error updating hand raise total:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật tổng giơ tay',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy danh sách giơ tay của tất cả học sinh trong lớp
 * @route   GET /api/v1/classrooms/:classroomId/hand-raises
 * @access  Private (Teacher)
 */
exports.getClassroomHandRaises = async (req, res) => {
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
        message: 'Bạn không có quyền xem dữ liệu của lớp này'
      });
    }

    // Lấy tất cả học sinh với dữ liệu giơ tay
    const students = await StudentHandRaise.findByClassroom(classroomId);

    res.status(200).json({
      success: true,
      data: {
        total_students: students.length,
        students
      }
    });
  } catch (error) {
    console.error('Error getting classroom hand raises:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy dữ liệu giơ tay',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy thông tin giơ tay của một học sinh
 * @route   GET /api/v1/classrooms/:classroomId/students/:studentId/hand-raises
 * @access  Private (Teacher)
 */
exports.getStudentHandRaise = async (req, res) => {
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
        message: 'Bạn không có quyền xem dữ liệu của lớp này'
      });
    }

    const stats = await StudentHandRaise.getStatistics(classroomId, studentId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting student hand raise:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy dữ liệu giơ tay',
      error: error.message
    });
  }
};

/**
 * @desc    Xóa dữ liệu giơ tay của học sinh (reset về 0)
 * @route   DELETE /api/v1/classrooms/:classroomId/students/:studentId/hand-raises
 * @access  Private (Teacher)
 */
exports.deleteHandRaise = async (req, res) => {
  try {
    const { classroomId, studentId } = req.params;
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
    await StudentHandRaise.delete(classroomId, studentId);

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
