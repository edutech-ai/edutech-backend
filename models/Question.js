const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class Question {
  // Tạo câu hỏi mới
  static async create({ quiz_id, document_id, content, options, correct_answer, type = 'MCQ', point = 1.0, explanation }) {
    const questionId = uuidv7();
    
    // Convert arrays/objects to JSON string
    const optionsJson = options ? JSON.stringify(options) : null;
    const correctAnswerJson = JSON.stringify(correct_answer);
    
    // Convert empty string to null for document_id
    const documentIdValue = (document_id && document_id !== '') ? document_id : null;
    
    await db.query(
      `INSERT INTO questions (id, quiz_id, document_id, content, options, correct_answer, type, point, explanation) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [questionId, quiz_id, documentIdValue, content, optionsJson, correctAnswerJson, type, point, explanation]
    );
    
    return questionId;
  }

  // Tìm câu hỏi theo ID
  static async findById(id) {
    const [rows] = await db.query(
      `SELECT * FROM questions WHERE id = ? AND is_deleted = FALSE`,
      [id]
    );
    
    if (rows[0]) {
      // Parse JSON fields
      if (rows[0].options) {
        rows[0].options = typeof rows[0].options === 'string' 
          ? JSON.parse(rows[0].options) 
          : rows[0].options;
      }
      if (rows[0].correct_answer) {
        rows[0].correct_answer = typeof rows[0].correct_answer === 'string' 
          ? JSON.parse(rows[0].correct_answer) 
          : rows[0].correct_answer;
      }
    }
    
    return rows[0];
  }

  // Lấy tất cả câu hỏi của một quiz
  static async findByQuizId(quizId, includeAnswers = true) {
    const [rows] = await db.query(
      `SELECT * FROM questions WHERE quiz_id = ? AND is_deleted = FALSE ORDER BY created_at ASC`,
      [quizId]
    );
    
    return rows.map(row => {
      // Parse JSON fields
      if (row.options) {
        row.options = typeof row.options === 'string' ? JSON.parse(row.options) : row.options;
      }
      if (row.correct_answer) {
        row.correct_answer = typeof row.correct_answer === 'string' 
          ? JSON.parse(row.correct_answer) 
          : row.correct_answer;
      }
      
      // Ẩn đáp án nếu không cần thiết (cho học sinh làm bài)
      if (!includeAnswers) {
        delete row.correct_answer;
        delete row.explanation;
      }
      
      return row;
    });
  }

  // Lấy câu hỏi theo document_id
  static async findByDocumentId(documentId) {
    const [rows] = await db.query(
      `SELECT * FROM questions WHERE document_id = ? AND is_deleted = FALSE ORDER BY created_at ASC`,
      [documentId]
    );
    
    return rows.map(row => {
      if (row.options) {
        row.options = typeof row.options === 'string' ? JSON.parse(row.options) : row.options;
      }
      if (row.correct_answer) {
        row.correct_answer = typeof row.correct_answer === 'string' 
          ? JSON.parse(row.correct_answer) 
          : row.correct_answer;
      }
      return row;
    });
  }

  // Cập nhật câu hỏi
  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.content !== undefined) {
      fields.push('content = ?');
      values.push(data.content);
    }
    if (data.options !== undefined) {
      fields.push('options = ?');
      values.push(JSON.stringify(data.options));
    }
    if (data.correct_answer !== undefined) {
      fields.push('correct_answer = ?');
      values.push(JSON.stringify(data.correct_answer));
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.point !== undefined) {
      fields.push('point = ?');
      values.push(data.point);
    }
    if (data.explanation !== undefined) {
      fields.push('explanation = ?');
      values.push(data.explanation);
    }
    if (data.document_id !== undefined) {
      fields.push('document_id = ?');
      // Convert empty string to null
      values.push((data.document_id && data.document_id !== '') ? data.document_id : null);
    }

    if (fields.length === 0) return;

    values.push(id);
    
    await db.query(
      `UPDATE questions SET ${fields.join(', ')} WHERE id = ? AND is_deleted = FALSE`,
      values
    );

    return this.findById(id);
  }

  // Soft delete câu hỏi
  static async delete(id) {
    await db.query(
      `UPDATE questions SET is_deleted = TRUE WHERE id = ?`,
      [id]
    );
  }

  // Hard delete câu hỏi
  static async hardDelete(id) {
    await db.query(`DELETE FROM questions WHERE id = ?`, [id]);
  }

  // Xóa tất cả câu hỏi của một quiz
  static async deleteByQuizId(quizId) {
    await db.query(
      `UPDATE questions SET is_deleted = TRUE WHERE quiz_id = ?`,
      [quizId]
    );
  }

  // Đếm số lượng câu hỏi theo loại trong một quiz
  static async countByType(quizId) {
    const [rows] = await db.query(
      `SELECT type, COUNT(*) as count 
       FROM questions 
       WHERE quiz_id = ? AND is_deleted = FALSE 
       GROUP BY type`,
      [quizId]
    );
    return rows;
  }

  // Tính tổng điểm của quiz
  static async getTotalPoints(quizId) {
    const [rows] = await db.query(
      `SELECT SUM(point) as total FROM questions WHERE quiz_id = ? AND is_deleted = FALSE`,
      [quizId]
    );
    return rows[0].total || 0;
  }

  // Bulk create - Tạo nhiều câu hỏi cùng lúc
  static async bulkCreate(questions) {
    const values = [];
    const placeholders = [];

    for (const q of questions) {
      const questionId = uuidv7();
      const optionsJson = q.options ? JSON.stringify(q.options) : null;
      const correctAnswerJson = JSON.stringify(q.correct_answer);
      // Convert empty string to null for document_id
      const documentIdValue = (q.document_id && q.document_id !== '') ? q.document_id : null;
      
      placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?)');
      values.push(
        questionId,
        q.quiz_id,
        documentIdValue,
        q.content,
        optionsJson,
        correctAnswerJson,
        q.type || 'MCQ',
        q.point || 1.0,
        q.explanation || null
      );
    }

    if (placeholders.length === 0) return [];

    const query = `INSERT INTO questions 
      (id, quiz_id, document_id, content, options, correct_answer, type, point, explanation) 
      VALUES ${placeholders.join(', ')}`;

    await db.query(query, values);
    
    return questions.map((q, index) => values[index * 9]); // Return IDs
  }
}

module.exports = Question;
