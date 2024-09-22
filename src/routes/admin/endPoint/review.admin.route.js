const express = require('express');
const router = express.Router();
const ReviewController = require('../../../controllers/ReviewController');

/**
 * /admin
 * @url http://localhost:5001/admin/review
 *
 */


router.post('/delete', ReviewController.deleteReviewById);
router.post('/update-visibility', ReviewController.updateReviewVisibility);

module.exports = router;
