const { verify } = require('jsonwebtoken');
const ShopModel = require('../models/ShopModel');
const { errorHandler } = require('../helpers/apiResponse');
module.exports.checkShopToken = async (req, res, next) => {
    try {
        var token = req.get('authorization');

        if (!token) {
            return res.status(401).json({
                status: false,
                message: 'Access denied! unauthorized Shop',
            });
        }

        token = token.slice(7);

        const { shopId } = verify(token, process.env.JWT_PRIVATE_KEY_SHOP);

        if (!shopId) {
            return res.status(403).json({
                status: false,
                message: 'Invalid token 0',
            });
        }

        const shop = await ShopModel.findOne({
            _id: shopId,
            shopStatus: 'active',
            deletedAt: null,
        });

        if (!shop) {
            return res.status(403).json({
                status: false,
                error: 'Invalid token 1',
            });
        }

        req.shopId = shopId;
        req.requestId = shopId;

        next();
    } catch (err) {
        return res.status(403).json({
            status: false,
            error: 'Invalid token 1',
        });
    }
};
