const express = require('express');
const router = express.Router();
const CuisinesController = require('../../../controllers/CuisinesController');
const {
    CuisinesAddValidation,
    CuisinesUpdateValidation,
} = require('../../../validation/cuisinesValidation');

/**
 * /admin
 * @url http://localhost:5001/admin/cuisines
 *
 */

router.get('/', CuisinesController.getCuisines);
router.post('/add', CuisinesAddValidation, CuisinesController.addCuisines);
router.post(
    '/update',
    CuisinesUpdateValidation,
    CuisinesController.updateCuisines
);
router.post('/delete', CuisinesController.deleteCuisines);

module.exports = router;
