const express = require('express');
const router = express.Router();
const MealPlanController = require('../../../controllers/MealPlanController');

/**
 * /admin/mealPlan
 * @url http://localhost:5001/admin/mealPlan
 *
 *
 */

router.get('/', MealPlanController.getMealPlans);
router.get('/single', MealPlanController.getSingleMealPlanById);

router.post('/add', MealPlanController.addMealPlan);
router.post('/update-dishes', MealPlanController.updateDishesInMealPlan);
router.post('/update-packages', MealPlanController.updatePackagesInMealPlan);
router.post('/delete', MealPlanController.deleteMealPlan);

module.exports = router;
