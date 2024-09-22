const express = require('express');
const router = express.Router();
const SellerController = require('../../../../controllers/SellerController');
const ShopController = require('../../../../controllers/ShopController');
const EmailController = require('../../../../controllers/EmailController');

/**
 * /app/seller
 * @url http://localhost:5001/app/seller/auth
 *
 */

router.post('/sign-in', ShopController.useSignInFromShopApp);
router.post('/forget-email', EmailController.sendEmailForStoreForgetPassword);
router.post('/forget-password', ShopController.forgetPasswordForStoreApp);
// router.post('/sign-up', SellerController.useSignUpFromStoreApp);
// router.post('/sign-up', SellerController.useSignUpFromStoreApp);

module.exports = router;
