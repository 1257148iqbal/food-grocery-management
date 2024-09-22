const express = require('express');
const router = express.Router();
const UserAppScreenController = require('../../../controllers/UserAppScreenController');

/**
 * /admin
 * @url http://localhost:5001/admin/userAppScreen
 *
 */

router.get('/', UserAppScreenController.getUserAppScreens);
router.post('/add', UserAppScreenController.addUserAppScreen);
router.post('/update', UserAppScreenController.updateUserAppScreen);
router.post('/delete', UserAppScreenController.deleteUserAppScreen);
router.post('/sort', UserAppScreenController.sortUserAppScreen);

module.exports = router;
