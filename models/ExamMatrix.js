const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class ExamMatrix {

    // Tạo ma trận mới
    static async create({ teacher_id, name, subject, grade, description }) {
        const matrixId = uuidv7();

        await db.query(
            `INSERT INTO exam_matrices (id, teacher_id, name, subject, grade, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
            [matrixId, teacher_id, name, subject, grade, description]
        );

        return matrixId;
    }

    // Tìm ma trận theo ID
    static async findById(id) {
        const [rows] = await db.query(
            `SELECT * FROM exam_matrices WHERE id = ? AND is_deleted = FALSE`,
            [id]
        );
        return rows[0];
    }

    // Lấy tất cả ma trận của một giáo viên
    static async findByTeacherId(teacherId, filters = {}) {
        let query = `SELECT * FROM exam_matrices WHERE teacher_id = ? AND is_deleted = FALSE`;
        const params = [teacherId];

        // Filter by subject
        if (filters.subject) {
            query += ` AND subject = ?`;
            params.push(filters.subject);
        }

        // Filter by grade
        if (filters.grade) {
            query += ` AND grade = ?`;
            params.push(parseInt(filters.grade));
        }

        // Search by name
        if (filters.search) {
            query += ` AND name LIKE ?`;
            params.push(`%${filters.search}%`);
        }

        query += ` ORDER BY created_at DESC`;

        // Pagination
        if (filters.limit) {
            const limit = parseInt(filters.limit);
            const offset = filters.page ? (parseInt(filters.page) - 1) * limit : 0;
            query += ` LIMIT ? OFFSET ?`;
            params.push(limit, offset);
        }

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Đếm tổng số ma trận của giáo viên
    static async countByTeacherId(teacherId, filters = {}) {
        let query = `SELECT COUNT(*) as total FROM exam_matrices WHERE teacher_id = ? AND is_deleted = FALSE`;
        const params = [teacherId];

        if (filters.subject) {
            query += ` AND subject = ?`;
            params.push(filters.subject);
        }

        if (filters.grade) {
            query += ` AND grade = ?`;
            params.push(parseInt(filters.grade));
        }

        if (filters.search) {
            query += ` AND name LIKE ?`;
            params.push(`%${filters.search}%`);
        }

        const [rows] = await db.query(query, params);
        return rows[0].total;
    }

    // Cập nhật ma trận
    static async update(id, data) {
        const fields = [];
        const values = [];

        if (data.name !== undefined) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.subject !== undefined) {
            fields.push('subject = ?');
            values.push(data.subject);
        }
        if (data.grade !== undefined) {
            fields.push('grade = ?');
            values.push(data.grade);
        }
        if (data.description !== undefined) {
            fields.push('description = ?');
            values.push(data.description);
        }

        if (fields.length === 0) return;

        values.push(id);

        await db.query(
            `UPDATE exam_matrices SET ${fields.join(', ')} WHERE id = ? AND is_deleted = FALSE`,
            values
        );

        return this.findById(id);
    }

    // Soft delete ma trận
    static async delete(id) {
        await db.query(
            `UPDATE exam_matrices SET is_deleted = TRUE WHERE id = ?`,
            [id]
        );
        // Soft delete all chapters of this matrix
        await db.query(
            `UPDATE exam_matrix_chapters SET is_deleted = TRUE WHERE matrix_id = ?`,
            [id]
        );
    }

    // Hard delete ma trận
    static async hardDelete(id) {
        await db.query(`DELETE FROM exam_matrix_chapters WHERE matrix_id = ?`, [id]);
        await db.query(`DELETE FROM exam_matrices WHERE id = ?`, [id]);
    }

    // Thêm chương vào ma trận
    static async addChapter({
        matrix_id,
        chapter_name,
        recognition_count = 0,
        recognition_score = 0,
        comprehension_count = 0,
        comprehension_score = 0,
        application_count = 0,
        application_score = 0,
        high_application_count = 0,
        high_application_score = 0,
        order_index = 0
    }) {
        const chapterId = uuidv7();

        await db.query(
            `INSERT INTO exam_matrix_chapters 
       (id, matrix_id, chapter_name, recognition_count, recognition_score, 
        comprehension_count, comprehension_score, application_count, application_score,
        high_application_count, high_application_score, order_index) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                chapterId, matrix_id, chapter_name,
                recognition_count, recognition_score,
                comprehension_count, comprehension_score,
                application_count, application_score,
                high_application_count, high_application_score,
                order_index
            ]
        );

        return chapterId;
    }

    // Lấy tất cả chương của một ma trận
    static async getChapters(matrixId) {
        const [rows] = await db.query(
            `SELECT * FROM exam_matrix_chapters WHERE matrix_id = ? AND is_deleted = FALSE ORDER BY order_index ASC`,
            [matrixId]
        );
        return rows;
    }

    // Tìm chương theo ID
    static async findChapterById(chapterId) {
        const [rows] = await db.query(
            `SELECT * FROM exam_matrix_chapters WHERE id = ? AND is_deleted = FALSE`,
            [chapterId]
        );
        return rows[0];
    }

    // Cập nhật chương
    static async updateChapter(chapterId, data) {
        const fields = [];
        const values = [];

        if (data.chapter_name !== undefined) {
            fields.push('chapter_name = ?');
            values.push(data.chapter_name);
        }
        if (data.recognition_count !== undefined) {
            fields.push('recognition_count = ?');
            values.push(data.recognition_count);
        }
        if (data.recognition_score !== undefined) {
            fields.push('recognition_score = ?');
            values.push(data.recognition_score);
        }
        if (data.comprehension_count !== undefined) {
            fields.push('comprehension_count = ?');
            values.push(data.comprehension_count);
        }
        if (data.comprehension_score !== undefined) {
            fields.push('comprehension_score = ?');
            values.push(data.comprehension_score);
        }
        if (data.application_count !== undefined) {
            fields.push('application_count = ?');
            values.push(data.application_count);
        }
        if (data.application_score !== undefined) {
            fields.push('application_score = ?');
            values.push(data.application_score);
        }
        if (data.high_application_count !== undefined) {
            fields.push('high_application_count = ?');
            values.push(data.high_application_count);
        }
        if (data.high_application_score !== undefined) {
            fields.push('high_application_score = ?');
            values.push(data.high_application_score);
        }
        if (data.order_index !== undefined) {
            fields.push('order_index = ?');
            values.push(data.order_index);
        }

        if (fields.length === 0) return;

        values.push(chapterId);

        await db.query(
            `UPDATE exam_matrix_chapters SET ${fields.join(', ')} WHERE id = ? AND is_deleted = FALSE`,
            values
        );

        return this.findChapterById(chapterId);
    }

    // Xóa chương (soft delete)
    static async deleteChapter(chapterId) {
        await db.query(
            `UPDATE exam_matrix_chapters SET is_deleted = TRUE WHERE id = ?`,
            [chapterId]
        );
    }

    // Bulk create chapters - Tạo nhiều chương cùng lúc
    static async bulkCreateChapters(matrixId, chapters) {
        const values = [];
        const placeholders = [];

        for (let i = 0; i < chapters.length; i++) {
            const ch = chapters[i];
            const chapterId = uuidv7();

            placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            values.push(
                chapterId,
                matrixId,
                ch.chapter_name,
                ch.recognition_count || 0,
                ch.recognition_score || 0,
                ch.comprehension_count || 0,
                ch.comprehension_score || 0,
                ch.application_count || 0,
                ch.application_score || 0,
                ch.high_application_count || 0,
                ch.high_application_score || 0,
                ch.order_index !== undefined ? ch.order_index : i
            );
        }

        if (placeholders.length === 0) return [];

        const query = `INSERT INTO exam_matrix_chapters 
      (id, matrix_id, chapter_name, recognition_count, recognition_score,
       comprehension_count, comprehension_score, application_count, application_score,
       high_application_count, high_application_score, order_index) 
      VALUES ${placeholders.join(', ')}`;

        await db.query(query, values);

        return chapters.map((_, index) => values[index * 12]); // Return IDs
    }

    // Xóa tất cả chương của một ma trận (để thay thế)
    static async deleteAllChapters(matrixId) {
        await db.query(
            `UPDATE exam_matrix_chapters SET is_deleted = TRUE WHERE matrix_id = ?`,
            [matrixId]
        );
    }

    // Lấy ma trận với thông tin chi tiết (bao gồm chương)
    static async findByIdWithDetails(id) {
        const matrix = await this.findById(id);
        if (!matrix) return null;

        const chapters = await this.getChapters(id);

        // Tính tổng số câu hỏi và tổng điểm
        let totalQuestions = 0;
        let totalScoreCents = 0; // Use cents to avoid floating point errors

        chapters.forEach(ch => {
            const recCount = parseInt(ch.recognition_count) || 0;
            const recScore = parseFloat(ch.recognition_score) || 0;
            const comCount = parseInt(ch.comprehension_count) || 0;
            const comScore = parseFloat(ch.comprehension_score) || 0;
            const appCount = parseInt(ch.application_count) || 0;
            const appScore = parseFloat(ch.application_score) || 0;
            const highCount = parseInt(ch.high_application_count) || 0;
            const highScore = parseFloat(ch.high_application_score) || 0;

            totalQuestions += recCount + comCount + appCount + highCount;

            // Total score = sum of (count × score) for each level
            totalScoreCents += Math.round(recCount * recScore * 100);
            totalScoreCents += Math.round(comCount * comScore * 100);
            totalScoreCents += Math.round(appCount * appScore * 100);
            totalScoreCents += Math.round(highCount * highScore * 100);
        });

        return {
            ...matrix,
            chapters,
            total_questions: totalQuestions,
            total_score: totalScoreCents / 100
        };
    }
}

module.exports = ExamMatrix;
