/**
 * SERVICE: OMR Answer Mapper
 * 
 * VẤN ĐỀ:
 * - Template OMR chỉ có A, B, C, D (vị trí ô tròn)
 * - Database Quiz lưu options là array: ["<p>text1</p>", "<p>text2</p>", ...]
 * - correct_answer lưu là text thực tế: "<p>text của đáp án</p>"
 * 
 * GIẢI PHÁP:
 * Tạo mapping A/B/C/D với index của array options
 * A = options[0], B = options[1], C = options[2], D = options[3]
 */

const db = require('../config/database');

class OMRAnswerMapper {
  /**
   * Tạo Answer Key từ Quiz với mapping A/B/C/D
   * 
   * @param {string} quiz_id 
   * @param {string} exam_code - Mã đề (optional, nếu có nhiều đề)
   * @returns {Object} { questionNumber: "A" | "B" | "C" | "D" }
   * 
   * EXAMPLE INPUT (từ DB):
   * Question 1:
   *   options: ["<p>3</p>", "<p>4</p>", "<p>5</p>", "<p>6</p>"]
   *   correct_answer: "<p>4</p>"
   * 
   * EXAMPLE OUTPUT:
   * { 1: "B" }  // Vì đáp án "4" nằm ở index 1 (B)
   */
  static async createAnswerKeyFromQuiz(quiz_id, exam_code = null) {
    try {
      // 1. Lấy tất cả questions của quiz (không có question_number trong bảng)
      const [questions] = await db.execute(
        `SELECT id, options, correct_answer, point 
         FROM questions 
         WHERE quiz_id = ? AND is_deleted = FALSE
         ORDER BY created_at`,
        [quiz_id]
      );

      if (questions.length === 0) {
        throw new Error('Quiz has no questions');
      }

      const answerKey = {};
      const scorePerQuestion = {};
      const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

      // 2. Duyệt từng câu hỏi và map đáp án
      let questionNum = 1;
      for (const q of questions) {
        // Parse JSON - kiểm tra xem đã là object chưa
        let options = q.options;
        if (typeof options === 'string') {
          try {
            options = JSON.parse(options);
          } catch (e) {
            console.warn(`Question ${questionNum}: Failed to parse options JSON`);
            options = null;
          }
        }
        
        let correctAnswer = q.correct_answer;
        
        // Parse correct_answer nếu là JSON string
        if (typeof correctAnswer === 'string') {
          try {
            correctAnswer = JSON.parse(correctAnswer);
          } catch (e) {
            // Nếu không parse được, giữ nguyên string
          }
        }

        // 3. Tìm vị trí của correct_answer trong options array
        if (options && Array.isArray(options)) {
          let answerLetter = null;

          // Trường hợp correct_answer là string (single choice)
          if (typeof correctAnswer === 'string') {
            const answerIndex = options.findIndex(opt => 
              this.normalizeText(opt) === this.normalizeText(correctAnswer)
            );

            if (answerIndex !== -1 && answerIndex < optionLetters.length) {
              answerLetter = optionLetters[answerIndex];
            } else {
              console.warn(`Question ${questionNum}: Cannot find correct answer in options`);
              answerLetter = null; // Đánh dấu cần kiểm tra
            }
          }
          // Trường hợp correct_answer là array (multiple choice)
          else if (Array.isArray(correctAnswer)) {
            // Lấy đáp án đầu tiên (hoặc có thể xử lý phức tạp hơn)
            const firstAnswer = correctAnswer[0];
            const answerIndex = options.findIndex(opt => 
              this.normalizeText(opt) === this.normalizeText(firstAnswer)
            );

            if (answerIndex !== -1) {
              answerLetter = optionLetters[answerIndex];
            }
          }

          answerKey[questionNum] = answerLetter;
        } else {
          // Không có options (câu tự luận?)
          answerKey[questionNum] = null;
        }
        
        scorePerQuestion[questionNum] = q.point || 0.2;
        questionNum++;
      }

      const scores = Object.values(scorePerQuestion);
      const totalScore = scores.reduce((sum, s) => sum + s, 0);
      const defaultScore = scores.length > 0 ? scores[0] : 1;

      return {
        quiz_id,
        exam_code,
        correct_answers: answerKey,
        score_per_question: Object.keys(scorePerQuestion).length > 0 ? scorePerQuestion : null,
        default_score_per_question: defaultScore,
        total_score: totalScore,
        total_questions: questions.length
      };

    } catch (error) {
      console.error('Create Answer Key Error:', error);
      throw error;
    }
  }

  /**
   * Normalize text để so sánh (loại bỏ HTML tags, trim, lowercase)
   */
  static normalizeText(text) {
    if (!text) return '';
    
    return text
      .replace(/<[^>]*>/g, '')  // Loại bỏ HTML tags
      .trim()
      .toLowerCase();
  }

  /**
   * Validate Answer Key: Kiểm tra xem có câu nào không map được không
   */
  static validateAnswerKey(answerKey) {
    const issues = [];
    
    for (const [questionNum, answer] of Object.entries(answerKey.correct_answers)) {
      if (answer === null) {
        issues.push({
          question: questionNum,
          issue: 'No answer mapped',
          severity: 'warning'
        });
      }
    }

    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }

  /**
   * Tạo và lưu Answer Key vào database
   */
  static async createAndSaveAnswerKey(quiz_id, exam_code = null, created_by) {
    const answerKeyData = await this.createAnswerKeyFromQuiz(quiz_id, exam_code);
    
    // Validate
    const validation = this.validateAnswerKey(answerKeyData);
    if (!validation.isValid) {
      throw new Error('Answer key validation failed: ' + JSON.stringify(validation.issues));
    }

    // Save to database
    const query = `
      INSERT INTO answer_keys 
      (quiz_id, exam_code, correct_answers, score_per_question, default_score_per_question, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      answerKeyData.quiz_id,
      answerKeyData.exam_code,
      JSON.stringify(answerKeyData.correct_answers),
      answerKeyData.score_per_question ? JSON.stringify(answerKeyData.score_per_question) : null,
      0.2, // default score
      created_by
    ]);

    return {
      id: result.insertId,
      ...answerKeyData,
      validation
    };
  }

  /**
   * Preview Answer Key trước khi lưu (để teacher kiểm tra)
   */
  static async previewAnswerKey(quiz_id) {
    const answerKeyData = await this.createAnswerKeyFromQuiz(quiz_id);
    
    // Lấy thêm thông tin chi tiết của từng câu
    const [questions] = await db.execute(
      `SELECT id, content, options, correct_answer 
       FROM questions 
       WHERE quiz_id = ? AND is_deleted = FALSE
       ORDER BY created_at`,
      [quiz_id]
    );

    let questionNum = 1;
    const preview = questions.map(q => {
      let options = q.options;
      if (typeof options === 'string') {
        try {
          options = JSON.parse(options);
        } catch (e) {
          options = [];
        }
      }
      
      const mappedAnswer = answerKeyData.correct_answers[questionNum];

      const result = {
        question_number: questionNum,
        question_text: this.normalizeText(q.content).substring(0, 50) + '...',
        options: options.map((opt, idx) => ({
          letter: ['A', 'B', 'C', 'D', 'E', 'F'][idx],
          text: this.normalizeText(opt).substring(0, 30)
        })),
        correct_answer_letter: mappedAnswer,
        is_mapped: mappedAnswer !== null
      };
      
      questionNum++;
      return result;
    });

    return {
      quiz_id,
      total_questions: questions.length,
      mapped_count: Object.values(answerKeyData.correct_answers).filter(a => a !== null).length,
      questions: preview
    };
  }

  /**
   * Xử lý trường hợp có nhiều mã đề (shuffled options)
   * Tạo nhiều answer keys cho các đề khác nhau
   */
  static async createMultipleExamCodes(quiz_id, exam_codes, created_by) {
    const results = [];

    for (const examCode of exam_codes) {
      // TODO: Nếu có logic shuffle options cho mỗi đề, thực hiện ở đây
      // Hiện tại chỉ tạo answer key giống nhau
      
      const answerKey = await this.createAndSaveAnswerKey(quiz_id, examCode, created_by);
      results.push(answerKey);
    }

    return results;
  }

  /**
   * Update Answer Key nếu teacher sửa options của question
   */
  static async updateAnswerKeyForQuestion(quiz_id, question_id) {
    // Tìm answer keys liên quan
    const [answerKeys] = await db.execute(
      'SELECT id, exam_code FROM answer_keys WHERE quiz_id = ?',
      [quiz_id]
    );

    // Re-generate cho từng answer key
    for (const ak of answerKeys) {
      const newData = await this.createAnswerKeyFromQuiz(quiz_id, ak.exam_code);
      
      await db.execute(
        'UPDATE answer_keys SET correct_answers = ?, updated_at = NOW() WHERE id = ?',
        [JSON.stringify(newData.correct_answers), ak.id]
      );
    }

    return { updated_count: answerKeys.length };
  }
}

module.exports = OMRAnswerMapper;
