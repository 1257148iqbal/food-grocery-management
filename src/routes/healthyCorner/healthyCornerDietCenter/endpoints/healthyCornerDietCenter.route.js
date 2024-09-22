const router = require('express').Router()
const auth = require('../../../../authentication/checkAdminToken')

const HealthyCornerDietCenterAppSettings = require('../../../../controllers/HealthyCorner/DietCenter/DietCenterAdminAppSettingsController')

router.post('/app-settings', HealthyCornerDietCenterAppSettings.editHealthyCornerSettings)


module.exports = router