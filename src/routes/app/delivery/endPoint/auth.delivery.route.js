const express = require('express');
const router = express.Router();
const DeliveryBoyController = require('../../../../controllers/DeliveryBoyController');
const EmailController = require('../../../../controllers/EmailController');

/**
 * /app/delivery/auth
 * @url http://localhost:5001/app/delivery/auth
 *
 */

router.post('/sign-up', DeliveryBoyController.deliveryBoySignUpFromDeliveryApp);
router.post('/sign-in', DeliveryBoyController.signInFromDeliveryApp);
router.post(
    '/forget-email',
    EmailController.sendEmailForDeliveryBoyForgetPassword
);
router.post(
    '/forget-password',
    DeliveryBoyController.forgetPasswordForDeliveryBoyApp
);

module.exports = router;
