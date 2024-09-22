const router = require('express').Router()
const DietCenterAppSettings = require('./endpoints/healthyCornerDietCenter.route')

router.use('/settings', DietCenterAppSettings)

module.exports = router