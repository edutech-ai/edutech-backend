ALTER TABLE quizzes 
ADD COLUMN visibility ENUM('private', 'community') NOT NULL DEFAULT 'private' 
COMMENT 'Phạm vi hiển thị: private (chỉ mình tôi), community (chia sẻ cộng đồng)' 
AFTER status;

-- Cập nhật tất cả quiz hiện tại thành private
UPDATE quizzes SET visibility = 'private' WHERE visibility IS NULL OR visibility = '';

-- Thêm index cho visibility
CREATE INDEX idx_visibility ON quizzes(visibility);
