const UserModel = require('../models/UserModel');
//helper file to prepare responses.
const apiResponse = require('../helpers/apiResponse');
const jwt = require('jsonwebtoken');

/**
 * User login.
 *
 *
 * @returns {Object}
 * @param req
 * @param res
 */
exports.login = (req, res) => {
    const { email, password } = req.body;
    try {
        UserModel.findOne({ email: email }).then(user => {
            return user.comparePassword(password, (error, result) => {
                if (result) {
                    if (user.status === 'deleted') {
                        return apiResponse.unauthorizedResponse(
                            res,
                            'Your account is not deactivated. Please contact admin and ask to activate your account.'
                        );
                    } else {
                        let userData = {
                            id: user._id,
                            status: user.status,
                        };
                        //Prepare JWT token for authentication
                        const jwtPayload = {
                            authorized: true,
                            email: user.email,
                            name: '',
                            status: user.status,
                            userid: user._id,
                        };
                        const jwtData = {
                            expiresIn: process.env.JWT_TIMEOUT_DURATION,
                        };
                        const secret = process.env.JWT_SECRET;
                        //Generated JWT token with Payload and secret.
                        userData.token = jwt.sign(jwtPayload, secret, jwtData);
                        return apiResponse.successResponseWithData(
                            res,
                            'Login Success.',
                            userData
                        );
                    }
                }
                return apiResponse.unauthorizedResponse(
                    res,
                    'The password you entered is incorrect.'
                );
            });
        });
    } catch (err) {
        return apiResponse.ErrorResponse(res, err.message);
    }
};

/**
 * User register.
 *
 *
 * @returns {Object}
 * @param req
 * @param res
 */
exports.register = (req, res) => {
    const { email, password, gender, dob, name, phone_number } = req.body;
    try {
        let saveData = {
            email,
            password,
            gender,
            dob,
            name,
            phone_number,
            created_date: new Date(),
        };
        const user = new UserModel(saveData);

        // check if mobile number exists
        UserModel.findOne({ email: email }).then(checkedUser => {
            if (checkedUser) {
                return apiResponse.ErrorResponse(
                    res,
                    'Email address been already registered. please try another email address.'
                );
            } else {
                // Save user.
                user.save(err => {
                    if (err) {
                        return apiResponse.ErrorResponse(res, err);
                    }
                    let userData = {
                        id: user._id,
                        status: user.status,
                    };
                    const jwtPayload = {
                        authorized: true,
                        email: user.email,
                        name: '',
                        status: user.status,
                        userid: user._id,
                    };
                    const jwtData = {
                        expiresIn: process.env.JWT_TIMEOUT_DURATION,
                    };
                    const secret = process.env.JWT_SECRET;
                    //Generated JWT token with Payload and secret.
                    userData.token = jwt.sign(jwtPayload, secret, jwtData);
                    return apiResponse.successResponseWithData(
                        res,
                        'Registration Success.',
                        userData
                    );
                });
            }
        });
    } catch (err) {
        return apiResponse.ErrorResponse(res, err);
    }
};
