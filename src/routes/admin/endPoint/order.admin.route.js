const express = require('express');
const router = express.Router();
const OrderController = require('../../../controllers/OrderController');
const AdminOrderCancelController = require('../../../controllers/AdminOrderCancelController');
const DeliveryBoyController = require('../../../controllers/DeliveryBoyController');
const { checkAdminToken } = require('../../../authentication/checkAdminToken');
const {
    checkGlobalToken,
} = require('../../../authentication/checkGlobalToken');
const { checkSellerToken } = require('../../../authentication/checkSellerToken.js');

const { dynamicToken } = require('../../../authentication/dynamicToken.js');

const {
    orderIsResolvedValidation,
} = require('../../../validation/order.validation.js');
/**
 * /admin/order
 * @url http://localhost:5001/admin/order
 *
 */

router.get('/', OrderController.getOrderListForAdmin);
// router.get('/single-details', OrderController.orderSingleDetails);
router.get('/single', OrderController.getSingleOrderById);

router.get('/user', OrderController.userOrdersforAdmin);
router.get('/delivery', OrderController.deliveryBoyOrdersforAdmin);
router.post('/update-order-status', OrderController.updateOrderStatusByAdmin);
router.get('/for-seller', OrderController.orderListForSeller);

router.get('/refund-card-amount', OrderController.refundCardAmount);

router.post('/flag', OrderController.makeFlagOrderByAdmin);
router.post('/flag/edit', OrderController.editOrderFlag);
router.post('/flag/delete', OrderController.deleteFlagFromAdmin);
router.post(
    '/cancel-order',
    checkGlobalToken,
    AdminOrderCancelController.adminCancelOrder
);
router.get(
    '/get-nearby-delivery-boy-order',
    DeliveryBoyController.getRelatedDeliveryBoy
);
router.post(
    '/order-request-auto-assign-rider',
    DeliveryBoyController.sendOrderRequestForAutoAssign
);

router.put(
    '/resolve',
    orderIsResolvedValidation,
    OrderController.resolveOrder
);

router.get(
    '/get-shop-delivery-boy-order',
    DeliveryBoyController.getShopDeliveryBoyForAssignInOrder
);
router.get('/get-five-order', OrderController.getFiveOrder);

// Refund feature after delivered
router.post(
    '/refund-after-delivered',
    checkAdminToken,
    AdminOrderCancelController.refundAfterDeliveredOrderByAdmin
);
// For rider shop rating
router.get('/delivery/shop-rating', OrderController.getDeliveryBoyShopRating);
// For rider customer rating
router.get(
    '/delivery/customer-rating',
    OrderController.getDeliveryBoyCustomerRating
);

// For urgent order
router.get(
    '/urgent',
    checkAdminToken,
    // dynamicToken,
    OrderController.getUrgentOrdersForSpecificAdmin
);
router.post(
    '/accept-urgent-order',
    checkAdminToken,
    OrderController.acceptUrgentOrderBySpecificAdmin
);
router.get('/urgent-count', OrderController.getUrgentOrdersCount);
router.get('/late-count', OrderController.getLateOrdersCount);

// For replacement order feature
router.post('/place-order', checkAdminToken, OrderController.adminPlaceOrder);

// For changing delivery address after order
router.post(
    '/update-delivery-address',
    checkAdminToken,
    OrderController.updateDeliveryAddressByAdmin
);

// For adjustment order feature
router.post('/adjust-order', OrderController.adjustOrderFromAdmin);
router.post(
    '/adjust-order-request',
    OrderController.adjustOrderRequestFromShopApp
);

router.get('/chat', checkAdminToken, OrderController.getRiderAndUserChat);

module.exports = router;
