const express = require('express');
const router = express.Router();
const SellerController = require('../../../../controllers/SellerController');
const ShopController = require('../../../../controllers/ShopController');
const DropPayController = require('../../../../controllers/DropPayController');
/**
 * /app/seller
 * @url http://localhost:5001/app/seller/profile
 *
 */

router.get('/', ShopController.getShopProfile);
router.get('/opening-hours', ShopController.getShopOpeningHours);
router.post('/update', ShopController.updateShopProfile);
router.post('/update-fcm-token', ShopController.updateShopFcmToken);
router.post('/remove-fcm-token', ShopController.removeShopFcmToken);
router.post('/change-password', ShopController.changePasswordForShopApp);
router.get('/get-transaction', DropPayController.getShopTransaction);

router.get('/balance-report', ShopController.balanceSummeryOfShop);

module.exports = router;
