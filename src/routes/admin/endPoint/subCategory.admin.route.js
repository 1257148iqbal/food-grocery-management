const express = require('express');
const router = express.Router();
const SubCategoryController = require('../../../controllers/SubCategoryController');
const {
    SubCategoryAddValidation,
    SubCatergoryUpdateValidation,
} = require('../../../validation/subCategoryValidation');

/**
 * /admin
 * @url http://localhost:5001/admin/sub-category
 *
 */

router.get('/', SubCategoryController.getSubCategory);
router.post(
    '/add',
    SubCategoryAddValidation,
    SubCategoryController.createSubCategory
);
router.post('/update', SubCategoryController.updateSubCategory);
router.post('/delete', SubCategoryController.deleteSubCategoryById);
router.get('/get-single-details', SubCategoryController.getSingleSubCategory);
router.get(
    '/get-all-subcategory-by-category-id',
    SubCategoryController.getSubCategoryByCategoryId
);
router.post('/sort', SubCategoryController.sortSubCategories);

module.exports = router;
