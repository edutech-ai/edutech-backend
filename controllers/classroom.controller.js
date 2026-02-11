const { validationResult } = require('express-validator');
const Classroom = require('../models/Classroom');
const Student = require('../models/Student');
const ClassroomStudent = require('../models/ClassroomStudent');
const StudentPerformance = require('../models/StudentPerformance');
const xlsx = require('xlsx');
const NotificationHelper = require('../utils/notificationHelper');

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

    // Tạo thông báo tạo lớp thành công
    NotificationHelper.notifyClassroomCreated(teacher_id, name, classroomId).catch(err =>
      console.error('Create notification error:', err)
    );

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

    // Tạo thông báo thêm học sinh vào lớp
    NotificationHelper.notifyStudentAdded(teacher_id, classroom.name, classroomId).catch(err =>
      console.error('Create notification error:', err)
    );

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

    // Tạo thông báo thêm học sinh vào lớp
    NotificationHelper.notifyStudentAdded(teacher_id, classroom.name, classroomId).catch(err =>
      console.error('Create notification error:', err)
    );

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

/**
 * @desc    Upload danh sách học sinh từ file XLSX
 * @route   POST /api/students/upload
 * @access  Private (Teacher)
 */
exports.uploadStudentsXLSX = async (req, res) => {
  try {
    // Kiểm tra file có được upload không
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng upload file XLSX'
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

    // Xử lý từng học sinh
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 vì bắt đầu từ hàng 2 (hàng 1 là header)

      try {
        // Validate dữ liệu
        const student_code = row.student_code?.toString().trim();
        const full_name = row.full_name?.toString().trim();
        const phone_number = row.phone?.toString().trim() || null;
        const parent_phone_number = row.parent_phone?.toString().trim() || null;

        // Kiểm tra các field bắt buộc
        if (!student_code || !full_name) {
          results.errors.push({
            row: rowNumber,
            data: row,
            message: 'Thiếu mã học sinh hoặc tên học sinh'
          });
          continue;
        }

        // Kiểm tra mã học sinh đã tồn tại chưa
        const existingStudent = await Student.findByStudentCode(student_code);
        if (existingStudent) {
          results.errors.push({
            row: rowNumber,
            data: row,
            message: `Mã học sinh ${student_code} đã tồn tại`
          });
          continue;
        }

        // Tạo học sinh mới
        const studentId = await Student.create({
          full_name,
          student_code,
          phone_number,
          parent_phone_number,
          is_active: true
        });

        results.success.push({
          row: rowNumber,
          student_code,
          full_name,
          id: studentId
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
      message: `Đã xử lý ${results.total} học sinh`,
      data: {
        total: results.total,
        successCount: results.success.length,
        errorCount: results.errors.length,
        success: results.success,
        errors: results.errors
      }
    });

  } catch (error) {
    console.error('Error uploading students XLSX:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi upload file XLSX',
      error: error.message
    });
  }
};

/**
 * @desc    Upload danh sách học sinh từ file XLSX và gán vào lớp học
 * @route   POST /api/classrooms/:classroomId/students/upload
 * @access  Private (Teacher)
 */
exports.uploadStudentsToClassroom = async (req, res) => {
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
        message: 'Bạn không có quyền thêm học sinh vào lớp này'
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
      total: data.length,
      created: [],
      added: [],
      existing: []
    };

    // Xử lý từng học sinh
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 vì bắt đầu từ hàng 2 (hàng 1 là header)

      try {
        // Validate dữ liệu
        const student_code = row.student_code?.toString().trim();
        const full_name = row.full_name?.toString().trim();
        const phone_number = row.phone?.toString().trim() || null;
        const parent_phone_number = row.parent_phone?.toString().trim() || null;

        // Kiểm tra các field bắt buộc
        if (!student_code || !full_name) {
          results.errors.push({
            row: rowNumber,
            data: row,
            message: 'Thiếu mã học sinh hoặc tên học sinh'
          });
          continue;
        }

        let studentId;
        let isNewStudent = false;

        // Kiểm tra mã học sinh đã tồn tại chưa
        const existingStudent = await Student.findByStudentCode(student_code);
        if (existingStudent) {
          studentId = existingStudent.id;

          // Kiểm tra học sinh đã có trong lớp chưa
          const inClassroom = await ClassroomStudent.exists(classroomId, studentId);
          if (inClassroom) {
            results.existing.push({
              row: rowNumber,
              student_code,
              full_name,
              message: 'Học sinh đã có trong lớp'
            });
            continue;
          }
        } else {
          // Tạo học sinh mới
          studentId = await Student.create({
            full_name,
            student_code,
            phone_number,
            parent_phone_number,
            is_active: true
          });
          isNewStudent = true;
          results.created.push({
            row: rowNumber,
            student_code,
            full_name,
            id: studentId
          });
        }

        // Thêm học sinh vào lớp
        await ClassroomStudent.create({
          classroom_id: classroomId,
          student_id: studentId,
          status: 'active'
        });

        // Tạo bản ghi performance cho học sinh trong lớp
        await StudentPerformance.upsert({
          classroom_id: classroomId,
          student_id: studentId,
          total_exams: 0,
          average_score: null,
          subject_performance: null,
          strong_topic: null,
          weak_topic: null
        });

        results.success.push({
          row: rowNumber,
          student_code,
          full_name,
          id: studentId,
          isNew: isNewStudent
        });

        if (!isNewStudent) {
          results.added.push({
            row: rowNumber,
            student_code,
            full_name,
            id: studentId
          });
        }

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
      message: `Đã xử lý ${results.total} học sinh. Tạo mới: ${results.created.length}, Thêm vào lớp: ${results.added.length}, Đã có trong lớp: ${results.existing.length}, Lỗi: ${results.errors.length}`,
      data: {
        total: results.total,
        successCount: results.success.length,
        createdCount: results.created.length,
        addedCount: results.added.length,
        existingCount: results.existing.length,
        errorCount: results.errors.length,
        success: results.success,
        created: results.created,
        added: results.added,
        existing: results.existing,
        errors: results.errors
      }
    });

  } catch (error) {
    console.error('Error uploading students to classroom:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi upload danh sách học sinh vào lớp',
      error: error.message
    });
  }
};
