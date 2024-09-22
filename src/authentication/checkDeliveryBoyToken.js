const { verify } = require('jsonwebtoken');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const { errorHandler } = require('../helpers/apiResponse');
module.exports.checkDeliveryBoyToken = async (req, res, next) => {
    try {
        var token = req.get('authorization');

        if (!token) {
            return res.status(401).json({
                status: false,
                message: 'Access denied! unauthorized Delivery Boy',
            });
        }

        token = token.slice(7);

        const { deliveryBoyId } = verify(
            token,
            process.env.JWT_PRIVATE_KEY_DELIVERY_BOY
        );

        if (!deliveryBoyId) {
            return res.status(403).json({
                status: false,
                message: 'Invalid token 0',
            });
        }

        const deliveryBoy = await DeliveryBoyModel.findOne({
            _id: deliveryBoyId,
            // status: 'active',
            deletedAt: null,
        });

        if (!deliveryBoy) {
            return res.status(403).json({
                status: false,
                error: 'Invalid token 1',
            });
        }

        req.deliveryBoyId = deliveryBoyId;
        req.requestId = deliveryBoyId;

        next();
    } catch (err) {
        return res.status(403).json({
            status: false,
            error: 'Invalid token 1',
        });
    }
};
