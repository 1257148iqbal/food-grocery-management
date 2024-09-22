const express = require('express');
const router = express.Router();


const appSettingController = require('../../../../controllers/AppSettingController');

/**
 * /app/user/privacy
 * @url http://localhost:5001/app/user/privacy
 *
 */



router.get('/',appSettingController.getPrivacySettings);
module.exports = router;
