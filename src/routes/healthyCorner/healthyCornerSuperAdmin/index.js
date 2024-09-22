const router = require('express').Router()
const SuperAdminAppSettings = require('./endpoints/healthyCornerSuperAdmin.route')

router.use('/admin-settings', SuperAdminAppSettings)

module.exports = router