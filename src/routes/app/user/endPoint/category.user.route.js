const express = require('express');
const router = express.Router();
const CategoryController = require('../../../../controllers/CategoryController');

/**
 * /app/user/category
 * @url http://localhost:5001/app/user/category
 *
 */

router.get('/', CategoryController.getCategoryForUser);

module.exports = router;
