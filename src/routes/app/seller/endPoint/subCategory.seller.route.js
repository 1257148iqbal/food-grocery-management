const express = require('express');
const router = express.Router();
const SubCategoryController = require('../../../../controllers/SubCategoryController');

/**
 * /app/seller
 * @url http://localhost:5001/app/seller/sub-category
 *
 */

router.post('/sort', SubCategoryController.sortSubCategories);

module.exports = router;
