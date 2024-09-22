const express = require('express');
const router = express.Router();
const ShopController = require('../../../../controllers/ShopController');
const OrderController = require('../../../../controllers/OrderController');
const AdminOrderCancelController = require('../../../../controllers/AdminOrderCancelController');
const {
    getCancelReasonForShop,
} = require('../../../../controllers/orderCancelController');

/**
 * /app/seller
 * @url http://localhost:5001/app/seller/orders
 *
 */
router.get('/', OrderController.getOrderListForShop);
router.get('/today', OrderController.getTodayOrderListForStoreApp);
router.get('/active', ShopController.getActiveOrderForStore);
router.get('/past', ShopController.getPastOrderForStore);
router.get('/new', ShopController.getNewOrderForStore);
router.get('/history', ShopController.orderHistoryForShop);
router.get('/single-details', OrderController.orderSingleDetails);
router.get('/past-filter', ShopController.pastOrderFilterForShop);

router.post('/accepted-order', OrderController.acceptedOrderByShop);
router.post('/ready', OrderController.orderReadyByShop);

router.post('/update-preparing-time', OrderController.updatePreparingTime);
router.post('/on-the-way', OrderController.orderOnTheWayByShop);
router.post('/delivered', OrderController.orderDeliveredByShop);
router.post('/cancal', AdminOrderCancelController.shopCancelOrder);
router.post('/sent-message', OrderController.sendMessageToUser);
router.get('/cancel-reason', getCancelReasonForShop);

router.post('/rate-rider', OrderController.rateToRiderShopApp);
// Replacement order feature
router.post('/pick-replacement-item', OrderController.shopPickReplacementItem);
// For adjustment order feature
router.post(
    '/adjust-order-request',
    OrderController.adjustOrderRequestFromShopApp
);

module.exports = router;
