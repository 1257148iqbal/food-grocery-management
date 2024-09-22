const { verify } = require('jsonwebtoken');
const ShopModel = require('../models/ShopModel');
const { errorHandler } = require('../helpers/apiResponse');
const SellerModel = require('../models/SellerModel');
module.exports.checkShopOrSellerToken = async (req, res, next) => {
    try {
        var token = req.get('authorization');

        if (!token) {
            return res.status(401).json({
                status: false,
                message: 'Access denied! unauthorized Shop',
            });
        }

        token = token.slice(7);

        const { shopId, sellerId } = verify(token, process.env.JWT_PRIVATE_KEY_SHOP);

        if (!shopId && !sellerId) {
            return res.status(403).json({
                status: false,
                message: 'Invalid token 0',
            });
        }

        const commonConfig = {
            shopStatus: 'active',
            deletedAt: null,
        }

        if (shopId){
            const shop = await ShopModel.findOne({
                ...commonConfig,
                _id: shopId,
            });
    
            if (!shop) {
                return res.status(403).json({
                    status: false,
                    error: 'Invalid token 1',
                });
            }
        }

        if (sellerId){
            const seller = await SellerModel.findOne({
                ...commonConfig,
                _id: sellerId,
            });
    
            if (!seller) {
                return res.status(403).json({
                    status: false,
                    error: 'Invalid token 2',
                });
            }
        }
        

        req.shopId = shopId;
        req.requestId = shopId;

        next();
    } catch (err) {
        return res.status(403).json({
            status: false,
            error: 'Invalid token 3',
        });
    }
};
