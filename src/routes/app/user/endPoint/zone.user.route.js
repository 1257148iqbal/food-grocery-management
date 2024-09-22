const express = require('express');
const router = express.Router();
const ZoneController = require('../../../../controllers/ZoneController');

/**
 * /app/user/profile
 * @url http://localhost:5001/app/user/zone
 *
 */

router.get('/check', ZoneController.checkZoneForUserApp);

module.exports = router;
