const { validationResult } = require('express-validator');
const Classroom = require('../models/Classroom');
const Student = require('../models/Student');
const ClassroomStudent = require('../models/ClassroomStudent');
const StudentPerformance = require('../models/StudentPerformance');

// ============================================================
// CLASSROOM CRUD
// ============================================================

/**
 * @desc    Tạo lớp học mới
 * @route   POST /api/classrooms
 * @access  Private (Teacher)
 */
exports.createClassroom = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, school_year, description, avatar_url, status } = req.body;
    const teacher_id = req.user.id;

    const classroomId = await Classroom.create({
      teacher_id,
      name,
      school_year,
      description,
      avatar_url,
      status
    });

    const classroom = await Classroom.findById(classroomId);

    res.status(201).json({
      success: true,
      message: 'Tạo lớp học thành công',
      data: classroom
    });
  } catch (error) {
    console.error('Error creating classroom:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo lớp học',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy danh sách lớp học
 * @route   GET /api/classrooms
 * @access  Private (Teacher)
 */
exports.getClassrooms = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const teacher_id = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const filters = {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const classrooms = await Classroom.findByTeacherId(teacher_id, filters);
    const count = await Classroom.countByTeacherId(teacher_id, { status });

    res.status(200).json({
      success: true,
      data: {
        classrooms,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting classrooms:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách lớp học',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy thông tin lớp học theo ID
 * @route   GET /api/classrooms/:id
 * @access  Private (Teacher)
 */
exports.getClassroomById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const teacher_id = req.user.id;

    const classroom = await Classroom.findById(id);

    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    // Đếm số học sinh trong lớp
    const studentCount = await Classroom.countStudents(id);

    res.status(200).json({
      success: true,
      data: {
        ...classroom,
        student_count: studentCount
      }
    });
  } catch (error) {
    console.error('Error getting classroom:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin lớp học',
      error: error.message
    });
  }
};

/**
 * @desc    Cập nhật thông tin lớp học
 * @route   PUT /api/classrooms/:id
 * @access  Private (Teacher)
 */
exports.updateClassroom = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const teacher_id = req.user.id;
    const updateData = req.body;

    const classroom = await Classroom.findById(id);

    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    await Classroom.update(id, updateData);
    const updatedClassroom = await Classroom.findById(id);

    res.status(200).json({
      success: true,
      message: 'Cập nhật lớp học thành công',
      data: updatedClassroom
    });
  } catch (error) {
    console.error('Error updating classroom:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật lớp học',
      error: error.message
    });
  }
};

/**
 * @desc    Xóa lớp học
 * @route   DELETE /api/classrooms/:id
 * @access  Private (Teacher)
 */
exports.deleteClassroom = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const teacher_id = req.user.id;

    const classroom = await Classroom.findById(id);

    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    // Xóa các bản ghi liên quan
    await ClassroomStudent.deleteByClassroomId(id);
    await StudentPerformance.deleteByClassroomId(id);
    await Classroom.delete(id);

    res.status(200).json({
      success: true,
      message: 'Xóa lớp học thành công'
    });
  } catch (error) {
    console.error('Error deleting classroom:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa lớp học',
      error: error.message
    });
  }
};

// ============================================================
// STUDENT CRUD
// ============================================================

/**
 * @desc    Tạo học sinh mới
 * @route   POST /api/students
 * @access  Private (Teacher)
 */
exports.createStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { full_name, student_code, phone_number, parent_phone_number, is_active } = req.body;

    // Kiểm tra mã học sinh đã tồn tại chưa
    const existingStudent = await Student.findByStudentCode(student_code);
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Mã học sinh đã tồn tại'
      });
    }

    const studentId = await Student.create({
      full_name,
      student_code,
      phone_number,
      parent_phone_number,
      is_active
    });

    const student = await Student.findById(studentId);

    res.status(201).json({
      success: true,
      message: 'Tạo học sinh thành công',
      data: student
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo học sinh',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy danh sách học sinh
 * @route   GET /api/students
 * @access  Private (Teacher)
 */
exports.getStudents = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const filters = {
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const students = await Student.findAll(filters);
    const count = await Student.count(filters);

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách học sinh',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy thông tin học sinh theo ID
 * @route   GET /api/students/:id
 * @access  Private (Teacher)
 */
exports.getStudentById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học sinh'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error getting student:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin học sinh',
      error: error.message
    });
  }
};

/**
 * @desc    Cập nhật thông tin học sinh
 * @route   PUT /api/students/:id
 * @access  Private (Teacher)
 */
exports.updateStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học sinh'
      });
    }

    // Kiểm tra mã học sinh trùng nếu cập nhật student_code
    if (updateData.student_code && updateData.student_code !== student.student_code) {
      const existingStudent = await Student.findByStudentCode(updateData.student_code);
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: 'Mã học sinh đã tồn tại'
        });
      }
    }

    await Student.update(id, updateData);
    const updatedStudent = await Student.findById(id);

    res.status(200).json({
      success: true,
      message: 'Cập nhật học sinh thành công',
      data: updatedStudent
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật học sinh',
      error: error.message
    });
  }
};

/**
 * @desc    Xóa học sinh
 * @route   DELETE /api/students/:id
 * @access  Private (Teacher)
 */
exports.deleteStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học sinh'
      });
    }

    // Xóa các bản ghi liên quan
    await ClassroomStudent.deleteByStudentId(id);
    await StudentPerformance.deleteByStudentId(id);
    await Student.delete(id);

    res.status(200).json({
      success: true,
      message: 'Xóa học sinh thành công'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa học sinh',
      error: error.message
    });
  }
};

// ============================================================
// CLASSROOM-STUDENT MANAGEMENT
// ============================================================

/**
 * @desc    Thêm học sinh vào lớp
 * @route   POST /api/classrooms/:classroomId/students
 * @access  Private (Teacher)
 */
exports.addStudentToClassroom = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { classroomId } = req.params;
    const { student_id, status = 'active' } = req.body;
    const teacher_id = req.user.id;

    // Kiểm tra lớp học có thuộc giáo viên không
    const classroom = await Classroom.findById(classroomId);

    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    // Kiểm tra học sinh có tồn tại không
    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học sinh'
      });
    }

    // Kiểm tra học sinh đã trong lớp chưa
    const existing = await ClassroomStudent.exists(classroomId, student_id);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Học sinh đã có trong lớp'
      });
    }

    await ClassroomStudent.create({
      classroom_id: classroomId,
      student_id,
      status
    });

    res.status(201).json({
      success: true,
      message: 'Thêm học sinh vào lớp thành công'
    });
  } catch (error) {
    console.error('Error adding student to classroom:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm học sinh vào lớp',
      error: error.message
    });
  }
};

/**
 * @desc    Tạo học sinh mới và thêm vào lớp
 * @route   POST /api/v1/classrooms/:classroomId/students
 * @access  Private (Teacher)
 */
exports.createStudentAndAddToClassroom = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { classroomId } = req.params;
    const { full_name, student_code, phone_number, parent_phone_number, is_active = true, status = 'active' } = req.body;
    const teacher_id = req.user.id;

    // Kiểm tra lớp học có thuộc giáo viên không
    const classroom = await Classroom.findById(classroomId);

    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    // Kiểm tra mã học sinh đã tồn tại chưa
    const existingStudent = await Student.findByStudentCode(student_code);
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Mã học sinh đã tồn tại'
      });
    }

    // Tạo học sinh mới
    const studentId = await Student.create({
      full_name,
      student_code,
      phone_number,
      parent_phone_number,
      is_active
    });

    // Thêm học sinh vào lớp
    await ClassroomStudent.create({
      classroom_id: classroomId,
      student_id: studentId,
      status
    });

    const student = await Student.findById(studentId);

    res.status(201).json({
      success: true,
      message: 'Tạo học sinh và thêm vào lớp thành công',
      data: student
    });
  } catch (error) {
    console.error('Error creating student and adding to classroom:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo học sinh và thêm vào lớp',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy danh sách học sinh trong lớp
 * @route   GET /api/classrooms/:classroomId/students
 * @access  Private (Teacher)
 */
exports.getClassroomStudents = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { classroomId } = req.params;
    const { status } = req.query;
    const teacher_id = req.user.id;

    // Kiểm tra lớp học có thuộc giáo viên không
    const classroom = await Classroom.findById(classroomId);

    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    const students = await ClassroomStudent.findByClassroomId(classroomId, status);

    res.status(200).json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Error getting classroom students:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách học sinh trong lớp',
      error: error.message
    });
  }
};

/**
 * @desc    Xóa học sinh khỏi lớp
 * @route   DELETE /api/classrooms/:classroomId/students/:studentId
 * @access  Private (Teacher)
 */
exports.removeStudentFromClassroom = async (req, res) => {
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

    // Kiểm tra lớp học có thuộc giáo viên không
    const classroom = await Classroom.findById(classroomId);

    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    const existing = await ClassroomStudent.exists(classroomId, studentId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Học sinh không có trong lớp'
      });
    }

    // Xóa performance của học sinh trong lớp này
    await StudentPerformance.delete(classroomId, studentId);
    await ClassroomStudent.delete(classroomId, studentId);

    res.status(200).json({
      success: true,
      message: 'Xóa học sinh khỏi lớp thành công'
    });
  } catch (error) {
    console.error('Error removing student from classroom:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa học sinh khỏi lớp',
      error: error.message
    });
  }
};

/**
 * @desc    Cập nhật trạng thái học sinh trong lớp
 * @route   PUT /api/classrooms/:classroomId/students/:studentId
 * @access  Private (Teacher)
 */
exports.updateStudentStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { classroomId, studentId } = req.params;
    const { status } = req.body;
    const teacher_id = req.user.id;

    // Kiểm tra lớp học có thuộc giáo viên không
    const classroom = await Classroom.findById(classroomId);

    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    const existing = await ClassroomStudent.exists(classroomId, studentId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Học sinh không có trong lớp'
      });
    }

    await ClassroomStudent.updateStatus(classroomId, studentId, status);

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái học sinh thành công'
    });
  } catch (error) {
    console.error('Error updating student status:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái học sinh',
      error: error.message
    });
  }
};

// ============================================================
// STUDENT PERFORMANCE
// ============================================================

/**
 * @desc    Lấy thông tin học lực học sinh trong lớp
 * @route   GET /api/classrooms/:classroomId/students/:studentId/performance
 * @access  Private (Teacher)
 */
exports.getStudentPerformance = async (req, res) => {
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

    // Kiểm tra lớp học có thuộc giáo viên không
    const classroom = await Classroom.findById(classroomId);

    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    const performance = await StudentPerformance.findOne(classroomId, studentId);

    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Chưa có dữ liệu học lực của học sinh trong lớp này'
      });
    }

    res.status(200).json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Error getting student performance:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin học lực',
      error: error.message
    });
  }
};

/**
 * @desc    Cập nhật thông tin học lực học sinh
 * @route   PUT /api/classrooms/:classroomId/students/:studentId/performance
 * @access  Private (Teacher)
 */
exports.updateStudentPerformance = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { classroomId, studentId } = req.params;
    const { total_exams, average_score, subject_performance, strong_topic, weak_topic } = req.body;
    const teacher_id = req.user.id;

    // Kiểm tra lớp học có thuộc giáo viên không
    const classroom = await Classroom.findById(classroomId);

    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    // Kiểm tra học sinh có trong lớp không
    const classroomStudent = await ClassroomStudent.exists(classroomId, studentId);

    if (!classroomStudent) {
      return res.status(404).json({
        success: false,
        message: 'Học sinh không có trong lớp'
      });
    }

    // Tạo hoặc cập nhật performance
    await StudentPerformance.upsert({
      classroom_id: classroomId,
      student_id: studentId,
      total_exams,
      average_score,
      subject_performance,
      strong_topic,
      weak_topic
    });

    const performance = await StudentPerformance.findOne(classroomId, studentId);

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin học lực thành công',
      data: performance
    });
  } catch (error) {
    console.error('Error updating student performance:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật thông tin học lực',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy bảng xếp hạng học sinh trong lớp
 * @route   GET /api/classrooms/:classroomId/leaderboard
 * @access  Private (Teacher)
 */
exports.getClassroomLeaderboard = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const teacher_id = req.user.id;

    // Kiểm tra lớp học có thuộc giáo viên không
    const classroom = await Classroom.findById(classroomId);

    if (!classroom || classroom.teacher_id !== teacher_id) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    const leaderboard = await StudentPerformance.getLeaderboard(classroomId);

    res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error getting classroom leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy bảng xếp hạng',
      error: error.message
    });
  }
};
