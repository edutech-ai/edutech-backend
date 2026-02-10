const ExamMatrix = require('../models/ExamMatrix');
const { validationResult } = require('express-validator');

class ExamMatrixController {
    // Tạo ma trận mới
    static async createMatrix(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { name, subject, grade, description, chapters } = req.body;
            const teacher_id = req.user.id;

            // Tạo ma trận
            const matrixId = await ExamMatrix.create({
                teacher_id,
                name,
                subject,
                grade,
                description
            });

            // Nếu có chapters, tạo luôn
            if (chapters && chapters.length > 0) {
                await ExamMatrix.bulkCreateChapters(matrixId, chapters);
            }

            // Trả về ma trận với chi tiết
            const matrix = await ExamMatrix.findByIdWithDetails(matrixId);

            res.status(201).json({
                success: true,
                message: 'Tạo ma trận đề thi thành công',
                data: matrix
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Không thể tạo ma trận đề thi',
                error: error.message
            });
        }
    }

    // Lấy danh sách ma trận của giáo viên
    static async getMyMatrices(req, res) {
        try {
            const teacherId = req.user.id;
            const { subject, grade, search, page, limit } = req.query;

            const filters = {
                subject,
                grade,
                search,
                page: page || 1,
                limit: limit || 20
            };

            const matrices = await ExamMatrix.findByTeacherId(teacherId, filters);
            const total = await ExamMatrix.countByTeacherId(teacherId, filters);

            // Thêm thông tin tổng hợp cho mỗi ma trận
            const matricesWithDetails = await Promise.all(
                matrices.map(async (matrix) => {
                    const chapters = await ExamMatrix.getChapters(matrix.id);

                    let totalQuestions = 0;
                    let totalScoreCents = 0;
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
                        total_chapters: chapters.length,
                        total_questions: totalQuestions,
                        total_score: totalScoreCents / 100
                    };
                })
            );

            res.json({
                success: true,
                data: matricesWithDetails,
                pagination: {
                    page: parseInt(filters.page),
                    limit: parseInt(filters.limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(filters.limit))
                }
            });
        } catch (error) {
            // console.error('Get my matrices error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy danh sách ma trận đề thi',
                error: error.message
            });
        }
    }

    // Lấy chi tiết ma trận theo ID
    static async getMatrixById(req, res) {
        try {
            const { id } = req.params;
            const matrix = await ExamMatrix.findByIdWithDetails(id);

            if (!matrix) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy ma trận đề thi'
                });
            }

            // Kiểm tra quyền truy cập
            if (matrix.teacher_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập ma trận này'
                });
            }

            res.json({
                success: true,
                data: matrix
            });
        } catch (error) {
            // console.error('Get matrix by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy thông tin ma trận đề thi',
                error: error.message
            });
        }
    }

    // Cập nhật ma trận
    static async updateMatrix(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { id } = req.params;
            const matrix = await ExamMatrix.findById(id);

            if (!matrix) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy ma trận đề thi'
                });
            }

            // Kiểm tra quyền sở hữu
            if (matrix.teacher_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền cập nhật ma trận này'
                });
            }

            const { name, subject, grade, description, chapters } = req.body;

            // Cập nhật thông tin chung
            await ExamMatrix.update(id, { name, subject, grade, description });

            // Nếu có chapters, xóa tất cả chương cũ và tạo mới
            if (chapters !== undefined) {
                await ExamMatrix.deleteAllChapters(id);
                if (chapters && chapters.length > 0) {
                    await ExamMatrix.bulkCreateChapters(id, chapters);
                }
            }

            const updatedMatrix = await ExamMatrix.findByIdWithDetails(id);

            res.json({
                success: true,
                message: 'Cập nhật ma trận đề thi thành công',
                data: updatedMatrix
            });
        } catch (error) {
            // console.error('Update matrix error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể cập nhật ma trận đề thi',
                error: error.message
            });
        }
    }

    // Xóa ma trận (soft delete)
    static async deleteMatrix(req, res) {
        try {
            const { id } = req.params;
            const matrix = await ExamMatrix.findById(id);

            if (!matrix) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy ma trận đề thi'
                });
            }

            // Kiểm tra quyền sở hữu
            if (matrix.teacher_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xóa ma trận này'
                });
            }

            await ExamMatrix.delete(id);

            res.json({
                success: true,
                message: 'Xóa ma trận đề thi thành công'
            });
        } catch (error) {
            // console.error('Delete matrix error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể xóa ma trận đề thi',
                error: error.message
            });
        }
    }

    // Thêm chương mới vào ma trận
    static async addChapter(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { id } = req.params; // matrix_id
            const matrix = await ExamMatrix.findById(id);

            if (!matrix) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy ma trận đề thi'
                });
            }

            // Kiểm tra quyền sở hữu
            if (matrix.teacher_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập'
                });
            }

            const {
                chapter_name,
                recognition_count,
                recognition_score,
                comprehension_count,
                comprehension_score,
                application_count,
                application_score,
                high_application_count,
                high_application_score,
                order_index
            } = req.body;

            const chapterId = await ExamMatrix.addChapter({
                matrix_id: id,
                chapter_name,
                recognition_count,
                recognition_score,
                comprehension_count,
                comprehension_score,
                application_count,
                application_score,
                high_application_count,
                high_application_score,
                order_index
            });

            const chapter = await ExamMatrix.findChapterById(chapterId);

            res.status(201).json({
                success: true,
                message: 'Thêm chương thành công',
                data: chapter
            });
        } catch (error) {
            // console.error('Add chapter error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể thêm chương',
                error: error.message
            });
        }
    }

    // Cập nhật chương
    static async updateChapter(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { id, chapterId } = req.params;
            const matrix = await ExamMatrix.findById(id);

            if (!matrix) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy ma trận đề thi'
                });
            }

            // Kiểm tra quyền sở hữu
            if (matrix.teacher_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập'
                });
            }

            const chapter = await ExamMatrix.findChapterById(chapterId);
            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy chương'
                });
            }

            // Kiểm tra chương thuộc ma trận
            if (chapter.matrix_id !== id) {
                return res.status(400).json({
                    success: false,
                    message: 'Chương không thuộc ma trận này'
                });
            }

            const updatedChapter = await ExamMatrix.updateChapter(chapterId, req.body);

            res.json({
                success: true,
                message: 'Cập nhật chương thành công',
                data: updatedChapter
            });
        } catch (error) {
            // console.error('Update chapter error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể cập nhật chương',
                error: error.message
            });
        }
    }

    // Xóa chương
    static async deleteChapter(req, res) {
        try {
            const { id, chapterId } = req.params;
            const matrix = await ExamMatrix.findById(id);

            if (!matrix) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy ma trận đề thi'
                });
            }

            // Kiểm tra quyền sở hữu
            if (matrix.teacher_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập'
                });
            }

            const chapter = await ExamMatrix.findChapterById(chapterId);
            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy chương'
                });
            }

            // Kiểm tra chương thuộc ma trận
            if (chapter.matrix_id !== id) {
                return res.status(400).json({
                    success: false,
                    message: 'Chương không thuộc ma trận này'
                });
            }

            await ExamMatrix.deleteChapter(chapterId);

            res.json({
                success: true,
                message: 'Xóa chương thành công'
            });
        } catch (error) {
            // console.error('Delete chapter error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể xóa chương',
                error: error.message
            });
        }
    }

    // Lấy danh sách chương của ma trận
    static async getChapters(req, res) {
        try {
            const { id } = req.params;
            const matrix = await ExamMatrix.findById(id);

            if (!matrix) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy ma trận đề thi'
                });
            }

            // Kiểm tra quyền truy cập
            if (matrix.teacher_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập'
                });
            }

            const chapters = await ExamMatrix.getChapters(id);

            // Tính tổng
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

            res.json({
                success: true,
                data: {
                    matrix: {
                        id: matrix.id,
                        name: matrix.name,
                        subject: matrix.subject,
                        grade: matrix.grade
                    },
                    chapters,
                    summary: {
                        total_chapters: chapters.length,
                        total_questions: totalQuestions,
                        total_score: totalScoreCents / 100
                    }
                }
            });
        } catch (error) {
            // console.error('Get chapters error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy danh sách chương',
                error: error.message
            });
        }
    }
}

module.exports = ExamMatrixController;
