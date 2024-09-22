const express = require('express');
const router = express.Router();
const MarketingController = require('../../../controllers/MarketingController');
/**
 * /admins/address
 * @url http://localhost:5001/admin/marketing
 *
 *
 */

router.get('/', MarketingController.getMarketing);
router.post('/edit', MarketingController.editMarketing);
router.post('/delete', MarketingController.deleteMarketing);
router.get('/dashboard', MarketingController.getDashboardInfo);
router.get('/graph/orders', MarketingController.getMarketingGraphOrders);
router.get('/graph/customers', MarketingController.getMarketingGraphCustomers);
router.get(
    '/graph/amount-spent',
    MarketingController.getMarketingGraphAmountSpent
);
router.get(
    '/graph/loyalty-points',
    MarketingController.getMarketingGraphLoyaltyPoints
);
router.get(
    '/graph/loyalty-points/amount-spent',
    MarketingController.getMarketingGraphLoyaltyPointsAmountSpent
);
router.get('/history', MarketingController.getMarketingHistory);

module.exports = router;
