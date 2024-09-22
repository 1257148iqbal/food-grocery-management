const express = require('express');
const router = express.Router();
const addressController = require('../../../../controllers/AddressController');

/**
 * /app/delivery/address
 * @url http://localhost:5001/app/delivery/address
 *
 */

router.post('/add', addressController.addDeliveryAddress);
router.post('/update', addressController.addDeliveryAddress);
router.get(
    '/current-address-update',
    addressController.deliveryBoyCurrentAddressUpdate
);

module.exports = router;
