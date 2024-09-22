const express = require('express');
const router = express.Router();
const FlagController = require('../../../controllers/FlagController');

/**
 * /admin/flag
 * @url http://localhost:5001/admin/flag
 *
 *
 */

router.get('/', FlagController.getFlag);
router.get('/order', FlagController.getFlaggedOrder);
router.get('/single-flag', FlagController.singleFlag);
router.post('/resolved-flag', FlagController.resolvedFlag);
router.post('/resolved-multiple-flag', FlagController.resolvedMultipleFlag);

module.exports = router;
