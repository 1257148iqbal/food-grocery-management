const express = require('express');
const router = express.Router();
const ShopController = require('../../../../controllers/ShopController');

/**
 * /app/user/super-markets
 * @url http://localhost:5001/app/user/super-markets
 *
 */

router.get('/', ShopController.getSuperMarket);

module.exports = router;
