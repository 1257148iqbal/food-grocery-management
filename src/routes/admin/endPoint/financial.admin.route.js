const express = require('express');
const router = express.Router();
const FinancialController = require('../../../controllers/FinancialController');

/**
 * /admin/financial
 * @url http://localhost:5001/admin/financial
 *
 */

router.get('/', FinancialController.getAdminFinancialSummary);
router.get('/order', FinancialController.getAdminOrderFinancial);
router.get(
    '/order/shop-profit-breakdown',
    FinancialController.getShopAdminProfitBreakdown
);
router.get('/delivery', FinancialController.getAdminDeliveryFinancial);
router.get(
    '/global-delivery',
    FinancialController.getAdminGlobalDeliveryFinancial
);
// router.get(
//     '/delivery/rider-profit-breakdown',
//     FinancialController.getRiderAdminProfitBreakdown
// );
router.get(
    '/delivery/shop-profit-breakdown',
    FinancialController.getShopAdminDeliveryProfitBreakdown
);
router.get('/butler', FinancialController.getAdminButlerFinancial);
// router.get('/butler/rider-profit-breakdown', FinancialController.getButlerRiderAdminProfitBreakdown);
router.get(
    '/butler/order-profit-breakdown',
    FinancialController.getButlerOrderAdminProfitBreakdown
);

router.get('/shop', FinancialController.getShopFinancial);
router.get(
    '/shop/order-profit-breakdown',
    FinancialController.getOrderShopProfitBreakdown
);
router.get(
    '/shop/seller-profit-breakdown',
    FinancialController.getSellerShopProfitBreakdown
);
router.get(
    '/shop/seller-profit-breakdown/all',
    FinancialController.getAllSellerShopProfitBreakdown
);
router.get(
    '/shop/shop-profit-breakdown',
    FinancialController.getShopProfitBreakdown
);
router.get(
    '/shop/shop-profit-breakdown/all',
    FinancialController.getAllShopProfitBreakdown
);

router.get('/rider', FinancialController.getRiderFinancial);
router.get(
    '/rider/rider-profit-breakdown',
    FinancialController.getRiderProfitBreakdown
);
router.get(
    '/rider/rider-profit-breakdown/all',
    FinancialController.getAllRiderProfitBreakdown
);
router.get(
    '/rider/order-profit-breakdown',
    FinancialController.getOrderRiderProfitBreakdown
);

router.get('/pending-amount', FinancialController.getOrderPendingAmount);

// Cash Flow
router.get('/cash-flow', FinancialController.getCashFlowSummary);

module.exports = router;
