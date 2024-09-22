const express = require('express');
const router = express.Router();
const RatingSettingController = require('../../../../controllers/RatingSettingController');

/**
 * /app/user/rating-setting
 * @url http://localhost:5001/app/user/rating-setting
 *
 */

router.get('/', RatingSettingController.getRatingSettingForAdmin);

module.exports = router;
