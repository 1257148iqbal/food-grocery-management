const express = require('express');
const router = express.Router();
const DeliveryController = require('../../../../controllers/DeliveryBoyController');

/**
 * /admins
 * @url http://localhost:5001/app/seller/delivery-boy
 *
 *
 */

router.get('/', DeliveryController.getDeliveryBoyForShopApp);

module.exports = router;
