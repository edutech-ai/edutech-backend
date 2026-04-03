const ExamBatch = require('../models/ExamBatch');
const AnswerKey = require('../models/AnswerKey');
const Quiz = require('../models/Quiz');
const Classroom = require('../models/Classroom');

/**
 * @desc  Lấy danh sách đợt thi theo lớp học
 * @route GET /api/v1/omr/exam-batches/classroom/:classroomId
 * @access Private
 */
exports.getExamBatches = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const teacherId = req.user.id;

    const classroom = await Classroom.findById(classroomId);
    if (!classroom || classroom.teacher_id !== teacherId) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập lớp này' });
    }

    const batches = await ExamBatch.findByClassroom(classroomId);

    const data = batches.map(b => ({
      id: String(b.id),
      classroom_id: String(b.classroom_id),
      quiz_id: b.quiz_id,
      name: b.name,
      description: b.description,
      batch_type: b.batch_type,
      status: b.status,
      access_code: b.access_code,
      quiz_name: b.quiz_title,
      total_submissions: b.total_submissions ?? 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('getExamBatches error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Lấy chi tiết 1 đợt thi
 * @route GET /api/v1/omr/exam-batches/:batchId
 * @access Private
 */
exports.getExamBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const batch = await ExamBatch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đợt thi' });
    }

    res.json({
      success: true,
      data: {
        id: String(batch.id),
        classroom_id: String(batch.classroom_id),
        quiz_id: batch.quiz_id,
        name: batch.name,
        description: batch.description,
        batch_type: batch.batch_type,
        status: batch.status,
        access_code: batch.access_code,
        quiz_name: batch.quiz_title,
        total_submissions: batch.total_submissions ?? 0,
      },
    });
  } catch (err) {
    console.error('getExamBatch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Lấy đáp án của đợt thi (theo exam_code nếu có)
 * @route GET /api/v1/omr/answer-key/batch/:batchId?exam_code=XXX
 * @access Private
 */
exports.getAnswerKey = async (req, res) => {
  try {
    const { batchId } = req.params;
    const examCode = req.query.exam_code || null;

    const batch = await ExamBatch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đợt thi' });
    }

    let answerKey = await AnswerKey.findByQuizAndCode(batch.quiz_id, examCode);

    // Fall back to default key (no exam_code) if the specific code wasn't found
    if (!answerKey && examCode) {
      answerKey = await AnswerKey.findByQuizAndCode(batch.quiz_id, null);
    }

    if (!answerKey) {
      return res.status(404).json({ success: false, message: 'Chưa có đáp án cho đợt thi này' });
    }

    const totalQuestions = Object.keys(answerKey.correct_answers).length;

    res.json({
      success: true,
      data: {
        batch_id: String(batchId),
        exam_code: answerKey.exam_code ?? examCode ?? '',
        quiz_title: batch.quiz_title ?? '',
        total_questions: totalQuestions,
        correct_answers: answerKey.correct_answers,
        default_score_per_question: answerKey.default_score_per_question,
      },
    });
  } catch (err) {
    console.error('getAnswerKey error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Tạo đợt thi OMR mới (tự động tạo answer key từ quiz)
 * @route POST /api/v1/omr/exam-batches
 * @access Private
 */
exports.createExamBatch = async (req, res) => {
  try {
    const { quiz_id, classroom_id, name, description } = req.body;
    const teacherId = req.user.id;

    if (!quiz_id || !classroom_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'quiz_id, classroom_id và name là bắt buộc',
      });
    }

    const quiz = await Quiz.findById(quiz_id);
    if (!quiz || quiz.teacher_id !== teacherId) {
      return res.status(403).json({ success: false, message: 'Không có quyền dùng đề thi này' });
    }

    const classroom = await Classroom.findById(classroom_id);
    if (!classroom || classroom.teacher_id !== teacherId) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập lớp này' });
    }

    const batch = await ExamBatch.create({
      quiz_id,
      classroom_id,
      template_id: null,
      name,
      description: description ?? null,
      batch_type: 'exam',
      start_at: null,
      end_at: null,
      created_by: teacherId,
    });

    // Auto-generate answer key from quiz questions (using quiz's exam_code)
    const answerKey = await AnswerKey.createFromQuiz(quiz_id, quiz.exam_code ?? null, teacherId);

    await ExamBatch.update(batch.id, { status: 'open' });

    res.status(201).json({
      success: true,
      message: 'Tạo đợt thi thành công',
      data: {
        batch: {
          id: String(batch.id),
          classroom_id: String(batch.classroom_id),
          quiz_id: batch.quiz_id,
          name: batch.name,
          batch_type: batch.batch_type,
          status: 'open',
          access_code: batch.access_code,
          quiz_name: batch.quiz_title,
          total_submissions: 0,
        },
        answer_key: answerKey
          ? {
              exam_code: answerKey.exam_code,
              total_questions: Object.keys(answerKey.correct_answers).length,
            }
          : null,
      },
    });
  } catch (err) {
    console.error('createExamBatch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
