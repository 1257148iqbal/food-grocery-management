const express = require('express');
const router = express.Router();
const SubscriptionSettingController = require('../../../../controllers/SubscriptionSettingController');
const SubscriptionController = require('../../../../controllers/SubscriptionController.js');
const { checkUserToken } = require('../../../../authentication/checkUserToken');

/**
 * /app/user/rating-setting
 * @url http://localhost:5001/app/user/subscription
 *
 */

router.get(
    '/package',
    SubscriptionSettingController.getSubscriptionSettingForApp
);
router.post(
    '/enroll',
    checkUserToken,
    SubscriptionController.enrollSubscription
);
router.post(
    '/enroll/payment-generate',
    checkUserToken,
    SubscriptionController.paymentGenerate
);
router.post(
    '/enroll/payment-card',
    checkUserToken,
    SubscriptionController.userPayWithCard
);

router.post(
    '/cancel',
    checkUserToken,
    SubscriptionController.cancelSubscription
);
router.post(
    '/update-auto-renew',
    checkUserToken,
    SubscriptionController.updateAutoRenewSubscription
);
router.get(
    '/auto-renew/cancel-reasons',
    checkUserToken,
    SubscriptionController.getAutoRenewCancelReasons
);
router.post(
    '/auto-renew/cancel',
    checkUserToken,
    SubscriptionController.cancelAutoRenewSubscription
);
router.post(
    '/auto-renew/add-cancel-reason',
    checkUserToken,
    SubscriptionController.addCancelAutoRenewReason
);
router.post(
    '/auto-renew/reactive',
    checkUserToken,
    SubscriptionController.reactiveAutoRenewSubscription
);
router.get(
    '/pending-amount',
    checkUserToken,
    SubscriptionController.getPendingAmountForSubscription
);
router.get(
    '/savings',
    checkUserToken,
    SubscriptionController.getSavingsForSubscription
);
router.post(
    '/normal-user-savings',
    checkUserToken,
    SubscriptionController.getSavingsForNormalUser
);
router.get('/crazy-offer-shops', SubscriptionController.getCrazyOfferShops);
router.get(
    '/payment-history',
    checkUserToken,
    SubscriptionController.getUserSubscriptionPaymentHistory
);

// Areeba payment gateway integration
router.post(
    '/enroll/areeba-payment-generate',
    checkUserToken,
    SubscriptionController.areebaPaymentGenerate
);
router.post(
    '/enroll/areeba-payment-completed',
    SubscriptionController.areebaPaymentComplete
);

module.exports = router;
