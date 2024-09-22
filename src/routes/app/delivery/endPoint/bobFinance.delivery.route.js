const express = require('express');
const router = express.Router();
const BOBFinanceController = require('../../../../controllers/BOBFinanceController');

/**
 * /app/delivery/bobFinance
 * @url http://localhost:5001/app/delivery/bobFinance
 *
 */

router.get('/single', BOBFinanceController.getRiderSettlementByIdForApp);
router.get(
    '/ongoingRequest',
    BOBFinanceController.getRiderOngoingRequestForApp
);
router.get('/unpaidRequest', BOBFinanceController.getRiderUnpaidRequestForApp);
router.post('/settleCash', BOBFinanceController.settleRiderCashInHandForApp);

module.exports = router;
