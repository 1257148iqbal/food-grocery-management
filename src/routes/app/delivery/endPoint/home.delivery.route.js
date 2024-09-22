const express = require('express');
const router = express.Router();
const DeliveryBoyController = require('../../../../controllers/DeliveryBoyController');
const appSettingController = require('../../../../controllers/AppSettingController');

/**
 * /app/delivery/address
 * @url http://localhost:5001/app/delivery/home
 *
 */

router.get('/terms', DeliveryBoyController.termsAndConditionDeliveryBoy);
router.get('/privacy', DeliveryBoyController.getDeliveryAppPrivacyPolicy);
router.get('/about', DeliveryBoyController.getDeliveryAppAboutUs);
router.get('/contact', DeliveryBoyController.getDeliveryAppContactUs);
router.get('/return', DeliveryBoyController.getDeliveryAppReturnPolicy);
router.get('/currency', appSettingController.getAppSetting);

module.exports = router;
