const express = require('express');
const router = express.Router();
const DeliveryController = require('../../../controllers/DeliveryBoyController');
const AdminController = require('../../../controllers/AdminController');
const FinancialController = require('../../../controllers/FinancialController');

/**
 * /admins
 * @url http://localhost:5001/admin/delivery-boy
 *
 *
 */

router.get('/', DeliveryController.getDeliveryBoy);
router.get(
    '/current-location',
    DeliveryController.getDeliveryBoyCurrentLocation
);
router.post('/add', DeliveryController.addDeliveryBoyByAdmin);
router.post('/update', DeliveryController.updateDeliveryBoyByAdmin);
router.post('/active', DeliveryController.activeDeliveryBoyByAdmin);
router.post('/delete', DeliveryController.deleteDeliveryBoyById);
router.get('/track', AdminController.deliveryTracking);
router.get('/time', DeliveryController.getDeliveryBoyTimeOutForAdmin);
router.get('/tracking', DeliveryController.getDeliveryBoyActivityAdmin);
router.get(
    '/get-single-delivery-boy',
    DeliveryController.getSingleDeliveryBoyDetailsForAdmin
);
router.get('/get-current-location', DeliveryController.getCurrentLocation);
router.get('/flags', DeliveryController.getDeliveryBoyFlags);
router.get('/cash-in-hand-amount', FinancialController.getRiderAppCashInHandAmount);

module.exports = router;
