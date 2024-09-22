const { body } = require('express-validator');
const ObjectId = require('mongoose').Types.ObjectId;

const productAddValidation = [
    body('name').notEmpty().withMessage('name required'),
    body('price').notEmpty().withMessage('price required'),
    body('shop')
        .notEmpty()
        .withMessage('shop required')
        .custom(value => {
            if (!ObjectId.isValid(value)) {
                throw new Error('shop is invalid');
            }
            return true;
        }),
    body('images').notEmpty().withMessage('images required'),
    body('category')
        .notEmpty()
        .withMessage('category required')
        .custom(value => {
            if (!ObjectId.isValid(value)) {
                throw new Error('category is invalid');
            }
            return true;
        }),
];

const ProductUpdateValidation = [
    body('id').custom((value, { req }) => {
        if (!ObjectId.isValid(value)) {
            throw new Error('id is invalid');
        }
        return true;
    }),
];

module.exports = {
    productAddValidation,
    ProductUpdateValidation,
};
