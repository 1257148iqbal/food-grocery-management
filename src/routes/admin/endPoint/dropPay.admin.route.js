const express = require('express');
const router = express.Router();
const dropPayController = require('../../../controllers/DropPayController');

/**
 * /admin/drop-pay
 * @url http://localhost:5001/admin/drop-pay
 *
 */

router.get('/', dropPayController.getDropPay);
router.get('/all', dropPayController.getAllDropPay);
router.get('/get-amount-user-list', dropPayController.getDropPayUseList);


module.exports = router;
