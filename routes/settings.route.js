const express = require('express');
const SettingsController = require('../controllers/settings.controller');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');
const {
    createSubscriptionPlanValidation,
    updateSubscriptionPlanValidation,
    createFAQValidation,
    updateFAQValidation
} = require('../middlewares/settings.validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Settings management APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SubscriptionPlan:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: UUID of the subscription plan
 *         code:
 *           type: string
 *           description: Unique code for the plan
 *           example: FREE
 *         name:
 *           type: string
 *           description: Name of the subscription plan
 *           example: Free Plan
 *         description:
 *           type: string
 *           description: Description of the plan
 *           example: Giáo viên mới bắt đầu
 *         price:
 *           type: number
 *           description: Price in VND
 *           example: 0
 *         currency:
 *           type: string
 *           description: Currency code
 *           example: VND
 *         durationDays:
 *           type: integer
 *           description: Duration in days
 *           example: 30
 *         maxClasses:
 *           type: integer
 *           description: Maximum number of classes
 *           example: 5
 *         maxQuizzesPerMonth:
 *           type: integer
 *           description: Maximum quizzes per month
 *           example: 10
 *         maxStorageMb:
 *           type: integer
 *           description: Maximum storage in MB
 *           example: 100
 *         hasAdvancedAi:
 *           type: boolean
 *           description: Whether plan has advanced AI features
 *           example: false
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           description: List of plan features
 *           example: ["Quản lí lớp học cơ bản", "Giao diện trực quan"]
 *         isActive:
 *           type: boolean
 *           description: Whether the plan is active
 *           example: true
 *         displayOrder:
 *           type: integer
 *           description: Display order for sorting
 *           example: 1
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/settings/subscription-plans:
 *   get:
 *     summary: Lấy danh sách tất cả subscription plans
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
 *         description: Danh sách subscription plans
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
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 *                 count:
 *                   type: integer
 *       500:
 *         description: Server error
 */
router.get('/subscription-plans', SettingsController.getAllSubscriptionPlans);

/**
 * @swagger
 * /api/v1/settings/subscription-plans/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết một subscription plan
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của subscription plan
 *     responses:
 *       200:
 *         description: Thông tin subscription plan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SubscriptionPlan'
 *       404:
 *         description: Subscription plan không tồn tại
 *       500:
 *         description: Server error
 */
router.get('/subscription-plans/:id', SettingsController.getSubscriptionPlanById);

/**
 * @swagger
 * /api/v1/settings/subscription-plans:
 *   post:
 *     summary: Tạo subscription plan mới
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
 *               - code
 *               - name
 *               - price
 *             properties:
 *               code:
 *                 type: string
 *                 example: FREE
 *               name:
 *                 type: string
 *                 example: Free Plan
 *               description:
 *                 type: string
 *                 example: Giáo viên mới bắt đầu
 *               price:
 *                 type: number
 *                 example: 0
 *               currency:
 *                 type: string
 *                 example: VND
 *               durationDays:
 *                 type: integer
 *                 example: 30
 *               maxClasses:
 *                 type: integer
 *                 example: 5
 *               maxQuizzesPerMonth:
 *                 type: integer
 *                 example: 10
 *               maxStorageMb:
 *                 type: integer
 *                 example: 100
 *               hasAdvancedAi:
 *                 type: boolean
 *                 example: false
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Quản lí lớp học cơ bản", "Giao diện trực quan"]
 *               displayOrder:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Subscription plan được tạo thành công
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
 *                   $ref: '#/components/schemas/SubscriptionPlan'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 *       500:
 *         description: Server error
 */
router.post('/subscription-plans', authenticate, authorizeAdmin, createSubscriptionPlanValidation, SettingsController.createSubscriptionPlan);

/**
 * @swagger
 * /api/v1/settings/subscription-plans/{id}:
 *   put:
 *     summary: Cập nhật subscription plan
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của subscription plan
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               currency:
 *                 type: string
 *               durationDays:
 *                 type: integer
 *               maxClasses:
 *                 type: integer
 *               maxQuizzesPerMonth:
 *                 type: integer
 *               maxStorageMb:
 *                 type: integer
 *               hasAdvancedAi:
 *                 type: boolean
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Subscription plan được cập nhật thành công
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
 *                   $ref: '#/components/schemas/SubscriptionPlan'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 *       404:
 *         description: Subscription plan không tồn tại
 *       500:
 *         description: Server error
 */
router.put('/subscription-plans/:id', authenticate, authorizeAdmin, updateSubscriptionPlanValidation, SettingsController.updateSubscriptionPlan);

/**
 * @swagger
 * /api/v1/settings/subscription-plans/{id}:
 *   delete:
 *     summary: Xóa subscription plan - Soft delete
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của subscription plan
 *     responses:
 *       200:
 *         description: Subscription plan được xóa thành công
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
 *         description: Subscription plan không tồn tại
 *       500:
 *         description: Server error
 */
router.delete('/subscription-plans/:id', authenticate, authorizeAdmin, SettingsController.deleteSubscriptionPlan);

// ==================== FAQ Routes ====================

/**
 * @swagger
 * components:
 *   schemas:
 *     FAQ:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         question:
 *           type: string
 *         answer:
 *           type: string
 *         category:
 *           type: string
 *         is_active:
 *           type: boolean
 *         display_order:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/settings/faqs:
 *   get:
 *     summary: Lấy danh sách FAQs
 *     tags: [Settings]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Chỉ lấy FAQs đang active
 *     responses:
 *       200:
 *         description: Danh sách FAQs
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
 *                     $ref: '#/components/schemas/FAQ'
 *                 count:
 *                   type: integer
 */
router.get('/faqs', SettingsController.getAllFAQs);

/**
 * @swagger
 * /api/v1/settings/faqs/{id}:
 *   get:
 *     summary: Lấy FAQ theo ID
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin FAQ
 *       404:
 *         description: FAQ không tồn tại
 */
router.get('/faqs/:id', SettingsController.getFAQById);

/**
 * @swagger
 * /api/v1/settings/faqs:
 *   post:
 *     summary: Tạo FAQ mới (Admin only)
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
 *               - question
 *               - answer
 *             properties:
 *               question:
 *                 type: string
 *                 example: Làm thế nào để đăng ký tài khoản?
 *               answer:
 *                 type: string
 *                 example: Bạn có thể đăng ký bằng email hoặc Google
 *               category:
 *                 type: string
 *                 example: Tài khoản
 *               display_order:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: FAQ được tạo thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */
router.post('/faqs', authenticate, authorizeAdmin, createFAQValidation, SettingsController.createFAQ);

/**
 * @swagger
 * /api/v1/settings/faqs/{id}:
 *   put:
 *     summary: Cập nhật FAQ
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               category:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               display_order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: FAQ được cập nhật thành công
 *       404:
 *         description: FAQ không tồn tại
 */
router.put('/faqs/:id', authenticate, authorizeAdmin, updateFAQValidation, SettingsController.updateFAQ);

/**
 * @swagger
 * /api/v1/settings/faqs/{id}:
 *   delete:
 *     summary: Xóa FAQ
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FAQ được xóa thành công
 *       404:
 *         description: FAQ không tồn tại
 */
router.delete('/faqs/:id', authenticate, authorizeAdmin, SettingsController.deleteFAQ);

module.exports = router;
