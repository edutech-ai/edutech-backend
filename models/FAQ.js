const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class FAQ {
    static async create({
        question,
        answer,
        category = null,
        display_order = 0
    }) {
        const faqId = uuidv7();

        await db.query(
            `INSERT INTO faqs (id, question, answer, category, display_order) 
       VALUES (?, ?, ?, ?, ?)`,
            [faqId, question, answer, category, display_order]
        );

        return faqId;
    }

    static async findAll(activeOnly = true) {
        const query = activeOnly
            ? `SELECT * FROM faqs WHERE is_active = TRUE ORDER BY display_order ASC, created_at ASC`
            : `SELECT * FROM faqs ORDER BY display_order ASC, created_at ASC`;

        const [rows] = await db.query(query);
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.query(
            `SELECT * FROM faqs WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) return null;
        return rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];

        if (data.question !== undefined) {
            fields.push('question = ?');
            values.push(data.question);
        }
        if (data.answer !== undefined) {
            fields.push('answer = ?');
            values.push(data.answer);
        }
        if (data.category !== undefined) {
            fields.push('category = ?');
            values.push(data.category);
        }
        if (data.is_active !== undefined) {
            fields.push('is_active = ?');
            values.push(data.is_active);
        }
        if (data.display_order !== undefined) {
            fields.push('display_order = ?');
            values.push(data.display_order);
        }

        if (fields.length === 0) return false;

        values.push(id);

        const [result] = await db.query(
            `UPDATE faqs SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        return result.affectedRows > 0;
    }

    static async delete(id) {
        const [result] = await db.query(
            `UPDATE faqs SET is_active = FALSE WHERE id = ?`,
            [id]
        );

        return result.affectedRows > 0;
    }

    static async hardDelete(id) {
        const [result] = await db.query(
            `DELETE FROM faqs WHERE id = ?`,
            [id]
        );

        return result.affectedRows > 0;
    }
}

module.exports = FAQ;
