const { verify } = require('jsonwebtoken');
const Seller = require('../models/SellerModel');
module.exports.checkSellerToken = async (req, res, next) => {
    try {
        var token = req.get('authorization');

        if (!token) {
            return res.status(401).json({
                status: false,
                message: 'Access denied! unauthorized Admin',
            });
        }

        token = token.slice(7);

        const { sellerId } = verify(token, process.env.JWT_PRIVATE_KEY_SELLER);

        if (!sellerId) {
            return res.status(403).json({
                status: false,
                message: 'Invalid token',
            });
        }

        const seller = await Seller.findOne({
            _id: sellerId,
            status: 'active',
            deletedAt: null,
        });

        if (!seller) {
            return res.status(403).json({
                status: false,
                message: 'Invalid token',
            });
        }

        req.sellerId = sellerId;
        req.requestId = sellerId;

        next();
    } catch (err) {
        return res.status(500).json({
            status: false,
            error: err.message,
        });
    }
};

