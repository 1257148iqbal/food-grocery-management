const express = require('express');
const router = express.Router();
const DeliveryController = require('../../../../controllers/DeliveryBoyController');

/**
 * /app/delivery
 * @url http://localhost:5001/app/delivery/profile
 *
 */

router.get('/', DeliveryController.getSingleDeliveryBoyDetailsForDeliveryBoy);
router.post('/delete', DeliveryController.deleteDeliveryBoy);
router.post(
    '/update',
    DeliveryController.deliveryBoyProfileUpdateFromDeliveryBoyApp
);
router.post('/update-fcm-token', DeliveryController.updateDeliveryBoyFcmToken);
router.post('/remove-fcm-token', DeliveryController.removeDeliveryBoyFcmToken);
router.post('/status', DeliveryController.updateDeliveryBoyStatusFromApp);
router.get('/last-login', DeliveryController.getLastLoginForAdmin);
router.post(
    '/password-update',
    DeliveryController.changePasswordForDeliveryApp
);
router.get('/activity', DeliveryController.getDeliveryBoyActivity);
router.get('/check-login-status', DeliveryController.checkDeliveryBoyLoginStatus);

module.exports = router;
