const { body } = require('express-validator');
const ObjectId = require('mongoose').Types.ObjectId;

const AdminAddValidation = [
    body('email').notEmpty().withMessage('email required'),
    body('name').notEmpty().withMessage('name required'),
    body('number').notEmpty().withMessage('number required'),
    body('password').notEmpty().withMessage('password required'),
];

const AdminUpdateValidation = [
    body('id').custom((value, { req }) => {
        if (!ObjectId.isValid(value)) {
            throw new Error('id is invalid');
        }
        return true;
    }),
];

module.exports = {
    AdminAddValidation,
    AdminUpdateValidation,
};
