const express = require('express');
const router = express.Router();
const bannerController = require('../../../../controllers/BannerController');

/**
 * /app/user/banner
 * @url http://localhost:5001/app/user/banner
 *
 */

router.get('/', bannerController.getUserBanners);

module.exports = router;
