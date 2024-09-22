const express = require('express');
const router = express.Router();
const AvailableStatusController = require('../../../../controllers/AvailableStatusController');

/**
 * /app/delivery/status
 * @url http://localhost:5001/app/delivery/status
 *
 */

router.get('/', AvailableStatusController.getAvailableStatusForDeliveryBoy);
router.get('/update', AvailableStatusController.updateStatusforDeliveryBoy);

module.exports = router;
