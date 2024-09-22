const { body } = require('express-validator');

const addCouponValidation = [
    body('coupon_code').notEmpty().withMessage('coupon_code required'),
    body('valid_amount').notEmpty().withMessage('valid_amount required'),
    body('max_discount').notEmpty().withMessage('max_discount required'),
    body('usage_per_day').notEmpty().withMessage('usage_per_day required'),
    body('maximum_usage').notEmpty().withMessage('maximum_usage required'),
    body('discount_percentage')
        .notEmpty()
        .withMessage('discount_percentage required'),
    body('status')
        .notEmpty()
        .withMessage('status required')
        .isIn(['Active'])
        .withMessage(value => ` ${value} is not Supported to status`),
];

module.exports = {
    addCouponValidation,
};
