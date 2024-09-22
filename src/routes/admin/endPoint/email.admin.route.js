const express = require('express');
const router = express.Router();
const EmailController = require('../../../controllers/EmailController');

/**
 * /email
 * @url http://localhost:5001/admin/email
 *
 *
 */

router.post('/', EmailController.emailSend);

module.exports = router;
