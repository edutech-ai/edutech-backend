const SubscriptionPlan = require('../models/SubscriptionPlan');
const FAQ = require('../models/FAQ');
const { validationResult } = require('express-validator');

class SettingsController {
    // Tạo subscription plan mới
    static async createSubscriptionPlan(req, res) {
        try {
            // Kiểm tra validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const {
                code,
                name,
                description,
                price,
                currency,
                durationDays,
                maxClasses,
                maxQuizzesPerMonth,
                maxStorageMb,
                hasAdvancedAi,
                features,
                displayOrder
            } = req.body;

            const newPlan = await SubscriptionPlan.create({
                code,
                name,
                description,
                price,
                currency: currency || 'VND',
                durationDays: durationDays || 30,
                maxClasses,
                maxQuizzesPerMonth,
                maxStorageMb,
                hasAdvancedAi: hasAdvancedAi || false,
                features,
                displayOrder: displayOrder || 0
            });

            return res.status(201).json({
                success: true,
                message: 'Subscription plan created successfully',
                data: newPlan
            });
        } catch (error) {
            // console.error('Create subscription plan error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create subscription plan',
                error: error.message
            });
        }
    }

    static async getAllSubscriptionPlans(req, res) {
        try {
            const activeOnly = req.query.active !== 'false';
            const whereClause = activeOnly ? { isActive: true } : {};
            
            const plans = await SubscriptionPlan.findAll({
                where: whereClause,
                order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']]
            });

            return res.status(200).json({
                success: true,
                data: plans,
                count: plans.length
            });
        } catch (error) {
            // console.error('Get all subscription plans error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch subscription plans',
                error: error.message
            });
        }
    }

    static async getSubscriptionPlanById(req, res) {
        try {
            const { id } = req.params;
            const plan = await SubscriptionPlan.findByPk(id);

            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'Subscription plan not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: plan
            });
        } catch (error) {
            // console.error('Get subscription plan by ID error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch subscription plan',
                error: error.message
            });
        }
    }

    static async updateSubscriptionPlan(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { id } = req.params;

            const existingPlan = await SubscriptionPlan.findByPk(id);
            if (!existingPlan) {
                return res.status(404).json({
                    success: false,
                    message: 'Subscription plan not found'
                });
            }

            await existingPlan.update(req.body);

            return res.status(200).json({
                success: true,
                message: 'Subscription plan updated successfully',
                data: existingPlan
            });
        } catch (error) {
            // console.error('Update subscription plan error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update subscription plan',
                error: error.message
            });
        }
    }

    static async deleteSubscriptionPlan(req, res) {
        try {
            const { id } = req.params;
            const existingPlan = await SubscriptionPlan.findByPk(id);
            if (!existingPlan) {
                return res.status(404).json({
                    success: false,
                    message: 'Subscription plan not found'
                });
            }

            // Soft delete
            await existingPlan.update({ isActive: false });

            return res.status(200).json({
                success: true,
                message: 'Subscription plan deleted successfully'
            });
        } catch (error) {
            // console.error('Delete subscription plan error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete subscription plan',
                error: error.message
            });
        }
    }

    // ==================== FAQ Methods ====================

    static async createFAQ(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { question, answer, category, display_order } = req.body;

            const faqId = await FAQ.create({
                question,
                answer,
                category,
                display_order
            });

            const newFAQ = await FAQ.findById(faqId);

            return res.status(201).json({
                success: true,
                message: 'FAQ created successfully',
                data: newFAQ
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create FAQ',
                error: error.message
            });
        }
    }

    static async getAllFAQs(req, res) {
        try {
            const activeOnly = req.query.active !== 'false';

            const faqs = await FAQ.findAll(activeOnly);

            return res.status(200).json({
                success: true,
                data: faqs,
                count: faqs.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch FAQs',
                error: error.message
            });
        }
    }

    static async getFAQById(req, res) {
        try {
            const { id } = req.params;
            const faq = await FAQ.findById(id);

            if (!faq) {
                return res.status(404).json({
                    success: false,
                    message: 'FAQ not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: faq
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch FAQ',
                error: error.message
            });
        }
    }

    static async updateFAQ(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { id } = req.params;

            const existingFAQ = await FAQ.findById(id);
            if (!existingFAQ) {
                return res.status(404).json({
                    success: false,
                    message: 'FAQ not found'
                });
            }

            const updated = await FAQ.update(id, req.body);

            if (!updated) {
                return res.status(400).json({
                    success: false,
                    message: 'No changes made'
                });
            }

            const updatedFAQ = await FAQ.findById(id);

            return res.status(200).json({
                success: true,
                message: 'FAQ updated successfully',
                data: updatedFAQ
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update FAQ',
                error: error.message
            });
        }
    }

    static async deleteFAQ(req, res) {
        try {
            const { id } = req.params;
            const existingFAQ = await FAQ.findById(id);
            if (!existingFAQ) {
                return res.status(404).json({
                    success: false,
                    message: 'FAQ not found'
                });
            }

            const deleted = await FAQ.delete(id);

            if (!deleted) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to delete FAQ'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'FAQ deleted successfully'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete FAQ',
                error: error.message
            });
        }
    }
}

module.exports = SettingsController;
