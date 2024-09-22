const express = require('express');
const router = express.Router();
const ZoneController = require('../../../../controllers/ZoneController');

/**
 * /app/delivery/auth
 * @url http://localhost:5001/app/delivery/zone
 *
 */

router.get('/', ZoneController.getAllZone);

module.exports = router;
