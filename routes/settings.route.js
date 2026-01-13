const express = require('express');
const SettingsController = require('../controllers/settings.controller');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');
const {
    createPricePlanValidation,
    updatePricePlanValidation
} = require('../middlewares/settings.validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Settings management APIs (Admin only)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PricePlan:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: UUID of the price plan
 *         plan_name:
 *           type: string
 *           description: Name of the pricing plan
 *           example: Free
 *         description:
 *           type: string
 *           description: Description of the plan
 *           example: Giáo viên mới bắt đầu
 *         price:
 *           type: number
 *           description: Price in VND
 *           example: 0
 *         discount_percent:
 *           type: number
 *           description: Discount percentage (0-100)
 *           example: 0
 *         billing_type:
 *           type: string
 *           enum: [monthly, yearly]
 *           description: Billing cycle type
 *           example: monthly
 *         button_text:
 *           type: string
 *           description: Text displayed on the action button
 *           example: Đăng ký free
 *         benefits:
 *           type: array
 *           items:
 *             type: string
 *           description: List of plan benefits
 *           example: ["Quản lí lớp học cơ bản", "Giao diện trực quan"]
 *         is_active:
 *           type: boolean
 *           description: Whether the plan is active
 *           example: true
 *         display_order:
 *           type: integer
 *           description: Display order for sorting
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/settings/price-plans:
 *   get:
 *     summary: Lấy danh sách tất cả price plans
 *     tags: [Settings]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Chỉ lấy plans đang active (true) hoặc tất cả (false)
 *     responses:
 *       200:
 *         description: Danh sách price plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PricePlan'
 *                 count:
 *                   type: integer
 *       500:
 *         description: Server error
 */
router.get('/price-plans', SettingsController.getAllPricePlans);

/**
 * @swagger
 * /api/v1/settings/price-plans/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết một price plan
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của price plan
 *     responses:
 *       200:
 *         description: Thông tin price plan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PricePlan'
 *       404:
 *         description: Price plan không tồn tại
 *       500:
 *         description: Server error
 */
router.get('/price-plans/:id', SettingsController.getPricePlanById);

/**
 * @swagger
 * /api/v1/settings/price-plans:
 *   post:
 *     summary: Tạo price plan mới (Admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan_name
 *               - price
 *               - billing_type
 *             properties:
 *               plan_name:
 *                 type: string
 *                 example: Free
 *               description:
 *                 type: string
 *                 example: Giáo viên mới bắt đầu
 *               price:
 *                 type: number
 *                 example: 0
 *               discount_percent:
 *                 type: number
 *                 example: 0
 *               billing_type:
 *                 type: string
 *                 enum: [monthly, yearly]
 *                 example: monthly
 *               button_text:
 *                 type: string
 *                 example: Đăng ký free
 *               benefits:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Quản lí lớp học cơ bản", "Giao diện trực quan"]
 *               display_order:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Price plan được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PricePlan'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 *       500:
 *         description: Server error
 */
router.post('/price-plans', authenticate, authorizeAdmin, createPricePlanValidation, SettingsController.createPricePlan);

/**
 * @swagger
 * /api/v1/settings/price-plans/{id}:
 *   put:
 *     summary: Cập nhật price plan (Admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của price plan
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan_name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               discount_percent:
 *                 type: number
 *               billing_type:
 *                 type: string
 *                 enum: [monthly, yearly]
 *               button_text:
 *                 type: string
 *               benefits:
 *                 type: array
 *                 items:
 *                   type: string
 *               is_active:
 *                 type: boolean
 *               display_order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Price plan được cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PricePlan'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 *       404:
 *         description: Price plan không tồn tại
 *       500:
 *         description: Server error
 */
router.put('/price-plans/:id', authenticate, authorizeAdmin, updatePricePlanValidation, SettingsController.updatePricePlan);

/**
 * @swagger
 * /api/v1/settings/price-plans/{id}:
 *   delete:
 *     summary: Xóa price plan (Admin only) - Soft delete
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của price plan
 *     responses:
 *       200:
 *         description: Price plan được xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 *       404:
 *         description: Price plan không tồn tại
 *       500:
 *         description: Server error
 */
router.delete('/price-plans/:id', authenticate, authorizeAdmin, SettingsController.deletePricePlan);

module.exports = router;
