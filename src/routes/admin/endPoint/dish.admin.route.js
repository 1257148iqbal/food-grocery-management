const express = require('express');
const router = express.Router();
const DishController = require('../../../controllers/DishController');

/**
 * /admin/dish
 * @url http://localhost:5001/admin/dish
 *
 *
 */

router.get('/', DishController.getDishes);
router.get('/single', DishController.getSingleDishById);
router.get('/category-wise-dishes', DishController.getCategoryWiseDishes);

router.post('/add', DishController.addDish);
router.post('/update', DishController.updateDish);
router.post('/delete', DishController.deleteDish);
router.post('/sort', DishController.sortDishes);

module.exports = router;
