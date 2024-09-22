const router = require('express').Router()
const auth = require('../../../../authentication/checkAdminToken')

const HealthyCornerSuperAdminAppSettings = require('../../../../controllers/HealthyCorner/SuperAdmin/HealthyCornerSuperAdminAppSettingsController')
const createMeal = require('../../../../controllers/HealthyCorner/SuperAdmin/HealthyCornerSuperAdminMealPlanController')

router.post('/app-settings', auth.checkAdminToken, HealthyCornerSuperAdminAppSettings.editHealthyCornerSettings)
router.get('/get-app-settings',  HealthyCornerSuperAdminAppSettings.getHealthyCornerAppSettings)
router.post('/create-meal-plan', auth.checkAdminToken,createMeal.createMealPlans)
router.get('/get-meal-plan', createMeal.getMealPlans)

module.exports = router