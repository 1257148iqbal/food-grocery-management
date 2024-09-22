const express = require('express');
const router = express.Router();
const orderController = require('../../../../controllers/OrderController');
const orderCancelReason = require('../../../../controllers/orderCancelController');
const ChatReasonController = require('../../../../controllers/ChatReasonController');
const UserController = require('../../../../controllers/UserController');
const RewardSettingController = require('../../../../controllers/RewardSettingController');
const RatingSettingController = require('../../../../controllers/RatingSettingController');
const { checkUserToken } = require('../../../../authentication/checkUserToken');
/**
 * /app/user/order
 * @url http://localhost:5001/app/user/order
 *
 */
router.get('/', checkUserToken, orderController.getUserOrderListForApp);
router.get('/all', checkUserToken, orderController.getUserOrdersForApp);

router.post(
    '/place-order-cash',
    checkUserToken,
    orderController.userPlaceOrderWithCash
);
router.post(
    '/place-order-wallet',
    checkUserToken,
    orderController.userPlaceOrderWithWallet
);
router.post(
    '/order-payment-generate',
    checkUserToken,
    orderController.orderPaymentGenerate
);
router.post(
    '/order-payment-completed',
    checkUserToken,
    orderController.orderCompletePayment
);
router.post(
    '/order-payment-completed-adjust',
    checkUserToken,
    orderController.orderCompletePayment
);

router.get('/past-order', checkUserToken, UserController.userPastOrder);
router.get(
    '/get-delivery-charge',
    checkUserToken,
    orderController.getDeliveryCharge
);
router.post('/order-cancel', checkUserToken, orderController.cancelOrderByUser);
router.post(
    '/add-cancel-reason',
    checkUserToken,
    orderController.addOrderCancelReasonForUserApp
);
router.get(
    '/cancel-reason',
    checkUserToken,
    orderCancelReason.getOrderCancelReasonForUserApp
);
router.get(
    '/chat-reason',
    checkUserToken,
    ChatReasonController.getChatReasonForUserApp
);
router.post('/rate', checkUserToken, orderController.orderRatingForUserApp);

router.get(
    '/single-details',
    checkUserToken,
    orderController.orderSingleDetails
);

router.post(
    '/send-message-to-delivery-boy',
    checkUserToken,
    orderController.sendMessageToDeliveryBoy
);

router.get('/chats', checkUserToken, orderController.getOrderChats);

router.get('/vat', checkUserToken, orderController.getOrderVat);

// Reward System
router.get(
    '/get-reward',
    checkUserToken,
    RewardSettingController.getRewardForUserApp
);
// Ratting Setting
router.get(
    '/get-rating',
    checkUserToken,
    RatingSettingController.getRatingSettingForAdmin
);

// For adjustment order feature
router.post(
    '/adjust-order',
    checkUserToken,
    orderController.adjustOrderFromUser
);
router.post(
    '/cancel-adjust-order',
    checkUserToken,
    orderController.cancelAdjustOrderByUser
);
// For getting not rated delivered order
router.get(
    '/not-rated-delivered-order',
    checkUserToken,
    orderController.getNotRatedDeliveredOrderFroUserApp
);

// Areeba payment gateway integration
router.post(
    '/areeba-payment-generate',
    checkUserToken,
    orderController.areebaPaymentGenerate
);
router.post('/areeba-payment-completed', orderController.areebaPaymentComplete);

module.exports = router;
