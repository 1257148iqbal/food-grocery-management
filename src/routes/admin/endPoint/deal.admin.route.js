const express = require('express');
const router = express.Router();
const dealController = require('../../../controllers/DealController');

/**
 * /admin
 * @url http://localhost:5001/admin/deal
 *
 */

// deal
router.get('/', dealController.getAllDealForAdmin);
router.get('/get-deals-for-add', dealController.getAllDealsForAdd);
router.get(
    '/get-all-deals-for-add-shop-deal',
    dealController.getAllDealForAddShopAdmin
);
router.post('/add', dealController.addDealFromAdmin);
router.post('/edit', dealController.editDealFromAdmin);
router.post('/delete', dealController.deleteDealFromAdmin);
router.get('/get-tags', dealController.getTags);
router.get('/:id', dealController.getSingleDealForAdmin);

module.exports = router;
