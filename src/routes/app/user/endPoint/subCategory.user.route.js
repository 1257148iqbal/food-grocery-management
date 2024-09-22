const express = require('express');
const router = express.Router();
const SubCategoryController = require('../../../../controllers/SubCategoryController');

/**
 * /app/user/sub-category
 * @url http://localhost:5001/app/user/sub-category
 *
 */

router.get('/', SubCategoryController.getSubCategoryByCategoryIdForUser);

module.exports = router;
