const express = require('express');
const router = express.Router();
const ShopController = require('../../../../controllers/ShopController');

/**
 * /app/delivery/auth
 * @url http://localhost:5001/app/delivery/shop
 *
 */

router.get('/', ShopController.getShops);

module.exports = router;
