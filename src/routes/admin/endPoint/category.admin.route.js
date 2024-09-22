const express = require('express');
const router = express.Router();
const CategoryController = require('../../../controllers/CategoryController');
const {
    CategoryAddValidation,
    CatergoryUpdateValidation,
} = require('../../../validation/CategoryValidation');

/**
 * /admin
 * @url http://localhost:5001/admin/category
 *
 */

router.get('/', CategoryController.getCategory);
router.post('/add-category', CategoryController.createCategory);
router.post('/update', CategoryController.updateCategory);
router.post('/update/multiple', CategoryController.updateMultipleCategory);
router.post('/delete', CategoryController.deleteCategoryById);
router.get('/get-single-category', CategoryController.getSingleCategory);
router.post('/sort', CategoryController.sortCategories);
router.get('/products', CategoryController.getCategoryProducts);
router.post(
    '/products/multiple',
    CategoryController.getMultipleCategoryProducts
);
router.get('/shop', CategoryController.getShopsByCategory);

module.exports = router;
