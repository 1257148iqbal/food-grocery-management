const express = require('express');
const router = express.Router();
const OrderCancelController = require('../../../controllers/orderCancelController');

/**
 * /admin/order
 * @url http://localhost:5001/admin/order-cancel
 *
 */

router.get('/', OrderCancelController.getCancelReasonForAdmin);
router.post('/add', OrderCancelController.addCancelReason);
router.post('/edit', OrderCancelController.editCancelReason);
router.post('/delete', OrderCancelController.deleteCancelReason);
router.post('/sort', OrderCancelController.sortCancelReason);

module.exports = router;
