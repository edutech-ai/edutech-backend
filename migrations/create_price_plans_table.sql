-- Date: 2026-01-13

CREATE TABLE IF NOT EXISTS price_plans (
  id VARCHAR(36) PRIMARY KEY,
  plan_name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  billing_type ENUM('monthly', 'yearly') NOT NULL DEFAULT 'monthly',
  button_text VARCHAR(50) DEFAULT 'Đăng ký',
  benefits JSON,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active),
  INDEX idx_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
