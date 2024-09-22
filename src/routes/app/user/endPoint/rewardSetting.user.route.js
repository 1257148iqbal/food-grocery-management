const express = require('express');
const router = express.Router();
const RewardSettingController = require('../../../../controllers/RewardSettingController');

/**
 * /app/user/reward-setting
 * @url http://localhost:5001/app/user/reward-setting
 *
 */

router.get('/', RewardSettingController.getRewardSetting);

module.exports = router;
