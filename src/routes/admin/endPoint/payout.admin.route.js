const express = require('express');
const router = express.Router();
const PayoutController = require('../../../controllers/PayoutController');
const { checkAdminToken } = require('../../../authentication/checkAdminToken');
const {
    restartPayoutScheduleCronJob,
} = require('../../../cronJob/payoutSystem');
const {
    successResponse,
    errorResponse,
} = require('../../../helpers/apiResponse');

/**
 * /admin/payout
 * @url http://localhost:5001/admin/payout
 *
 */

router.get('/', PayoutController.getPayouts);
router.post('/revoked', PayoutController.revokedPayout);
router.post('/paid', checkAdminToken, PayoutController.paidPayout);
router.post(
    '/add-remove-credit',
    checkAdminToken,
    PayoutController.addRemoveCreditPayout
);
router.post('/temporary-create-payout', PayoutController.temporaryPayout);

let isRestarting = false;
router.post('/restart-payout-schedule-cron', async (req, res) => {
    if (isRestarting) {
        // If already restarting, return immediately
        return successResponse(res, { message: 'Already restarting' });
    }

    try {
        // Set the flag to indicate that restarting is in progress
        isRestarting = true;

        // Call payout schedule cron
        await restartPayoutScheduleCronJob();

        successResponse(res, { message: 'Successfully restarted' });
    } catch (error) {
        isRestarting = false;
        errorResponse(res, error.message);
    } finally {
        // Reset the flag after restarting is done
        isRestarting = false;
    }
});

module.exports = router;
