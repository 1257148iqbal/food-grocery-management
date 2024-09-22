const express = require('express');
const { checkUserToken } = require('../../../../authentication/checkUserToken');
const router = express.Router();
const userController = require('../../../../controllers/UserController');
const EmailController = require('../../../../controllers/EmailController');

/**
 * /app/user/auth
 * @url http://localhost:5001/app/user/auth
 *
 */

router.post('/sign-up', userController.useSignUpFromUserApp);
router.post('/sign-in', userController.useSignInFromUserApp);
router.post('/social', userController.facebookRegister);
router.post('/send-otp', checkUserToken, userController.sendOtp);
router.post(
    '/send-otp-social',
    checkUserToken,
    userController.sendOtpForUserPhoneVerify
);
router.post(
    '/verify-otp-social',
    checkUserToken,
    userController.verifyOtpSocial
);
router.post('/verify-otp', checkUserToken, userController.verifyOtp);
router.post(
    '/change-phone-number',
    checkUserToken,
    userController.changeNumber
);
router.post(
    '/verify-phone-number',
    checkUserToken,
    userController.verifyOtpForChangeNumber
);
// router.post('/forget/send-otp', userController.sendOtpForForgetPassword);
// router.post('/forget/otp-verify', userController.verifyOtpForForgetPassword);
// router.post('/forget/password', userController.forgetPassword);
router.post('/foget-email', EmailController.sendEmailForUserForgetPassword);
router.post('/forget/password', userController.forgetPasswordForUserApp);

module.exports = router;
