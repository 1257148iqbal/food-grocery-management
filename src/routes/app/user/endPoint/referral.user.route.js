const express = require('express');
const router = express.Router();
const CouponController = require('../../../../controllers/CouponController');
const ReferralSettingController = require('../../../../controllers/ReferralSettingController');

/**
 * /app/user/banner
 * @url http://localhost:5001/app/user/referral
 *
 */

router.get('/', ReferralSettingController.getReferralCodeForUserApp);
router.get('/setting', ReferralSettingController.getReferralSetting);

module.exports = router;
