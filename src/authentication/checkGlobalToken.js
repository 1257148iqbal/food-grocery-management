const { verify } = require('jsonwebtoken');
const Seller = require('../models/SellerModel');
const ShopModel = require('../models/ShopModel');



module.exports.checkGlobalToken = async (req, res, next) => {
    try {
        var token = req.get('authorization');
        const {userType} = req.query
        // console.log(userType)

        if (!token) {
            return res.status(401).json({
                status: false,
                message: 'Access denied! unauthorized Admin',
            });
        }

        token = token.slice(7);

        if(userType === 'seller'){

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
        }else if (userType === 'admin'){
            const { id } = verify(token, process.env.JWT_PRIVATE_KEY_ADMIN);

            if (!id) {
                return res.status(403).json({
                    status: false,
                    message: 'Invalid token',
                });
            }

            const admin = await require('../models/AdminModel').findOne({
                _id: id,
                status: 'active',
                deletedAt: null,
            });

            if (!admin) {
                return res.status(403).json({
                    status: false,
                    error: 'Invalid token',
                });
            }

            req.adminId = id;
            req.requestId = id;
        }else if (userType === 'shop'){
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
        }

        next();
    } catch (err) {
        return res.status(500).json({
            status: false,
            error: err.message,
        });
    }
};