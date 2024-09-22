const express = require('express');
const router = express.Router();
const AreebaCardController = require('../../../../controllers/AreebaCardController');
const { checkUserToken } = require('../../../../authentication/checkUserToken');

/**
 * /app/user/areeba-card
 * @url http://localhost:5001/app/user/areeba-card
 *
 */

router.get('/', checkUserToken, AreebaCardController.getUserAreebaCards);
router.post(
    '/validate',
    checkUserToken,
    AreebaCardController.validateAreebaCard
);
router.get('/add/:orderId', AreebaCardController.addAreebaCard);
router.post('/delete', checkUserToken, AreebaCardController.deleteAreebaCard);

module.exports = router;
