const express = require('express');
const router = express.Router();
const AvailableStatusController = require('../../../../controllers/AvailableStatusController');

/**
 * /app/seller/status
 * @url http://localhost:5001/app/seller/status
 *
 */

router.get('/', AvailableStatusController.getAvailableStatusForShop);
router.post('/update', AvailableStatusController.updateStatusforShop);

module.exports = router;
