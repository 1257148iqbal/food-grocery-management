const express = require('express');
const router = express.Router();
const ShopController = require('../../../../controllers/ShopController');
const AppSettingController = require('../../../../controllers/AppSettingController');

/**
 * /app/delivery/address
 * @url http://localhost:5001/app/seller/more
 *
 */

router.get('/terms', ShopController.termsAndConditionStoreApp);
router.get('/currency', AppSettingController.getAppSetting);

module.exports = router;
