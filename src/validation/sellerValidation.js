const { body } = require('express-validator');
const ObjectId = require('mongoose').Types.ObjectId;

const sellerAddValidation = [
    body('name').notEmpty().withMessage('name required'),
    body('phone_number').notEmpty().withMessage('phone_number required'),
    body('company_name').notEmpty().withMessage('company_name required'),
    body('email').notEmpty().withMessage('email required'),
    body('password').notEmpty().withMessage('password required'),
    body('account_type').notEmpty().withMessage('account_type required'),
    body('bank_name').notEmpty().withMessage('bank_name required'),
    body('account_name').notEmpty().withMessage('account_name required'),
    body('account_number').notEmpty().withMessage('account_number required'),
    body('certificate_of_incorporation')
        .notEmpty()
        .withMessage('certificate_of_incorporation required'),
    body('national_id').notEmpty().withMessage('national_id required'),
];

const sellerUpdateValidation = [
    body('id').custom((value, { req }) => {
        if (!ObjectId.isValid(value)) {
            throw new Error('id is invalid');
        }
        return true;
    }),
];

module.exports = {
    sellerAddValidation,
    sellerUpdateValidation,
};
