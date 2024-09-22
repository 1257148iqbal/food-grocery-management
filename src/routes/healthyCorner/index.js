const router = require('express').Router()
const HealthyCornerSuperAdmin = require('./healthyCornerSuperAdmin/index')
const DietCenter = require('./healthyCornerDietCenter/index')

router.use('/super-admin', HealthyCornerSuperAdmin)
router.use('/diet-center', DietCenter)

module.exports = router