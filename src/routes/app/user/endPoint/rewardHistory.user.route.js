const express = require('express');
const router = express.Router();
const RewardSettingController = require('../../../../controllers/RewardSettingController');

/**
 * /app/user/reward-history
 * @url http://localhost:5001/app/user/reward-history
 *
 */

router.get('/', RewardSettingController.getRewardHistoryForUserApp);

module.exports = router;
