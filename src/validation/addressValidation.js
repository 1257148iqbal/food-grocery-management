const { body } = require('express-validator');
const ObjectId = require('mongoose').Types.ObjectId;

const addressAddValidation = [
    body('address').notEmpty().withMessage('address required'),
    body('latitude').notEmpty().withMessage('latitude required'),
    body('longitude').notEmpty().withMessage('longitude required'),
    body('country').notEmpty().withMessage('country required'),
    body('state').notEmpty().withMessage('state required'),
    body('city').notEmpty().withMessage('city required'),
    body('pin').notEmpty().withMessage('pin required'),
];

const addressUpdateValidation = [
    body('id').custom((value, { req }) => {
        if (!ObjectId.isValid(value)) {
            throw new Error('id is invalid');
        }
        return true;
    }),
];

module.exports = {
    addressAddValidation,
    addressUpdateValidation,
};
