const { verify } = require('jsonwebtoken');
const { errorHandler } = require('../helpers/apiResponse');
module.exports.checkAdminToken = async (req, res, next) => {
    try {
        var token = req.get('authorization');

        if (!token) {
            return res.status(401).json({
                status: false,
                message: 'Access denied! unauthorized Admin',
            });
        }

        token = token.slice(7);

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

        next();
    } catch (err) {
        return res.status(403).json({
            status: false,
            message: 'Invalid token',
        });
    }
};
