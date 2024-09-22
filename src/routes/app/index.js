const express = require('express');
const router = express.Router();
const UniqueId = require('../../models/UniqueIdModel');
const CartController = require('../../controllers/CartController');
const ReferralSettingController = require('../../controllers/ReferralSettingController');

/**
 * /app
 * @url http://localhost:5001/app
 *
 */

router.use('/user', require('./user'));
router.use('/seller', require('./seller'));
router.use('/delivery', require('./delivery'));
router.get('/reset-product', async (req, res) => {
    try {
        await UniqueId.findOneAndUpdate({}, { count: 0 });
        return res
            .status(200)
            .json({ message: 'Product Counter Reset Successfully' });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.get('/group-cart/:groupID/join', CartController.redirectGroupScreen);
router.get('/invite', ReferralSettingController.redirectInviteFriendScreen);

module.exports = router;
