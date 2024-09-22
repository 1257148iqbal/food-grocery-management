const express = require('express');
const router = express.Router();
const dealController = require('../../../../controllers/DealController');

/**
 * /app/user/deal
 * @url http://localhost:5001/app/user/deal
 *
 */

router.get('/', dealController.getDealsForUserApp);

module.exports = router;
