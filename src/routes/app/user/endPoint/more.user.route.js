const express = require('express');
const router = express.Router();
const UserController = require('../../../../controllers/UserController');

/**
 * /app/user/more
 * @url http://localhost:5001/app/user/more
 *
 */

router.get('/terms', UserController.termsAndCondition);
router.get(
    '/subscription-terms',
    UserController.getSubscriptionTermsAndConditions
);

module.exports = router;
