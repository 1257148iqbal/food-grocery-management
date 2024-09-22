const express = require('express');
const { checkAdminToken } = require('../../../authentication/checkAdminToken');
const { checkShopToken } = require('../../../authentication/checkShopToken');
const router = express.Router();
const DropWalletController = require('../../../controllers/DropWalletController');

/**
 * /admin/drop-wallet
 * @url http://localhost:5001/admin/drop-wallet
 */

router.get('/sellers', DropWalletController.getSeller);
router.get('/seller/shops', DropWalletController.getShops);
router.post('/seller/shops-details', DropWalletController.getSingleShop);
router.get('/transection', DropWalletController.getTransection);

// router.get('/delivery-boy-transection', DropWalletController.getDeliveryBoy);
router.get(
    '/single-delivery-boy-info',
    DropWalletController.getSingleDeliveryBoy
);
router.get(
    '/single-delivery-boy-info/cash-order-list',
    DropWalletController.getSingleDeliveryBoyCashOrderList
);
router.get(
    '/single-delivery-boy-info/transaction',
    DropWalletController.getSingleDeliveryBoyTransaction
);
router.post(
    '/settle-amount-seller',
    checkAdminToken,
    DropWalletController.shopSettleAmount
);
router.post(
    '/shop-amount-add-remove',
    checkAdminToken,
    DropWalletController.shopAddRemoveAmount
);
router.post(
    '/settle-amount-delivery-boy',
    checkAdminToken,
    DropWalletController.adminMakePaymentDeliveryBoy
);
router.post(
    '/rider-amount-add-remove',
    checkAdminToken,
    DropWalletController.riderAddRemoveAmount
);
router.post(
    '/cash-received-from-delivery-boy',
    checkAdminToken,
    DropWalletController.adminCashReceivedFromDeliveryBoy
);

router.get(
    '/testing',
    checkAdminToken,
    DropWalletController.getTotalDropEarningFromSeller
);

// Vat API
router.post('/admin-vat-details', DropWalletController.getAdminVatDetails);
router.post('/shop-vat-details', DropWalletController.getSingleShopVatDetails);
router.post(
    '/settle-admin-vat',
    checkAdminToken,
    DropWalletController.settleVatByAdmin
);
router.post(
    '/settle-shop-vat',
    checkShopToken,
    DropWalletController.settleVatByShop
);

// Lyxa pay wallet feature
router.post(
    '/top-up',
    checkAdminToken,
    DropWalletController.topUpAdminWalletFromEarning
);
router.get('/balance', DropWalletController.getAdminWalletCurrentBalance);

module.exports = router;
