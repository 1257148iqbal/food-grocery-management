const express = require('express');
const router = express.Router();
const RewardController = require('../../../controllers/RewardController');

/**
 * /admin/reward
 * @url http://localhost:5001/admin/reward
 *
 *
 */

router.get('/', RewardController.getAllReward);
router.get('/sales-target', RewardController.getSingleSalesManagerTarget);

// Not used only for testing
router.post('/create-rider-reward', RewardController.createRiderReward);
router.post('/create-sales-reward', RewardController.createSalesReward);

module.exports = router;
