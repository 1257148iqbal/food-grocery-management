const { body } = require('express-validator');
const ObjectId = require('mongoose').Types.ObjectId;

const SubCategoryAddValidation = [
    body('name').notEmpty().withMessage('name required'),
    body('slug').notEmpty().withMessage('slug required'),
    body('image').notEmpty().withMessage('image required'),
    body('category').notEmpty().withMessage('category required'),
];

const SubCatergoryUpdateValidation = [
    body('id').custom((value, { req }) => {
        if (!ObjectId.isValid(value)) {
            throw new Error('id is invalid');
        }
        return true;
    }),
];

module.exports = {
    SubCategoryAddValidation,
    SubCatergoryUpdateValidation,
};
