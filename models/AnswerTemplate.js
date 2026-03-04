const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class AnswerTemplate {
  // Tạo template mới
  static async create({
    name,
    description,
    template_type = 'standard',
    total_questions,
    options_per_question = 4,
    template_config,
    template_image_url
  }) {
    const query = `
      INSERT INTO answer_templates 
      (name, description, template_type, total_questions, options_per_question, template_config, template_image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.execute(query, [
      name,
      description,
      template_type,
      total_questions,
      options_per_question,
      JSON.stringify(template_config),
      template_image_url
    ]);

    return this.findById(result.insertId);
  }

  // Lấy template theo ID
  static async findById(id) {
    const query = 'SELECT * FROM answer_templates WHERE id = ? AND is_active = TRUE';
    const [rows] = await db.execute(query, [id]);
    
    if (rows.length === 0) return null;
    
    const template = rows[0];
    template.template_config = JSON.parse(template.template_config);
    return template;
  }

  // Lấy tất cả templates active
  static async findAll({ template_type = null } = {}) {
    let query = 'SELECT * FROM answer_templates WHERE is_active = TRUE';
    const params = [];

    if (template_type) {
      query += ' AND template_type = ?';
      params.push(template_type);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.execute(query, params);
    return rows.map(row => ({
      ...row,
      template_config: JSON.parse(row.template_config)
    }));
  }

  // Update template
  static async update(id, updates) {
    const allowedFields = [
      'name', 'description', 'template_type', 'total_questions', 
      'options_per_question', 'template_config', 'template_image_url'
    ];

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(key === 'template_config' ? JSON.stringify(value) : value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `UPDATE answer_templates SET ${fields.join(', ')} WHERE id = ?`;
    await db.execute(query, values);

    return this.findById(id);
  }

  // Soft delete
  static async delete(id) {
    const query = 'UPDATE answer_templates SET is_active = FALSE WHERE id = ?';
    await db.execute(query, [id]);
    return true;
  }

  // Lấy template mặc định
  static async getDefault() {
    const query = `
      SELECT * FROM answer_templates 
      WHERE is_active = TRUE AND template_type = 'standard'
      ORDER BY created_at ASC
      LIMIT 1
    `;
    const [rows] = await db.execute(query);
    
    if (rows.length === 0) return null;
    
    const template = rows[0];
    template.template_config = JSON.parse(template.template_config);
    return template;
  }
}

module.exports = AnswerTemplate;
