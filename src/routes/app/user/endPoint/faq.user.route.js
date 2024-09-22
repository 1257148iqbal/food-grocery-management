const express = require('express');
const router = express.Router();
const FaqController = require('../../../../controllers/FaqController');

/**
 * /app/user/faq
 * @url http://localhost:5001/app/user/faq
 *
 */

router.get('/', FaqController.getFaqForUserApp);

module.exports = router;
