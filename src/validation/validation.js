const { body } = require('express-validator');
const ObjectId = require('mongoose').Types.ObjectId;
const bannerAddValidation = [
    body('title').notEmpty().withMessage('name required'),
    body('image').notEmpty().withMessage('image required'),
    body('type')
        .notEmpty()
        .withMessage('text required')
        .isIn([
            'home',
            'food',
            'grocery',
            'pharmacy',
            'healthy_corner',
            'coffee',
            'flower',
            'pet',
        ])
        .withMessage(value => ` ${value} is not Supported to type`),
];

const bannerUpdateValidation = [
    body('id').custom((value, { req }) => {
        if (!ObjectId.isValid(value)) {
            throw new Error('id is invalid');
        }
        return true;
    }),
];

const userUpdateValidation = [
    body('id').custom((value, { req }) => {
        if (!ObjectId.isValid(value)) {
            throw new Error('id is invalid');
        }
        return true;
    }),

    body('status').custom((value, { req }) => {
        if (value) {
            if (!['pending', 'active', 'inactive'].includes(value)) {
                throw new Error('invalid status');
            }
        }
        return true;
    }),

    body('gender').custom((value, { req }) => {
        if (value) {
            if (!['male', 'female'].includes(value)) {
                throw new Error('invalid gender');
            }
        }
        return true;
    }),
];

const adminUserAddValidation = [
    body('name').notEmpty().withMessage('name required'),
    body('email').notEmpty().withMessage('email required'),
    body('dob').notEmpty().withMessage('dob required'),
    body('phone_number').notEmpty().withMessage('phone_number required'),
    body('profile_photo').notEmpty().withMessage('profile_photo required'),
    body('gender')
        .notEmpty()
        .withMessage('gender required')
        .isIn(['male', 'female'])
        .withMessage(value => ` ${value} is not Supported to gender`),
];

module.exports = {
    bannerAddValidation,
    bannerUpdateValidation,
    userUpdateValidation,
    adminUserAddValidation,
};
