const express = require('express');
const router = express.Router();
const RequestAreaController = require('../../../../controllers/RequestAreaController');

/**
 * /app/user/request-area
 * @url http://localhost:5001/app/user/request-area
 *
 */

router.post('/send', RequestAreaController.sendRequestNewArea);

module.exports = router;
