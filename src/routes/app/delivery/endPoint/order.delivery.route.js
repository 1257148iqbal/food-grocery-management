const express = require('express');
const router = express.Router();
const DeliveryBoyController = require('../../../../controllers/DeliveryBoyController');
const orderController = require('../../../../controllers/OrderController');
const orderCancelReason = require('../../../../controllers/orderCancelController');

/**
 * /app/delivery/order
 * @url http://localhost:5001/app/delivery/order
 *
 */

router.get('/', orderController.getOrderListForDeliveryBoy);
// router.get('/new-order', orderController.getNewOrderListForUserApp);
router.post('/accepted-new-order', orderController.deliveryManAcceptOrder);
router.post('/completed', orderController.deliveryManCompletedOrder);
router.post('/refused', orderController.deliveryManCompletedOrderRefused);
router.post('/pick-order', orderController.deliveryManPickOrder);
router.post('/reject-order', orderController.rejectOrderByDeliveryBoy);
router.post('/cancel-order', orderController.cancelOrderByDeliveryBoy);
router.post('/sent-message', orderController.sendMessageToUser);
router.get(
    '/filter-info-past',
    orderController.getUserAndShopOFOrderForDeliveryApp
);
router.get('/chats', orderController.getOrderChats);
router.get('/single-details', orderController.orderSingleDetails);
router.post('/add-image', orderController.addOrderImageByDeliveryBoy);
router.get(
    '/cancel-reason',
    orderCancelReason.getOrderCancelReasonForDeliveryBoy
);
// Replacement order feature
router.post(
    '/pick-replacement-item',
    orderController.deliveryManPickReplacementItem
);
// Update order trip summary
router.post(
    '/update-order-trip-summary',
    orderController.updateOrderTripSummary
);

module.exports = router;
