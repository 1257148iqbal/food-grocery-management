const express = require('express');
const AdminController = require('../../../controllers/AdminController');
const {
    AdminAddValidation,
    AdminUpdateValidation,
} = require('../../../validation/adminValidation');
const router = express.Router();

/**
 * /admins
 * @url http://localhost:5001/admin/admins
 *
 */

router.get('/', AdminController.getAdmin);
router.post('/add-admin', AdminAddValidation, AdminController.addAdmin);
router.post('/update', AdminUpdateValidation, AdminController.updateAdmin);
router.post('/delete', AdminController.deleteAdminById);
router.get('/get-single-admin-details', AdminController.getSingleAdminDetails);
router.post('/change-password', AdminController.changePasswordForAdmin);
router.post('/update-live-status', AdminController.updateAdminLiveStatus);

module.exports = router;
