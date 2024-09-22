const express = require('express');
const router = express.Router();
const {
    bannerAddValidation,
    bannerUpdateValidation,
} = require('../../../validation/validation');
const bannerController = require('../../../controllers/BannerController');

/**
 * /admin
 * @url http://localhost:5001/admin/banner
 *
 */

router.get('/', bannerController.getAllBanners);
router.post('/add', bannerAddValidation, bannerController.addBanner);
router.post('/update', bannerUpdateValidation, bannerController.updateBanner);
router.post('/delete', bannerController.deleteBannerById);
router.get('/:id', bannerController.getSingleBannerById);
router.post('/sort', bannerController.sortBanners);

module.exports = router;
