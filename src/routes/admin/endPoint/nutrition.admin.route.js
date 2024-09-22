const express = require('express');
const router = express.Router();
const NutritionController = require('../../../controllers/NutritionController');

/**
 * /admin/nutrition
 * @url http://localhost:5001/admin/nutrition
 *
 */

router.get('/', NutritionController.getNutrition);
router.post('/add', NutritionController.addNutrition);
router.post('/update', NutritionController.updateNutrition);
router.post('/delete', NutritionController.deleteNutrition);
router.get('/product', NutritionController.getNutritionProduct);

module.exports = router;
