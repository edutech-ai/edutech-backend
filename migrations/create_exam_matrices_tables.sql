-- =============================================
-- MA TRẬN ĐỀ THI (EXAM MATRICES)
-- =============================================

-- exam_matrices
CREATE TABLE IF NOT EXISTS exam_matrices (
    id VARCHAR(36) PRIMARY KEY,
    teacher_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(50) NOT NULL,
    grade INT NOT NULL CHECK (grade >= 1 AND grade <= 12),
    description TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_subject (subject),
    INDEX idx_grade (grade),
    INDEX idx_is_deleted (is_deleted),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- exam_matrix_chapters
CREATE TABLE IF NOT EXISTS exam_matrix_chapters (
    id VARCHAR(36) PRIMARY KEY,
    matrix_id VARCHAR(36) NOT NULL,
    chapter_name VARCHAR(255) NOT NULL,
    
    recognition_count INT DEFAULT 0,
    recognition_score DECIMAL(10, 2) DEFAULT 0.00,
    
    comprehension_count INT DEFAULT 0,
    comprehension_score DECIMAL(10, 2) DEFAULT 0.00,
    
    application_count INT DEFAULT 0,
    application_score DECIMAL(10, 2) DEFAULT 0.00,
    
    high_application_count INT DEFAULT 0,
    high_application_score DECIMAL(10, 2) DEFAULT 0.00,
    
    order_index INT DEFAULT 0,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key
    FOREIGN KEY (matrix_id) REFERENCES exam_matrices(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_matrix_id (matrix_id),
    INDEX idx_order_index (order_index),
    INDEX idx_is_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
