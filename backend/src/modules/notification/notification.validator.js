const Joi = require('joi');

const createNotificationSchema = Joi.object({
    type: Joi.string().valid('success', 'error', 'warning', 'info').default('info'),
    title: Joi.string().max(200).required(),
    message: Joi.string().required(),
    data: Joi.object().optional()
});

const markAsReadSchema = Joi.object({
    read: Joi.boolean().required()
});

module.exports = {
    createNotificationSchema,
    markAsReadSchema
};
