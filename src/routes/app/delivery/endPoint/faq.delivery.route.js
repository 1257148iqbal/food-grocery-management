const express = require('express');
const router = express.Router();
const FaqController = require('../../../../controllers/FaqController');

/**
 * /app/
 * @url http://localhost:5001/app/delivery/faq
 *
 */

router.get('/', FaqController.getFaqForDeliveryApp);

module.exports = router;
