const PricePlan = require('../models/PricePlan');
const { validationResult } = require('express-validator');

class SettingsController {
    // Tạo price plan mới
    static async createPricePlan(req, res) {
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
                plan_name,
                description,
                price,
                discount_percent,
                billing_type,
                button_text,
                benefits,
                display_order
            } = req.body;

            const planId = await PricePlan.create({
                plan_name,
                description,
                price,
                discount_percent,
                billing_type,
                button_text,
                benefits,
                display_order
            });

            const newPlan = await PricePlan.findById(planId);

            return res.status(201).json({
                success: true,
                message: 'Price plan created successfully',
                data: newPlan
            });
        } catch (error) {
            // console.error('Create price plan error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create price plan',
                error: error.message
            });
        }
    }

    static async getAllPricePlans(req, res) {
        try {
            const activeOnly = req.query.active !== 'false';
            const plans = await PricePlan.findAll(activeOnly);

            return res.status(200).json({
                success: true,
                data: plans,
                count: plans.length
            });
        } catch (error) {
            // console.error('Get all price plans error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch price plans',
                error: error.message
            });
        }
    }

    static async getPricePlanById(req, res) {
        try {
            const { id } = req.params;
            const plan = await PricePlan.findById(id);

            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'Price plan not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: plan
            });
        } catch (error) {
            // console.error('Get price plan by ID error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch price plan',
                error: error.message
            });
        }
    }

    static async updatePricePlan(req, res) {
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

            const existingPlan = await PricePlan.findById(id);
            if (!existingPlan) {
                return res.status(404).json({
                    success: false,
                    message: 'Price plan not found'
                });
            }

            const updated = await PricePlan.update(id, req.body);

            if (!updated) {
                return res.status(400).json({
                    success: false,
                    message: 'No changes made'
                });
            }

            const updatedPlan = await PricePlan.findById(id);

            return res.status(200).json({
                success: true,
                message: 'Price plan updated successfully',
                data: updatedPlan
            });
        } catch (error) {
            // console.error('Update price plan error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update price plan',
                error: error.message
            });
        }
    }

    static async deletePricePlan(req, res) {
        try {
            const { id } = req.params;
            const existingPlan = await PricePlan.findById(id);
            if (!existingPlan) {
                return res.status(404).json({
                    success: false,
                    message: 'Price plan not found'
                });
            }

            const deleted = await PricePlan.delete(id);

            if (!deleted) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to delete price plan'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Price plan deleted successfully'
            });
        } catch (error) {
            // console.error('Delete price plan error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete price plan',
                error: error.message
            });
        }
    }
}

module.exports = SettingsController;
