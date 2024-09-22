const { body } = require('express-validator');
const ObjectId = require('mongoose').Types.ObjectId;

const shopAddValidation = [
    body('seller').notEmpty().withMessage('seller required'),
    body('shopType').notEmpty().withMessage('shopType required'),
    // body('shopStartTime').notEmpty().withMessage('shopStartTime required'),
    // body('shopEndTime').notEmpty().withMessage('shopEndTime required'),
    body('shopName').notEmpty().withMessage('shopName required'),
    body('shopLogo').notEmpty().withMessage('shopLogo required'),
    body('shopBanner').notEmpty().withMessage('shopBanner required'),
    body('shopStatus').notEmpty().withMessage('shopStatus required'),
    body('delivery').notEmpty().withMessage('delivery required'),
];

const shopUpdateValidation = [
    body('id').custom((value, { req }) => {
        if (!ObjectId.isValid(value)) {
            throw new Error('id is invalid');
        }
        return true;
    }),
];

module.exports = {
    shopAddValidation,
    shopUpdateValidation,
};
