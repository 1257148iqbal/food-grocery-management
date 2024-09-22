const { verify } = require('jsonwebtoken');
const Users = require('../models/UserModel');
const { errorHandler } = require('../helpers/apiResponse');
module.exports.checkUserToken = async (req, res, next) => {
    try {
        var token = req.get('authorization');

        if (!token) {
            return res.status(401).json({
                status: false,
                message: 'Access denied! unauthorized User',
            });
        }

        token = token.slice(7);

        const { userId } = verify(token, process.env.JWT_PRIVATE_KEY_USER);

        if (!userId) {
            return res.status(403).json({
                status: false,
                message: 'Invalid token 0',
            });
        }

        const user = await Users.findOne({
            _id: userId,
            // status: 'active',
            deletedAt: null,
        });

        if (!user) {
            return res.status(403).json({
                status: false,
                error: 'Invalid token 1',
            });
        }

        req.userId = userId;
        req.requestId = userId;

        if (user.isSubscribed) {
            req.plusUser = true;
        } else {
            req.plusUser = false;
        }

        next();
    } catch (err) {
        console.log(err);
        return res.status(403).json({
            status: false,
            error: err,
        });
    }
};

module.exports.checkUserTokenForUser = async (req, res, next) => {
    try {
        var token = req.get('authorization');

        if (token) {
            token = token.slice(7);

            const { userId } = verify(token, process.env.JWT_PRIVATE_KEY_USER);

            if (!userId) {
                return res.status(403).json({
                    status: false,
                    message: 'Invalid token 0',
                });
            }

            const user = await Users.findOne({
                _id: userId,
                // status: 'active',
                deletedAt: null,
            });
            // console.log(user);
            if (!user) {
                return res.status(403).json({
                    status: false,
                    error: 'Invalid token 1',
                });
            }

            req.userId = userId;
            req.requestId = userId;

            if (user.isSubscribed) {
                req.plusUser = true;
            } else {
                req.plusUser = false;
            }
        } else {
            req.plusUser = false;
        }

        next();
    } catch (err) {
        console.log(err);
        return res.status(403).json({
            status: false,
            error: err,
        });
    }
};

module.exports.checkPlusUser = async (req, res, next) => {
    try {
        var token = req.get('authorization');

        if (token) {
            token = token.slice(7);

            const { userId } = verify(token, process.env.JWT_PRIVATE_KEY_USER);

            if (!userId) {
                return res.status(403).json({
                    status: false,
                    message: 'Invalid token 0',
                });
            }

            const userCount = await Users.countDocuments({
                _id: userId,
                isSubscribed: true,
                deletedAt: null,
            });

            if (userCount) {
                req.userId = userId;
                req.requestId = userId;
                req.plusUser = true;
            } else {
                req.userId = userId;
                req.requestId = userId;
                req.plusUser = false;
            }
        } else {
            req.plusUser = false;
        }

        next();
    } catch (err) {
        console.log(err);
        return res.status(403).json({
            status: false,
            error: err,
        });
    }
};
