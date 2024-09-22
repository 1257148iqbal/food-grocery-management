const express = require('express');
const router = express.Router();
const dashBoradController = require('../../../controllers/DashBoradController');
const { checkAdminToken } = require('../../../authentication/checkAdminToken');
const { checkShopToken } = require('../../../authentication/checkShopToken');
const {
    checkSellerToken,
} = require('../../../authentication/checkSellerToken');
const {
    getSingleShopDashBoard,
    getSingleSellerDashBoard,
    getShopCustomersDashBoard,
    getSingleShopOperationsDashBoard,
    getSingleShopItemRanking,
    getSingleSellerShopList,
    getShopOverviewDashBoard,
} = require('../../../controllers/DropWalletController');

/**
 * /admin
 * @url http://localhost:5001/admin/dashboard
 *
 */

router.get('/', dashBoradController.getDashBordInfo);
router.get('/lyxa-earning', dashBoradController.getLyxaEarning);
router.get('/graph/orders', dashBoradController.getAdminGraphOrder);
router.get('/graph/users', dashBoradController.getAdminGraphUser);
router.get('/graph/earnings', dashBoradController.getAdminGraphEarnings);
router.get('/shop', getSingleShopDashBoard);
router.get('/shop/overview', getShopOverviewDashBoard);
router.get('/shop/customers', getShopCustomersDashBoard);
router.get('/shop/operations', getSingleShopOperationsDashBoard);
router.get('/shop/item-ranking', getSingleShopItemRanking);
router.get('/shop/graph/orders', dashBoradController.getShopGraphOrder);
router.get(
    '/shop/graph/orders-hourly',
    dashBoradController.getShopGraphOrderByHourly
);
router.get(
    '/shop/graph/earnings',
    checkShopToken,
    dashBoradController.getShopGraphEarning
);
router.get('/shop/graph/revenue', dashBoradController.getGraphOfRevenue);
router.get('/shop/graph/payout', dashBoradController.getGraphOfPayout);
router.get(
    '/shop/graph/marketing-spent',
    dashBoradController.getGraphOfMarketingSpent
);
router.get(
    '/shop/graph/orders-issue',
    dashBoradController.getGraphOfOrdersIssue
);
router.get(
    '/shop/graph/customers-sales',
    dashBoradController.getGraphOfCustomersSales
);
router.get('/seller', getSingleSellerDashBoard);
router.get('/seller/shop-list', getSingleSellerShopList);
router.get('/seller/graph/orders', dashBoradController.getSellerGraphOrder);
router.get(
    '/seller/graph/earnings',
    checkSellerToken,
    dashBoradController.getSellerGraphEarning
);
// Sales manager
router.get(
    '/sales',
    checkAdminToken,
    dashBoradController.getSingleSalesDashBoard
);
router.get(
    '/sales/graph/sellers',
    checkAdminToken,
    dashBoradController.getSalesGraphSellers
);
router.get(
    '/sales/graph/shops',
    checkAdminToken,
    dashBoradController.getSalesGraphShops
);
router.get(
    '/sales/graph/orders',
    checkAdminToken,
    dashBoradController.getSalesGraphOrder
);
// Account manager
router.get(
    '/account-manager',
    checkAdminToken,
    dashBoradController.getSingleAccountManagerDashBoard
);
router.get(
    '/account-manager/graph/orders',
    checkAdminToken,
    dashBoradController.getAccountManagerGraphOrder
);
router.get(
    '/account-manager/graph/marketing',
    checkAdminToken,
    dashBoradController.getAccountManagerGraphMarketing
);
router.get(
    '/account-manager/graph/rejected-orders',
    checkAdminToken,
    dashBoradController.getAccountManagerGraphRejectedOrder
);
router.get(
    '/account-manager/table/shops',
    checkAdminToken,
    dashBoradController.getAccountManagerTableShops
);
// Rider Dashboard
router.get('/rider', dashBoradController.getSingleRiderDashboard);
// Operations Dashboard
router.get('/operations', dashBoradController.getOperationsDashboard);
router.get('/operations/zone', dashBoradController.getZoneWiseAvailableRiders);
router.get(
    '/operations/rider-order',
    dashBoradController.getAllRidersSortedByAvgOrders
);
router.get(
    '/operations/rider-performance',
    dashBoradController.getAllRidersSortedByDeliveryTime
);
router.get(
    '/operations/shop',
    dashBoradController.getAllShopsSortedByFlaggedReason
);
router.get(
    '/operations/shop-worst-performed',
    dashBoradController.getAllShopsSortedByWorstPerformed
);
router.get(
    '/operations/shop-delay-metrics',
    dashBoradController.getAllShopsDelayMetrics
);
router.get(
    '/operations/graph/orders-hourly',
    dashBoradController.getOperationsGraphOrderByHourly
);
router.get(
    '/operations/graph/late-orders',
    dashBoradController.getGraphOfLateOrders
);
router.get(
    '/operations/graph/canceled-orders',
    dashBoradController.getGraphOfCanceledOrders
);
router.get(
    '/operations/graph/admin-canceled-orders',
    dashBoradController.getGraphOfAdminCanceledOrders
);
router.get(
    '/operations/graph/replacement-orders',
    dashBoradController.getGraphOfReplacementOrders
);
// Customer Support Dashboard
router.get(
    '/customer-support',
    dashBoradController.getSingleCustomerSupportDashboard
);
router.get(
    '/customer-support/table/reasonMessage',
    dashBoradController.getTableOfReasonMessage
);
router.get(
    '/customer-support/table/resolveReason',
    dashBoradController.getTableOfResolveReason
);
router.get(
    '/customer-support/graph/resolve-ticket',
    dashBoradController.getGraphOfResolvedTickets
);
router.get(
    '/customer-support/table/performance',
    dashBoradController.getTableOfCustomerServicePerformance
);
// Marketing Dashboard
router.get(
    '/marketing-manager',
    checkAdminToken,
    dashBoradController.getSingleMarketingManagerDashboard
);
router.get(
    '/marketing-manager/graph/marketing',
    checkAdminToken,
    dashBoradController.getMarketingManagerGraphMarketing
);
router.get(
    '/marketing-manager/graph/marketing-spent',
    checkAdminToken,
    dashBoradController.getMarketingManagerGraphMarketingSpent
);
router.get(
    '/marketing-manager/table/shops',
    checkAdminToken,
    dashBoradController.getMarketingManagerTableShops
);
router.get(
    '/marketing-manager/table/deals',
    checkAdminToken,
    dashBoradController.getMarketingManagerTableDeals
);
// General Dashboard
router.get('/general', dashBoradController.getGeneralDashboard);
// Financial Dashboard
router.get(
    '/financial/graph/totalAdminProfit',
    dashBoradController.getTotalAdminProfitGraph
);
router.get(
    '/financial/graph/adminDeliveryProfit',
    dashBoradController.getAdminDeliveryProfitGraph
);
router.get(
    '/financial/graph/adminRefund',
    dashBoradController.getAdminRefundGraph
);
router.get(
    '/financial/graph/totalMarketingSpent',
    dashBoradController.getTotalMarketingSpentGraph
);
router.get(
    '/financial/graph/adminMarketingSpent',
    dashBoradController.getAdminMarketingSpentGraph
);
router.get(
    '/financial/graph/shopMarketingSpent',
    dashBoradController.getShopMarketingSpentGraph
);
router.get(
    '/financial/graph/freeDeliveryByAdmin',
    dashBoradController.getFreeDeliveryByAdminGraph
);
router.get(
    '/financial/graph/freeDeliveryByShop',
    dashBoradController.getFreeDeliveryByShopGraph
);
router.get(
    '/financial/graph/adminMarketingCashback',
    dashBoradController.getAdminMarketingCashbackGraph
);
router.get(
    '/financial/graph/totalDeliveryFees',
    dashBoradController.getTotalDeliveryFeesGraph
);
router.get(
    '/financial/graph/totalShopPayout',
    dashBoradController.getTotalShopPayoutGraph
);
router.get('/financial', dashBoradController.getFinancialDashboard);
// Customer tab
router.get('/customers', dashBoradController.getCustomersDashBoard);
router.get('/customers/table', dashBoradController.getCustomersTable);
router.get('/customers/graph', dashBoradController.getCustomersGraph);

// Live Dashboard
router.get('/live', dashBoradController.getLiveDashboard);
// Statistics Dashboard
router.get('/statistics', dashBoradController.getStatisticsDashboard);

module.exports = router;
