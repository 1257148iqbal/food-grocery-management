const express = require('express');
const router = express.Router();
const CategoryController = require('../../../../controllers/CategoryController');

/**
 * /app/seller
 * @url http://localhost:5001/app/seller/category
 *
 */

router.post('/sort', CategoryController.sortCategories);

module.exports = router;
