const express = require('express');
const router = express.Router();
const AddressController = require('../../../controllers/AddressController');
const {
    addressAddValidation,
    addressUpdateValidation,
} = require('../../../validation/addressValidation');

/**
 * /admins/address
 * @url http://localhost:5001/admin/address/
 *
 *
 */

// router.get('/', AddressController.getAddress)
router.get('/:id', AddressController.getSingleAddress);
router.post(
    '/update',
    addressUpdateValidation,
    AddressController.updateAddress
);
router.post('/delete', AddressController.deleteAddressById);

module.exports = router;
