const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class PricePlan {
  static async create({
    plan_name,
    description,
    price,
    discount_percent = 0,
    billing_type = 'monthly',
    button_text = 'Đăng ký',
    benefits = [],
    display_order = 0
  }) {
    const planId = uuidv7();

    await db.query(
      `INSERT INTO price_plans (
        id, plan_name, description, price, discount_percent, 
        billing_type, button_text, benefits, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        planId,
        plan_name,
        description,
        price,
        discount_percent,
        billing_type,
        button_text,
        JSON.stringify(benefits),
        display_order
      ]
    );

    return planId;
  }

  static async findAll(activeOnly = true) {
    const query = activeOnly
      ? `SELECT * FROM price_plans WHERE is_active = TRUE ORDER BY display_order ASC, created_at ASC`
      : `SELECT * FROM price_plans ORDER BY display_order ASC, created_at ASC`;

    const [rows] = await db.query(query);

    return rows.map(row => ({
      ...row,
      benefits: typeof row.benefits === 'string' ? JSON.parse(row.benefits) : row.benefits
    }));
  }

  static async findById(id) {
    const [rows] = await db.query(
      `SELECT * FROM price_plans WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const plan = rows[0];
    return {
      ...plan,
      benefits: typeof plan.benefits === 'string' ? JSON.parse(plan.benefits) : plan.benefits
    };
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.plan_name !== undefined) {
      fields.push('plan_name = ?');
      values.push(data.plan_name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.price !== undefined) {
      fields.push('price = ?');
      values.push(data.price);
    }
    if (data.discount_percent !== undefined) {
      fields.push('discount_percent = ?');
      values.push(data.discount_percent);
    }
    if (data.billing_type !== undefined) {
      fields.push('billing_type = ?');
      values.push(data.billing_type);
    }
    if (data.button_text !== undefined) {
      fields.push('button_text = ?');
      values.push(data.button_text);
    }
    if (data.benefits !== undefined) {
      fields.push('benefits = ?');
      values.push(JSON.stringify(data.benefits));
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
      `UPDATE price_plans SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.query(
      `UPDATE price_plans SET is_active = FALSE WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }

  static async hardDelete(id) {
    const [result] = await db.query(
      `DELETE FROM price_plans WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }
}

module.exports = PricePlan;
