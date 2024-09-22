const express = require('express');
const router = express.Router();
const RequestAreaController = require('../../../controllers/RequestAreaController');

/**
 * /admin/request-area
 * @url http://localhost:5001/admin/request-area
 *
 */

router.get('/', RequestAreaController.getRequestNewAreas);
router.get('/single', RequestAreaController.getRequestNewAreaById);

router.post('/delete', RequestAreaController.deleteRequestNewAreaById);

module.exports = router;
