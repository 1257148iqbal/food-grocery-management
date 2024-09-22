const express = require('express');
const router = express.Router();
const AddressController = require('../../../controllers/AddressController');
const UserController = require('../../../controllers/UserController');
const {
    addressAddValidation,
} = require('../../../validation/addressValidation');

/**
 * /admins
 * @url http://localhost:5001/admin/user
 *
 *
 */

router.get('/', UserController.getAllUsers);
router.post('/add', UserController.addUserByAdmin);
router.post('/update', UserController.updateUserById);
router.post('/update-status', UserController.updateUserStatus);
router.post(
    '/add-address',
    addressAddValidation,
    AddressController.addUserAddress
);
router.get('/get-address', AddressController.getAllUserAddress);
router.get('/get-user-details', UserController.getUserDetailsForAdmin);
router.post('/add-balance', UserController.addBalanceByAdmin);
router.post('/withdraw-balance', UserController.withdrawBalanceByAdmin);
router.get('/get-user-balance', UserController.getUserBalanceForAdmin);
router.get('/get-user-transaction', UserController.getUserTransactions);
router.get('/reviews', UserController.getUserReviews);
router.get('/flags', UserController.getUserFlags);

module.exports = router;
