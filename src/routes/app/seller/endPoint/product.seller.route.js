const express = require('express');
const router = express.Router();
const ProductController = require('../../../../controllers/ProductController');

/**
 * /app/seller
 * @url http://localhost:5001/app/seller/products
 *
 */
router.get(
    '/category-wise-products',
    ProductController.getCategoryWiseProducts
);
router.post('/sort', ProductController.sortProducts);
router.post('/update-stock', ProductController.updateProductStockStatus);
router.post('/update-status', ProductController.productStatusChange);

module.exports = router;
