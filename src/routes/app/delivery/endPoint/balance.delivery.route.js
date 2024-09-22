const express = require('express');
const router = express.Router();
const {
    balanceSummery,
    riderEarningsHistory,
    riderTransactionsHistory,
} = require('../../../../controllers/DropWalletController');
const {
    getRiderAppProfitBreakdown,
    getRiderAppCurrentMonthProfit,
    getRiderAppWeeklyProfitGraph,
    getRiderAppCashOnHand,
    getRiderAppCashInHandAmount,
} = require('../../../../controllers/FinancialController');
const {
    getRiderPayoutHistoryInApp,
} = require('../../../../controllers/PayoutController');

/**
 * /app/delivery/auth
 * @url http://localhost:5001/app/delivery/balance
 *
 */

router.get('/summery', balanceSummery);
router.get('/earnings-history', riderEarningsHistory);
router.get('/transactions-history', riderTransactionsHistory);

router.get('/rider-profit', getRiderAppProfitBreakdown);
router.get('/current-month-profit', getRiderAppCurrentMonthProfit);
router.get('/weekly-profit-graph', getRiderAppWeeklyProfitGraph);
router.get('/cash-on-hand', getRiderAppCashOnHand);
router.get('/cash-in-hand-amount', getRiderAppCashInHandAmount);
router.get('/payout', getRiderPayoutHistoryInApp);

module.exports = router;
