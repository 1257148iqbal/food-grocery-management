const { body } = require('express-validator');
const ObjectId = require('mongoose').Types.ObjectId;

const RoleAddValidation = [
    body('name').notEmpty().withMessage('name required'),
];

const RoleUpdateValidation = [
    body('id').custom((value, { req }) => {
        if (!ObjectId.isValid(value)) {
            throw new Error('id is invalid');
        }
        return true;
    }),
];

module.exports = {
    RoleAddValidation,
    RoleUpdateValidation,
};
