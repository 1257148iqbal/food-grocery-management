const express = require('express');
const router = express.Router();
const BOBFinanceController = require('../../../controllers/BOBFinanceController');
const { checkAdminToken } = require('../../../authentication/checkAdminToken');

/**
 * /admin/bobFinance
 * @url http://localhost:5001/admin/bobFinance
 *
 */

router.get('/transactions', BOBFinanceController.getBoBFinanceTransaction);
router.get('/currentBalance', BOBFinanceController.getBoBFinanceCurrentBalance);
router.post(
    '/settlePayout',
    checkAdminToken,
    BOBFinanceController.settlePayout
);

router.get('/GetTransfers', BOBFinanceController.GetTransfers);
router.get('/GetTransferStatus', BOBFinanceController.GetTransferStatus);
router.get(
    '/GetTransactionDetails',
    BOBFinanceController.GetTransactionDetails
);
router.get('/ClearTransfers', BOBFinanceController.ClearTransfers);
router.get('/RemoveTransfer', BOBFinanceController.RemoveTransfer);
router.get('/GetLimit', BOBFinanceController.GetLimit);

// Not Used
router.post(
    '/updateBoBFinanceStatus',
    BOBFinanceController.updateBoBFinanceStatus
);
router.post(
    '/updateBoBFinanceStatusForcefully',
    BOBFinanceController.updateBoBFinanceStatusForcefully
);

module.exports = router;
