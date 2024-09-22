const express = require('express');
const router = express.Router();
const flutterWaveController = require('../../../../controllers/FlutterWaveController');
const AreebaCardController = require('../../../../controllers/AreebaCardController');
const { checkUserToken } = require('../../../../authentication/checkUserToken');

/**
 * /app/user/top-up
 * @url http://localhost:5001/app/user/top-up
 *
 */
router.post(
    '/generate-payment',
    checkUserToken,
    flutterWaveController.topUpPaymentGenerate
);
router.post(
    '/complete-payment',
    checkUserToken,
    flutterWaveController.topUpCompletePayment
);

// Areeba payment gateway integration
router.post(
    '/areeba-payment-generate',
    checkUserToken,
    AreebaCardController.areebaPaymentGenerate
);
router.post(
    '/areeba-payment-completed/:userId/:token/:amount',
    AreebaCardController.areebaPaymentComplete
);

module.exports = router;
