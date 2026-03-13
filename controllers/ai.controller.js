const cozeService = require('../services/coze.service');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Document = require('../models/Document');
const { uploadToCloudinary, getFileType } = require('../utils/cloudinary');
const QuizNormalizer = require('../utils/quizNormalizer');
const fs = require('fs');
const { validationResult } = require('express-validator');

class AIController {
  /**
   * Generate quiz and create new quiz record - prompt case
   * POST /api/v1/ai/create-quiz-with-questions
   */
  static async createQuizWithQuestions(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Xác thực thất bại',
          errors: errors.array()
        });
      }

      const {
        // Quiz metadata
        title,
        description,
        subject,
        grade,
        duration,
        difficulty: quizDifficulty,
        status = 'draft',
        // Generation params
        topic,
        numberOfQuestions,
        questionTypes,
        customPrompt,
        quizMatrix,
      } = req.body;

      // 0. Validate prompt
      // if (customPrompt) {
      //   const validation = await cozeService.validatePrompt(customPrompt);

      //   // If validation service fails (API error, timeout, etc.), block creation
      //   if (!validation.success) {
      //     return res.status(400).json({
      //       success: false,
      //       message: 'Không thể xác thực nội dung yêu cầu. Vui lòng thử lại sau.',
      //       error: validation.error
      //     });
      //   }

      //   // If validation service returns rejection
      //   if (validation.data) {
      //     const { is_test_description, comment, suggested_fix } = validation.data;

      //     if (is_test_description === false) {
      //       return res.status(200).json({
      //         success: false,
      //         message: 'Mô tả bài kiểm tra chưa đủ thông tin hoặc không hợp lệ',
      //         data: {
      //           is_test_description: false,
      //           comment,
      //           suggested_fix,
      //           validation_result: validation.data
      //         }
      //       });
      //     }
      //   }
      // }

      const teacherId = req.user.id;

      // 1. Create the quiz first
      const quizId = await Quiz.create({
        teacher_id: teacherId,
        title: title || `Đề thi AI - ${subject} Lớp ${grade}`,
        description: description || `Đề thi tự động về ${topic || subject}`,
        subject,
        grade,
        duration,
        difficulty: quizDifficulty || 'medium',
        status,
      });

      // 2. Generate questions using AI
      const result = await cozeService.generateAndNormalizeQuiz({
        subject,
        grade,
        topic,
        numberOfQuestions: numberOfQuestions || 10,
        questionTypes: questionTypes || ['MCQ'],
        difficulty: quizDifficulty || 'medium',
        customPrompt,
        quizMatrix,
      }, quizId);

      if (!result.success) {
        // Rollback: delete the quiz if generation failed
        await Quiz.delete(quizId);

        return res.status(500).json({
          success: false,
          message: 'Tạo câu hỏi thất bại',
          error: result.error,
        });
      }

      // 3. Save generated questions
      const { questions } = result.data;

      if (questions.length > 0) {
        await Question.bulkCreate(questions);
      }

      // 4. Get complete quiz with details
      const quiz = await Quiz.findByIdWithDetails(quizId);

      res.status(201).json({
        success: true,
        message: `Tạo đề thi quiz với ${questions.length} câu hỏi được tạo bởi AI`,
        data: {
          quiz,
          generationInfo: {
            chatId: result.chatId,
            conversationId: result.conversationId,
            metadata: result.data.metadata,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Tạo đề thi thất bại',
        error: error.message,
      });
    }
  }

  /**
   * Convert exam PDF to quiz using AI
   * POST /api/v1/ai/convert-exam
   */
  static async convertExamFromPDF(req, res) {
    try {
      const uploadedFile = req.files?.file;
      if (!uploadedFile) {
        return res.status(400).json({ success: false, message: 'Vui lòng upload file đề thi' });
      }

      const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;

      // 5MB limit (Coze constraint)
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'File quá lớn, tối đa 5MB' });
      }

      const { title, subject, grade, duration } = req.body;
      const teacherId = req.user.id;

      const fileBuffer = fs.readFileSync(file.tempFilePath);
      const fileName = file.name;
      const mimeType = file.mimetype;

      // 1. Upload to Coze for AI processing
      let cozeFile;
      try {
        cozeFile = await cozeService.uploadFileToCoze(fileBuffer, fileName, mimeType);
      } catch (err) {
        return res.status(502).json({ success: false, message: 'Upload file lên AI thất bại', error: err.message });
      }

      // 3. Convert via Coze AI (before Cloudinary to get subject/grade from AI)
      const convertResult = await cozeService.convertExamFromFile(cozeFile.id);

      if (!convertResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Chuyển đổi đề thi thất bại',
          error: convertResult.error,
          rawContent: convertResult.rawContent,
        });
      }

      const cozeOutput = convertResult.data;

      // Merge: user input takes priority, AI output as fallback
      const resolvedSubject = subject || cozeOutput.subject || null;
      const resolvedGrade = grade ? parseInt(grade) : (cozeOutput.grade ? parseInt(cozeOutput.grade) : null);

      // 2. Upload to Cloudinary & save to documents library (root folder)
      const cloudinaryResult = await uploadToCloudinary(fileBuffer, teacherId, fileName);
      const document = await Document.create({
        teacher_id: teacherId,
        folder_id: null,
        name: title || fileName.replace(/\.[^.]+$/, ''),
        type: getFileType(mimeType),
        file_url: cloudinaryResult.url,
        cloudinary_id: cloudinaryResult.cloudinary_id,
        file_size: cloudinaryResult.bytes,
        mime_type: mimeType,
        original_filename: fileName,
        is_public: false,
        subject: resolvedSubject,
        grade: resolvedGrade,
        tags: [],
      });

      // 4. Create quiz record
      const quizTitle = title || cozeOutput.title || fileName.replace(/\.[^.]+$/, '');
      const quizId = await Quiz.create({
        teacher_id: teacherId,
        title: quizTitle,
        description: `Đề thi được chuyển đổi từ file: ${fileName}`,
        subject: resolvedSubject,
        grade: resolvedGrade,
        duration: duration ? parseInt(duration) : (cozeOutput.total_minutes || null),
        difficulty: 'medium',
        status: 'draft',
      });

      // 5. Normalize and save questions
      const normalized = QuizNormalizer.normalizeQuiz(cozeOutput, quizId);
      if (normalized.questions.length > 0) {
        await Question.bulkCreate(normalized.questions);
      }

      // 6. Get complete quiz with details
      const quiz = await Quiz.findByIdWithDetails(quizId);

      res.status(201).json({
        success: true,
        message: `Chuyển đổi thành công ${normalized.questions.length} câu hỏi từ đề thi`,
        data: {
          quiz,
          document: {
            id: document.id,
            name: document.name,
            file_url: document.file_url,
          },
          conversionInfo: {
            total_questions: cozeOutput.total_questions,
            total_score: cozeOutput.total_score,
            total_minutes: cozeOutput.total_minutes,
          },
        },
      });
    } catch (error) {
      console.error('convertExamFromPDF error:', error);
      res.status(500).json({ success: false, message: 'Chuyển đổi đề thi thất bại', error: error.message });
    }
  }

  /**
   * [DEBUG] Return raw AI response for exam conversion without saving to DB
   */
  // static async convertExamRaw(req, res) {
  //   try {
  //     const uploadedFile = req.files?.file;
  //     if (!uploadedFile) {
  //       return res.status(400).json({ success: false, message: 'Vui lòng upload file đề thi' });
  //     }

  //     const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
  //     const fileBuffer = fs.readFileSync(file.tempFilePath);

  //     // Upload to Coze
  //     let cozeFile;
  //     try {
  //       cozeFile = await cozeService.uploadFileToCoze(fileBuffer, file.name, file.mimetype);
  //     } catch (err) {
  //       return res.status(502).json({ success: false, message: 'Upload file lên AI thất bại', error: err.message });
  //     }

  //     // Get raw response from AI
  //     const convertResult = await cozeService.convertExamFromFile(cozeFile.id);

  //     res.json({
  //       success: convertResult.success,
  //       cozeFileId: cozeFile.id,
  //       rawContent: convertResult.data || null,
  //       error: convertResult.error || null,
  //       unparsedContent: convertResult.rawContent || null,
  //     });
  //   } catch (error) {
  //     console.error('convertExamRaw error:', error);
  //     res.status(500).json({ success: false, error: error.message });
  //   }
  // }

  /**
   * Analyze quiz quality using AI
   * POST /api/v1/ai/analyze-quiz
   */
  static async analyzeQuiz(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Xác thực thất bại',
          errors: errors.array()
        });
      }

      const { quiz_id, description } = req.body;
      const teacherId = req.user.id;

      // 1. Get quiz with questions from database
      const quiz = await Quiz.findByIdWithDetails(quiz_id);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đề thi'
        });
      }

      // 2. Check permission
      if (quiz.teacher_id !== teacherId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền phân tích đề thi này'
        });
      }

      // 3. Get questions for this quiz
      const questions = await Question.findByQuizId(quiz_id, true);

      // 4. Validate quiz has questions
      if (!questions || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Đề thi chưa có câu hỏi nào. Vui lòng thêm câu hỏi trước khi phân tích.'
        });
      }

      // 5. Prepare quiz data for AI analysis with full context
      const quizData = {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          subject: quiz.subject,
          grade: quiz.grade,
          difficulty: quiz.difficulty,
          total_time: quiz.duration ? `${quiz.duration} phút` : 'Không giới hạn',
          user_description: description
        },
        questions: questions.map(q => ({
          id: q.id,
          content: q.content,
          type: q.type,
          point: q.point,
          answer: q.options,
          correct_answer: q.correct_answer,
          difficulty: q.difficulty
        })),
        total: questions.length
      };

      // 4. Send to AI for analysis
      const result = await cozeService.analyzeQuiz(quizData);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Phân tích đề thi thất bại',
          error: result.error,
          rawContent: result.rawContent
        });
      }

      // 5. Return analysis
      res.status(200).json({
        success: true,
        message: 'Phân tích đề thi thành công',
        data: result.data,
        metadata: {
          quiz_id: quiz.id,
          quiz_title: quiz.title,
          analyzed_at: new Date().toISOString(),
          chatId: result.chatId,
          conversationId: result.conversationId
        }
      });
    } catch (error) {
      console.error('Error analyzing quiz:', error);
      res.status(500).json({
        success: false,
        message: 'Phân tích đề thi thất bại',
        error: error.message
      });
    }
  }
}

module.exports = AIController;
