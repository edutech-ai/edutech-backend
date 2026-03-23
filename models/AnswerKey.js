const db = require('../config/database');
const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E'];

class AnswerKey {
  // Tạo đáp án chuẩn
  static async create({
    quiz_id,
    exam_code = null,
    correct_answers,
    score_per_question = null,
    default_score_per_question = 0.2,
    created_by
  }) {
    const query = `
      INSERT INTO answer_keys 
      (quiz_id, exam_code, correct_answers, score_per_question, default_score_per_question, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.execute(query, [
      quiz_id,
      exam_code,
      JSON.stringify(correct_answers),
      score_per_question ? JSON.stringify(score_per_question) : null,
      default_score_per_question,
      created_by
    ]);

    return this.findById(result.insertId);
  }

  // Tạo tự động từ questions trong quiz
  static async createFromQuiz(quiz_id, exam_code = null, created_by) {
    const [rows] = await db.query(
      `SELECT correct_answer, options, point FROM questions
       WHERE quiz_id = ? AND is_deleted = FALSE ORDER BY created_at ASC`,
      [quiz_id]
    );

    if (rows.length === 0) throw new Error('Quiz không có câu hỏi nào');

    const correct_answers = {};
    let default_score = 0.2;

    rows.forEach((q, i) => {
      let answer = q.correct_answer;
      // Parse if stored as JSON string
      if (typeof answer === 'string') {
        try { answer = JSON.parse(answer); } catch (_) { /* keep as-is */ }
      }
      // Normalize number index (0-based) → letter
      if (typeof answer === 'number') {
        answer = CHOICE_LETTERS[answer] ?? String(answer);
      }
      // Ensure single uppercase letter
      if (typeof answer === 'string') {
        answer = answer.trim().toUpperCase().charAt(0);
      }
      correct_answers[String(i + 1)] = answer || 'A';

      // Derive default score from first question point
      if (i === 0 && q.point) default_score = parseFloat(q.point);
    });

    return this.create({
      quiz_id,
      exam_code,
      correct_answers,
      default_score_per_question: default_score,
      created_by
    });
  }

  // Lấy answer key theo quiz_id và exam_code
  static async findByQuizAndCode(quiz_id, exam_code = null) {
    let query = 'SELECT * FROM answer_keys WHERE quiz_id = ?';
    const params = [quiz_id];

    if (exam_code) {
      query += ' AND exam_code = ?';
      params.push(exam_code);
    } else {
      query += ' AND exam_code IS NULL';
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    const [rows] = await db.execute(query, params);
    
    if (rows.length === 0) return null;
    
    const answerKey = rows[0];
    answerKey.correct_answers = JSON.parse(answerKey.correct_answers);
    if (answerKey.score_per_question) {
      answerKey.score_per_question = JSON.parse(answerKey.score_per_question);
    }
    return answerKey;
  }

  // Lấy theo ID
  static async findById(id) {
    const query = 'SELECT * FROM answer_keys WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    
    if (rows.length === 0) return null;
    
    const answerKey = rows[0];
    answerKey.correct_answers = JSON.parse(answerKey.correct_answers);
    if (answerKey.score_per_question) {
      answerKey.score_per_question = JSON.parse(answerKey.score_per_question);
    }
    return answerKey;
  }

  // Update answer key
  static async update(id, updates) {
    const allowedFields = ['correct_answers', 'score_per_question', 'default_score_per_question', 'exam_code'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        
        if (key === 'correct_answers' || key === 'score_per_question') {
          values.push(value ? JSON.stringify(value) : null);
        } else {
          values.push(value);
        }
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `UPDATE answer_keys SET ${fields.join(', ')} WHERE id = ?`;
    await db.execute(query, values);

    return this.findById(id);
  }

  // Xóa answer key
  static async delete(id) {
    const query = 'DELETE FROM answer_keys WHERE id = ?';
    await db.execute(query, [id]);
    return true;
  }

  // Tính điểm dựa trên detected_answers
  static calculateScore(answerKey, detectedAnswers) {
    const correctAnswers = answerKey.correct_answers;
    const scorePerQuestion = answerKey.score_per_question || {};
    const defaultScore = answerKey.default_score_per_question;

    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let emptyCount = 0;

    const details = {};

    for (const [questionNum, correctAnswer] of Object.entries(correctAnswers)) {
      const detectedAnswer = detectedAnswers[questionNum];
      
      if (!detectedAnswer || detectedAnswer === null) {
        emptyCount++;
        details[questionNum] = {
          detected: null,
          correct: correctAnswer,
          is_correct: false,
          score: 0
        };
      } else if (detectedAnswer === correctAnswer) {
        correctCount++;
        const score = scorePerQuestion[questionNum] || defaultScore;
        totalScore += score;
        details[questionNum] = {
          detected: detectedAnswer,
          correct: correctAnswer,
          is_correct: true,
          score
        };
      } else {
        wrongCount++;
        details[questionNum] = {
          detected: detectedAnswer,
          correct: correctAnswer,
          is_correct: false,
          score: 0
        };
      }
    }

    return {
      total_score: Math.round(totalScore * 100) / 100, // Round to 2 decimals
      correct_count: correctCount,
      wrong_count: wrongCount,
      empty_count: emptyCount,
      details
    };
  }
}

module.exports = AnswerKey;
