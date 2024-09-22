const express = require('express');
const router = express.Router();
const SellerController = require('../../../../controllers/SellerController');
const {
    addressAddValidation,
    addressUpdateValidation,
} = require('../../../../validation/addressValidation');

/**
 * /app/user/profile
 * @url http://localhost:5001/app/seller
 *
 */

router.get('/', SellerController.getSeller);

module.exports = router;
