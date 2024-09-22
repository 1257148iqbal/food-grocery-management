const express = require('express');
const router = express.Router();
const ButlerController = require('../../../../controllers/ButlerController');
const OrderController = require('../../../../controllers/OrderController');
const orderCancelReason = require('../../../../controllers/orderCancelController');
const ChatReasonController = require('../../../../controllers/ChatReasonController');
const { checkUserToken } = require('../../../../authentication/checkUserToken');
/**
 * /app/user/butler
 * @url http://localhost:5001/app/user/butler
 *
 */
router.get('/', checkUserToken, ButlerController.getUserOrderListForApp);
router.get('/past-order', checkUserToken, ButlerController.getUserPastOrder);
router.get(
    '/get-delivery-charge',
    checkUserToken,
    ButlerController.getDeliveryChargeForButler
);
router.get(
    '/cancel-reason',
    checkUserToken,
    orderCancelReason.getOrderCancelReasonForButler
);
router.get(
    '/chat-reason',
    checkUserToken,
    ChatReasonController.getChatReasonForUserApp
);
router.get(
    '/single-details',
    checkUserToken,
    ButlerController.orderSingleDetails
);
router.get('/chats', checkUserToken, ButlerController.getOrderChats);
router.get('/vat', checkUserToken, OrderController.getOrderVat);

router.post(
    '/place-order-cash',
    checkUserToken,
    ButlerController.userPlaceOrderWithCash
);
router.post(
    '/place-order-wallet',
    checkUserToken,
    ButlerController.userPlaceOrderWithWallet
);
router.post(
    '/order-payment-generate',
    checkUserToken,
    ButlerController.orderPaymentGenerate
);
router.post(
    '/order-payment-completed',
    checkUserToken,
    ButlerController.orderCompletePayment
);
// router.post(
//     '/order-payment-completed-adjust',
//     ButlerController.orderCompletePayment
// );
router.post(
    '/order-cancel',
    checkUserToken,
    ButlerController.cancelOrderByUser
);
router.post(
    '/add-cancel-reason',
    checkUserToken,
    ButlerController.addOrderCancelReasonForUserApp
);
router.post('/rate', checkUserToken, ButlerController.orderRatingForUserApp);
router.post(
    '/send-message-to-delivery-boy',
    checkUserToken,
    ButlerController.sendMessageToDeliveryBoy
);

// Areeba payment gateway integration
router.post(
    '/areeba-payment-generate',
    checkUserToken,
    ButlerController.areebaPaymentGenerate
);
router.post(
    '/areeba-payment-completed',
    ButlerController.areebaPaymentComplete
);

module.exports = router;
