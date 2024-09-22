const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;
const apiResponse = require('../helpers/apiResponse');

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];
        return jwt.verify(token, secret, (err, user) => {
            if (err) {
                return apiResponse.unauthorizedResponse(res, err.message);
            }
            req.user = user;
            next();
        });
    } else {
        return apiResponse.unauthorizedResponse(res, 'You are not authorized.');
    }
};

module.exports = authenticate;
