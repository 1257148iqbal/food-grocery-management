const { body } = require('express-validator');
const ObjectId = require('mongoose').Types.ObjectId;

const CategoryAddValidation = [
    body('name').notEmpty().withMessage('name required'),
    body('image').notEmpty().withMessage('image required'),
    body('type').notEmpty().withMessage('type required'),
];

const CatergoryUpdateValidation = [
    body('id').custom((value, { req }) => {
        if (!ObjectId.isValid(value)) {
            throw new Error('id is invalid');
        }
        return true;
    }),
];

module.exports = {
    CategoryAddValidation,
    CatergoryUpdateValidation,
};
