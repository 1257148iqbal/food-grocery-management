const express = require('express');
const router = express.Router();
const GlobalMealPlanController = require('../../../controllers/GlobalMealPlanController');

/**
 * /admin/globalMealPlan
 * @url http://localhost:5001/admin/globalMealPlan
 *
 *
 */

router.get('/', GlobalMealPlanController.getGlobalMealPlans);
router.get('/single', GlobalMealPlanController.getSingleGlobalMealPlanById);

router.post('/add', GlobalMealPlanController.addGlobalMealPlan);
router.post('/update', GlobalMealPlanController.updateGlobalMealPlan);
router.post('/delete', GlobalMealPlanController.deleteGlobalMealPlan);

module.exports = router;
