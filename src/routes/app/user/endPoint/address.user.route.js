const express = require('express');
const router = express.Router();
const AddressController = require('../../../../controllers/AddressController');
const {
    addressAddValidation,
} = require('../../../../validation/addressValidation');

/**
 * /app/user/profile
 * @url http://localhost:5001/app/user/address
 *
 */

module.exports = router;
