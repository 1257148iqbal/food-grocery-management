const express = require('express');
const router = express.Router();
const FaqController = require('../../../../controllers/FaqController');

/**
 * /app
 * @url http://localhost:5001/app/seller/faq
 *
 */

router.get('/', FaqController.getFaqForShopApp);

module.exports = router;
