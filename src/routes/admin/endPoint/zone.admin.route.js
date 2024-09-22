const express = require('express');
const router = express.Router();
const ZoneController = require('../../../controllers/ZoneController');
const { checkAdminToken } = require('../../../authentication/checkAdminToken');

/**
 * /admins/address
 * @url http://localhost:5001/admin/zone
 *
 *
 */

router.get('/', ZoneController.getAllZone);
router.get('/details', ZoneController.getSingleZoneById);
router.get('/statistics', ZoneController.getStatisticsForSpecificZone);
router.get('/map-overview', ZoneController.getZoneMapOverview);
router.get('/check', ZoneController.checkZoneForUserApp);

router.post('/add', checkAdminToken, ZoneController.addZone);
router.post('/update', checkAdminToken, ZoneController.updateZoneById);
router.post('/multiple-update', checkAdminToken, ZoneController.updateMultipleZoneByIds);
router.post('/delete', checkAdminToken, ZoneController.deleteZoneById);

module.exports = router;
