const express = require('express');
const { getRelatedDeliveryBoyForButler } = require('../../../config/socket');
const router = express.Router();
const ButlerController = require('../../../controllers/ButlerController');
const AdminOrderCancelController = require('../../../controllers/AdminOrderCancelController');
const { checkAdminToken } = require('../../../authentication/checkAdminToken');

/**
 * /admin/butler
 * @url http://localhost:5001/admin/butler
 *
 */

router.get('/', ButlerController.getOrderListForAdmin);
router.get('/single-details', ButlerController.orderSingleDetails);
router.get('/user', ButlerController.userOrdersforAdmin);
router.get('/delivery', ButlerController.deliveryBoyOrdersforAdmin);
router.get('/get-nearby-delivery-boy-order', getRelatedDeliveryBoyForButler);
router.get('/get-five-order', ButlerController.getFiveOrder);

router.post('/update-order-status', ButlerController.updateOrderStatusByAdmin);
router.post('/cancel-order', checkAdminToken, ButlerController.adminCancelOrder);
router.post('/flag', ButlerController.makeFlagOrderByAdmin);
router.post('/flag/edit', ButlerController.editOrderFlag);
router.post('/flag/delete', ButlerController.deleteFlagFromAdmin);




module.exports = router;
