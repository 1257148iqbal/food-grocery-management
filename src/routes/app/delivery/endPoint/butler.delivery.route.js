const express = require('express');
const router = express.Router();
const ButlerController = require('../../../../controllers/ButlerController');
const orderCancelReason = require('../../../../controllers/orderCancelController');
/**
 * /app/delivery/butler
 * @url http://localhost:5001/app/delivery/butler
 *
 */

router.get('/', ButlerController.getOrderListForDeliveryBoy);
// router.get('/filter-info-past', ButlerController.getUserAndShopOFOrderForDeliveryApp);
router.get('/single-details', ButlerController.orderSingleDetails);
router.get('/chats', ButlerController.getOrderChats);

router.post('/accepted-new-order', ButlerController.deliveryManAcceptOrder);
router.post('/cancel-order', ButlerController.cancelOrderByDeliveryBoy);
router.post('/reject-order', ButlerController.rejectOrderByDeliveryBoy);
router.post('/pick-order', ButlerController.deliveryManPickOrder);
router.post('/completed', ButlerController.deliveryManCompletedOrder);
router.post('/refused', ButlerController.deliveryManCompletedOrderRefused);
router.post('/sent-message', ButlerController.sendMessageToUser);
router.get(
    '/cancel-reason',
    orderCancelReason.getOrderCancelReasonForDeliveryBoy
);

module.exports = router;
