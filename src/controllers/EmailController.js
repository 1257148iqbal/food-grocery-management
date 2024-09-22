const axios = require('axios').default;
const AdminModel = require('../models/AdminModel');
const UserModel = require('../models/UserModel');
const ShopModel = require('../models/ShopModel');
const SellerModel = require('../models/SellerModel');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const OrderModel = require('../models/OrderModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { verify } = require('jsonwebtoken');
const moment = require('moment');
const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');

exports.sendEmailMainForgetPassword = async (req, res) => {
    try {
        const { to_email, type } = req.body;

        if (!to_email || !type) return errorResponse(res, 'Bad request');

        if (
            ![
                'admin',
                'customerService',
                'sales',
                'accountManager',
                'accounting',
                'marketing',
                'seller',
                'shop',
                'deliveryBoy',
                'user',
            ].includes(type)
        ) {
            return errorResponse(res, 'Invalid type');
        }

        let info;

        if (
            [
                'admin',
                'customerService',
                'sales',
                'accountManager',
                'accounting',
                'marketing',
            ].includes(type)
        ) {
            info = await AdminModel.findOne({
                email: to_email,
                adminType: type,
                deletedAt: null,
            });

            if (!info) {
                return errorResponse(res, 'Admin not found');
            }
        }
        if (type === 'seller') {
            info = await SellerModel.findOne({
                email: to_email,
                deletedAt: null,
            });

            if (!info) {
                return errorResponse(res, 'Seller not found');
            }
        }
        if (type === 'shop') {
            info = await ShopModel.findOne({
                email: to_email,
                deletedAt: null,
            });

            if (!info) {
                return errorResponse(res, 'Shop not found');
            }
        }
        if (type === 'deliveryBoy') {
            info = await DeliveryBoyModel.findOne({
                email: to_email,
                deletedAt: null,
            });

            if (!info) {
                return errorResponse(res, 'Delivery Boy not found');
            }
        }
        if (type === 'user') {
            info = await UserModel.findOne({
                email: to_email,
                deletedAt: null,
            });

            if (!info) {
                return errorResponse(res, 'User not found');
            }

            if (info.registerType !== 'mail') {
                return errorResponse(
                    res,
                    `The user can’t submit this request since ${
                        info.gender === 'female' ? 'she' : 'he'
                    } signed up using ${info.registerType}`
                );
            }

            if (info.status === 'blocked') {
                return errorResponse(
                    res,
                    'Your account is blocked. Please contact Support'
                );
            }
        }

        let token = Math.floor(Math.random() * 90000) + 10000;

        // console.log(token)
        info.forgetExpired = moment()
            .add(5, 'minutes')
            .format('YYYY-MM-DD HH:mm:ss');
        info.forgetToken = token;

        await info.save();

        let message = `${process.env.RESET_PASS_URL}/forget?email=${to_email}&type=${type}&token=${token}`;
        // console.log('https://resetpass.drop-deliveryapp.com/forget?email=${to_email}&type=${type}&token=${token}')
        var data = {
            service_id: process.env.EMAIL_JS_SERVICE_ID,
            template_id: process.env.EMAIL_JS_TEMPLATE_ID,
            user_id: process.env.EMAIL_JS_USER_ID,
            accessToken: process.env.EMAIL_JS_ACCESS_TOKEN,
            template_params: {
                reply_to: 'Panel',
                to_name: info.name,
                to_email: to_email,
                message: message,
            },
        };

        const response = await axios.post(
            'https://api.emailjs.com/api/v1.0/email/send',
            data
        );

        console.log(response.data);

        return res.json({
            status: true,
            message: 'Email Sent',
            data: {
                email: response.data,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.checkForgetPasswordLinkValidity = async (req, res) => {
    try {
        let { token, type, email } = req.body;

        if (!token || !type || !email) {
            return res.status(401).json({
                status: false,
                message: 'Bad request',
            });
        }

        if (
            ![
                'admin',
                'customerService',
                'sales',
                'accountManager',
                'accounting',
                'marketing',
                'seller',
                'shop',
                'deliveryBoy',
                'user',
            ].includes(type)
        )
            return errorResponse(res, 'Invalid type');

        let isValid = false;

        if (
            [
                'admin',
                'customerService',
                'sales',
                'accountManager',
                'accounting',
                'marketing',
            ].includes(type)
        ) {
            const info = await AdminModel.findOne({
                email: email,
                adminType: type,
                forgetExpired: {
                    $gt: new Date(),
                },
                forgetToken: token,
            });

            if (info) {
                isValid = true;
            }
        } else if (type == 'seller') {
            const info = await SellerModel.findOne({
                email: email,
                forgetExpired: {
                    $gt: new Date(),
                },
                forgetToken: token,
            });

            if (info) {
                isValid = true;
            }
        } else if (type == 'shop') {
            const info = await ShopModel.findOne({
                email: email,
                forgetExpired: {
                    $gt: new Date(),
                },
                forgetToken: token,
            });

            if (info) {
                isValid = true;
            }
        } else if (type == 'deliveryBoy') {
            const info = await DeliveryBoyModel.findOne({
                email: email,
                forgetExpired: {
                    $gt: new Date(),
                },
                forgetToken: token,
            });

            if (info) {
                isValid = true;
            }
        } else if (type == 'user') {
            const info = await UserModel.findOne({
                email: email,
                forgetExpired: {
                    $gt: new Date(),
                },
                forgetToken: token,
            });

            if (info) {
                isValid = true;
            }
        }

        successResponse(res, {
            message: 'successfully found',
            data: {
                isValid,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.passwordChangeForEveryOne = async (req, res) => {
    try {
        let { password, token, type, email } = req.body;

        if (!token) {
            return res.status(401).json({
                status: false,
                message: 'Bad request',
            });
        }

        if (
            ![
                'admin',
                'customerService',
                'sales',
                'accountManager',
                'accounting',
                'marketing',
                'seller',
                'shop',
                'deliveryBoy',
                'user',
            ].includes(type)
        )
            return errorResponse(res, 'Invalid type');

        const pass = await bcrypt.hash(password, 10);

        if (
            [
                'admin',
                'customerService',
                'sales',
                'accountManager',
                'accounting',
                'marketing',
            ].includes(type)
        ) {
            const info = await AdminModel.findOne({
                email: email,
                adminType: type,
                forgetExpired: {
                    $gt: new Date(),
                },
                forgetToken: token,
            });

            if (!info) {
                return errorResponse(res, 'Please try again to forget');
            }

            await AdminModel.updateOne(
                { _id: info._id },
                {
                    forgetToken: null,
                    forgetExpired: null,
                    password: pass,
                }
            );
        } else if (type == 'seller') {
            const info = await SellerModel.findOne({
                email: email,
                forgetExpired: {
                    $gt: new Date(),
                },
                forgetToken: token,
            });

            if (!info) {
                return errorResponse(res, 'Please try again to forget');
            }

            await SellerModel.updateOne(
                { _id: info._id },
                {
                    forgetToken: null,
                    forgetExpired: null,
                    password: pass,
                }
            );
        } else if (type == 'shop') {
            const info = await ShopModel.findOne({
                email: email,
                forgetExpired: {
                    $gt: new Date(),
                },
                forgetToken: token,
            });

            if (!info) {
                return errorResponse(res, 'Please try again to forget');
            }

            await ShopModel.updateOne(
                { _id: info._id },
                {
                    forgetToken: null,
                    forgetExpired: null,
                    password: pass,
                }
            );
        } else if (type == 'deliveryBoy') {
            const info = await DeliveryBoyModel.findOne({
                email: email,
                forgetExpired: {
                    $gt: new Date(),
                },
                forgetToken: token,
            });

            if (!info) {
                return errorResponse(res, 'Please try again to forget');
            }

            await DeliveryBoyModel.updateOne(
                { _id: info._id },
                {
                    forgetToken: null,
                    forgetExpired: null,
                    password: pass,
                }
            );
        } else if (type == 'user') {
            const info = await UserModel.findOne({
                email: email,
                forgetExpired: {
                    $gt: new Date(),
                },
                forgetToken: token,
            });

            if (!info) {
                return errorResponse(res, 'Please try again to forget');
            }

            await UserModel.updateOne(
                { _id: info._id },
                {
                    forgetToken: null,
                    forgetExpired: null,
                    password: pass,
                }
            );
        }

        successResponse(res, {
            message: 'Password changed successfully',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sendEmailForUserForgetPassword = async (req, res) => {
    try {
        let { to_email } = req.body;

        to_email = to_email.toLowerCase();

        let user = await UserModel.findOne({ email: to_email });

        if (!user) {
            return errorResponse(res, 'User not found');
        }

        const jwtData = {
            userEmail: to_email,
        };

        const token = jwt.sign(
            jwtData,
            process.env.JWT_PRIVATE_KEY_USER_FORGET,
            {}
        );

        user.forgetExpired = moment()
            .add(5, 'minutes')
            .format('YYYY-MM-DD HH:mm:ss');
        user.forgetToken = token;

        await user.save();

        let message = `www.drop.com/${token}`;

        var data = {
            service_id: process.env.EMAIL_JS_SERVICE_ID,
            template_id: process.env.EMAIL_JS_TEMPLATE_ID,
            user_id: process.env.EMAIL_JS_USER_ID,
            accessToken: process.env.EMAIL_JS_ACCESS_TOKEN,
            template_params: {
                reply_to: 'Customer',
                to_name: user.name,
                to_email: to_email,
                message: message,
            },
        };

        const response = await axios.post(
            'https://api.emailjs.com/api/v1.0/email/send',
            data
        );

        // console.log(response.data);

        return res.json({
            status: true,
            message: 'Email Sent',
            data: {
                email: response.data,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sendEmailForStoreForgetPassword = async (req, res) => {
    try {
        let { to_email } = req.body;

        to_email = to_email.toLowerCase();

        let store = await ShopModel.findOne({ email: to_email });

        if (!store) {
            return errorResponse(res, 'Shop not found');
        }

        const jwtData = {
            storeEmail: to_email,
        };

        const token = jwt.sign(
            jwtData,
            process.env.JWT_PRIVATE_KEY_STORE_FORGET,
            {}
        );

        store.forgetExpired = moment()
            .add(5, 'minutes')
            .format('YYYY-MM-DD HH:mm:ss');
        store.forgetToken = token;

        await store.save();

        let message = `www.drop.com/${token}`;

        var data = {
            service_id: process.env.EMAIL_JS_SERVICE_ID,
            template_id: process.env.EMAIL_JS_TEMPLATE_ID,
            user_id: process.env.EMAIL_JS_USER_ID,
            accessToken: process.env.EMAIL_JS_ACCESS_TOKEN,
            template_params: {
                reply_to: 'Store',
                to_name: store.shopName,
                to_email: to_email,
                message: message,
            },
        };

        const response = await axios.post(
            'https://api.emailjs.com/api/v1.0/email/send',
            data
        );

        // console.log(response.data);

        return res.json({
            status: true,
            message: 'Email Sent',
            data: {
                email: response.data,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sendEmailForDeliveryBoyForgetPassword = async (req, res) => {
    try {
        let { to_email } = req.body;

        to_email = to_email.toLowerCase();

        let deliveryBoy = await DeliveryBoyModel.findOne({ email: to_email });

        if (!deliveryBoy) {
            return errorResponse(res, 'Delivery Boy not found');
        }

        const jwtData = {
            deliveryBoyEmail: to_email,
        };

        const token = jwt.sign(
            jwtData,
            process.env.JWT_PRIVATE_KEY_DELIVERY_BOY_FORGET,
            {}
        );

        deliveryBoy.forgetExpired = moment()
            .add(5, 'minutes')
            .format('YYYY-MM-DD HH:mm:ss');
        deliveryBoy.forgetToken = token;

        await deliveryBoy.save();

        let message = `www.drop.com/${token}`;

        var data = {
            service_id: process.env.EMAIL_JS_SERVICE_ID,
            template_id: process.env.EMAIL_JS_TEMPLATE_ID,
            user_id: process.env.EMAIL_JS_USER_ID,
            accessToken: process.env.EMAIL_JS_ACCESS_TOKEN,
            template_params: {
                reply_to: 'Delivery-Boy',
                to_name: deliveryBoy.name,
                to_email: to_email,
                message: message,
            },
        };

        const response = await axios.post(
            'https://api.emailjs.com/api/v1.0/email/send',
            data
        );

        return res.json({
            status: true,
            message: 'Email Sent',
            data: {
                email: response.data,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sendPlaceOrderEmail = async id => {
    try {
        const order = await OrderModel.findById(id).populate([
            {
                path: 'shop',
            },
            {
                path: 'user',
            },
            {
                path: 'orderCancel',
                populate: 'cancelReason',
            },
        ]);
        const date = Date.parse(order.createdAt);
        const estimatedDate = moment(new Date(date)).format('MMMM Do YYYY');
        let status = '';
        let html = '';

        if (order.orderStatus === 'placed') {
            status = 'Successfully Placed';

            // Place order HTML

            html = `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" style="width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
        <head>
          <meta charset="UTF-8">
          <meta content="width=device-width, initial-scale=1" name="viewport">
          <meta name="x-apple-disable-message-reformatting">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta content="telephone=no" name="format-detection">
          <title>New message</title><!--[if (mso 16)]>
            <style type="text/css">
            a {text-decoration: none;}
            </style>
            <![endif]--><!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--><!--[if gte mso 9]>
        <xml>
            <o:OfficeDocumentSettings>
            <o:AllowPNG></o:AllowPNG>
            <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
        <![endif]--><!--[if !mso]><!-- -->
          <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,400i,700,700i" rel="stylesheet"><!--<![endif]-->
          <style type="text/css">
        #outlook a {
          padding:0;
        }
        .ExternalClass {
          width:100%;
        }
        .ExternalClass,
        .ExternalClass p,
        .ExternalClass span,
        .ExternalClass font,
        .ExternalClass td,
        .ExternalClass div {
          line-height:100%;
        }
        .es-button {
          mso-style-priority:100!important;
          text-decoration:none!important;
        }
        a[x-apple-data-detectors] {
          color:inherit!important;
          text-decoration:none!important;
          font-size:inherit!important;
          font-family:inherit!important;
          font-weight:inherit!important;
          line-height:inherit!important;
        }
        .es-desk-hidden {
          display:none;
          float:left;
          overflow:hidden;
          width:0;
          max-height:0;
          line-height:0;
          mso-hide:all;
        }
        [data-ogsb] .es-button {
          border-width:0!important;
          padding:15px 30px 15px 30px!important;
        }
        @media only screen and (max-width:600px) {p, ul li, ol li, a { line-height:150%!important } h1, h2, h3, h1 a, h2 a, h3 a { line-height:120%!important } h1 { font-size:32px!important; text-align:center } h2 { font-size:26px!important; text-align:center } h3 { font-size:20px!important; text-align:center } .es-header-body h1 a, .es-content-body h1 a, .es-footer-body h1 a { font-size:32px!important } .es-header-body h2 a, .es-content-body h2 a, .es-footer-body h2 a { font-size:26px!important } .es-header-body h3 a, .es-content-body h3 a, .es-footer-body h3 a { font-size:20px!important } .es-menu td a { font-size:16px!important } .es-header-body p, .es-header-body ul li, .es-header-body ol li, .es-header-body a { font-size:16px!important } .es-content-body p, .es-content-body ul li, .es-content-body ol li, .es-content-body a { font-size:16px!important } .es-footer-body p, .es-footer-body ul li, .es-footer-body ol li, .es-footer-body a { font-size:16px!important } .es-infoblock p, .es-infoblock ul li, .es-infoblock ol li, .es-infoblock a { font-size:12px!important } *[class="gmail-fix"] { display:none!important } .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3 { text-align:center!important } .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3 { text-align:right!important } .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3 { text-align:left!important } .es-m-txt-r img, .es-m-txt-c img, .es-m-txt-l img { display:inline!important } .es-button-border { display:inline-block!important } a.es-button, button.es-button { font-size:16px!important; display:inline-block!important; border-width:15px 30px 15px 30px!important } .es-btn-fw { border-width:10px 0px!important; text-align:center!important } .es-adaptive table, .es-btn-fw, .es-btn-fw-brdr, .es-left, .es-right { width:100%!important } .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } .es-adapt-td { display:block!important; width:100%!important } .adapt-img { width:70%!important; height:auto!important } .es-m-p0 { padding:0px!important } .es-m-p0r { padding-right:0px!important } .es-m-p0l { padding-left:0px!important } .es-m-p0t { padding-top:0px!important } .es-m-p0b { padding-bottom:0!important } .es-m-p20b { padding-bottom:20px!important } .es-mobile-hidden, .es-hidden { display:none!important } tr.es-desk-hidden, td.es-desk-hidden, table.es-desk-hidden { width:auto!important; overflow:visible!important; float:none!important; max-height:inherit!important; line-height:inherit!important } tr.es-desk-hidden { display:table-row!important } table.es-desk-hidden { display:table!important } td.es-desk-menu-hidden { display:table-cell!important } .es-menu td { width:1%!important } table.es-table-not-adapt, .esd-block-html table { width:auto!important } table.es-social { display:inline-block!important } table.es-social td { display:inline-block!important } .es-desk-hidden { display:table-row!important; width:auto!important; overflow:visible!important; max-height:inherit!important } .h-auto { height:auto!important } }
        </style>
        </head>
        <body style="width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;padding:0;Margin:0">
          <div class="es-wrapper-color" style="background-color:#EEEEEE"><!--[if gte mso 9]>
              <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
                <v:fill type="tile" color="#eeeeee"></v:fill>
              </v:background>
            <![endif]-->
          <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#EEEEEE">
            <tr style="border-collapse:collapse">
              <td valign="top" style="padding:0;Margin:0">
              <table cellpadding="0" cellspacing="0" class="es-content" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                <tr style="border-collapse:collapse">
                  <td align="center" style="padding:0;Margin:0">
                  <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" cellspacing="0" cellpadding="0" align="center">
                        </tr>
                      </table><!--[if mso]></td><td style="width:20px"></td><td style="width:278px" valign="top"><![endif]-->
                      <table class="es-right" cellspacing="0" cellpadding="0" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                        <tr style="border-collapse:collapse">
                          <td align="left" style="padding:0;Margin:0;width:278px">
                          <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                          </table></td>
                        </tr>
                      </table><!--[if mso]></td></tr></table><![endif]--></td>
                    </tr>
                  </table></td>
                </tr>
              </table>
              <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                <tr style="border-collapse:collapse"></tr>
                <tr style="border-collapse:collapse">
                  <td align="center" style="padding:0;Margin:0">
                  <table class="es-header-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#044767;width:600px" cellspacing="0" cellpadding="0" bgcolor="#044767" align="center">
                    <tr style="border-collapse:collapse">
                      <td align="left" bgcolor="#181616" style="Margin:0;padding-top:20px;padding-bottom:20px;padding-left:35px;padding-right:35px;background-color:#181616">
                      <table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                        <tr style="border-collapse:collapse">
                          <td align="center" valign="top" style="padding:0;Margin:0;width:530px">
                          <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                            <tr style="border-collapse:collapse">
                              <td align="center" style="padding:0;Margin:0;font-size:0px"><img class="adapt-img" src="https://storage.googleapis.com/lyxa-bucket/lyxa-logo2-2x-drop-06112211334-19.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="170"></td>
                            </tr>
                          </table></td>
                        </tr>
                      </table></td>
                    </tr>
                  </table></td>
                </tr>
              </table>
              <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                <tr style="border-collapse:collapse">
                  <td align="center" style="padding:0;Margin:0">
                  <table class="es-content-body" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
                    <tr style="border-collapse:collapse">
                      <td align="left" style="padding:0;Margin:0;padding-left:35px;padding-right:35px;padding-top:40px">
                      <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                        <tr style="border-collapse:collapse">
                          <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                          <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                            <tr style="border-collapse:collapse">
                              <td align="center" style="Margin:0;padding-top:25px;padding-bottom:25px;padding-left:35px;padding-right:35px;font-size:0px"><a target="_blank" href="https://viewstripo.email/" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:none;color:#ED8E20;font-size:16px"><img src="https://storage.googleapis.com/lyxa-bucket/true-drop-051122195143-61.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="120"></a></td>
                            </tr>
                            <tr style="border-collapse:collapse">
                              <td align="center" style="padding:0;Margin:0;padding-bottom:10px"><h2 style="Margin:0;line-height:36px;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:30px;font-style:normal;font-weight:bold;color:#333333">Thank You For Your Order!</h2></td>
                            </tr>
                            <tr style="border-collapse:collapse">
                              <td align="left" style="padding:0;Margin:0;padding-top:15px;padding-bottom:20px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#777777;font-size:16px">Your order from ${
                                  order.shop.shopName
                              }&nbsp;with order nr&nbsp;${
                order.orderId
            }&nbsp;has been placed.&nbsp;<br></p></td>
                            </tr>
                          </table></td>
                        </tr>
                      </table></td>
                    </tr>
                  </table></td>
                </tr>
              </table>
              <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                <tr style="border-collapse:collapse">
                  <td align="center" style="padding:0;Margin:0">
                  <table class="es-content-body" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
                    <tr style="border-collapse:collapse">
                      <td align="left" style="padding:0;Margin:0;padding-top:20px;padding-left:35px;padding-right:35px">
                      <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                        <tr style="border-collapse:collapse">
                          <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                          <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                            <tr style="border-collapse:collapse">
                              <td bgcolor="#eeeeee" align="left" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:10px;padding-right:10px">
                              <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:500px" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" align="left" role="presentation">
                                <tr style="border-collapse:collapse">
                                  <td width="80%" style="padding:0;Margin:0"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Order Confirmation #</h4></td>
                                  <td width="20%" style="padding:0;Margin:0"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">${
                                      order.orderId
                                  }</h4></td>
                                </tr>
                              </table></td>
                            </tr>
                          </table></td>
                        </tr>
                      </table></td>
                    </tr>
                    <tr style="border-collapse:collapse">
                      <td align="left" style="padding:0;Margin:0;padding-left:35px;padding-right:35px">
                      <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                        <tr style="border-collapse:collapse">
                          <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                          <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                            <tr style="border-collapse:collapse">
                              <td align="left" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:10px;padding-right:10px">
                              <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:500px" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" align="left" role="presentation">
                                ${order.productsDetails.map(item => {
                                    return `
                                      <tr style="border-collapse:collapse">
                                  <td style="padding:5px 10px 5px 0;Margin:0" width="80%" align="left"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                                      item.product.name
                                  }  x${item.productQuantity}<br>
                                      ${
                                          item.product.attributes?.items
                                              ?.length > 0
                                              ? item.product.attributes?.items?.map(
                                                    att => {
                                                        return `
                                          ${att.name}<br>
                                        `;
                                                    }
                                                )
                                              : ''
                                      }
                                      ${
                                          item.addons?.length > 0
                                              ? item.addons?.map(addon => {
                                                    return `
                                          ${addon.name}<br>
                                        `;
                                                })
                                              : ''
                                      }
                                  </td>
                                  <td style="padding:5px 0;Margin:0" width="20%" align="left"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                                      item.product.price
                                  }<br>
                                      ${
                                          item.product.attributes?.items
                                              ?.length > 0
                                              ? item.product.attributes?.items?.map(
                                                    att => {
                                                        return `
                                          ${att.extraPrice}<br>
                                        `;
                                                    }
                                                )
                                              : ''
                                      }
                                      ${
                                          item.addons?.length > 0
                                              ? item.addons?.map(addon => {
                                                    return `
                                          ${addon.price}<br>
                                        `;
                                                })
                                              : ''
                                      }
                                      </td>
                                      `;
                                })}
                              </table></td>
                            </tr>
                          </table></td>
                        </tr>
                      </table></td>
                    </tr>
                    <tr style="border-collapse:collapse">
                      <td align="left" style="padding:0;Margin:0;padding-top:10px;padding-left:35px;padding-right:35px">
                      <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                        <tr style="border-collapse:collapse">
                          <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                          <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;border-top:3px solid #eeeeee;border-bottom:3px solid #eeeeee" width="100%" cellspacing="0" cellpadding="0" role="presentation">
                            <tr style="border-collapse:collapse">
                              <td align="left" style="Margin:0;padding-left:10px;padding-right:10px;padding-top:15px;padding-bottom:15px">
                              <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:500px" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" align="left" role="presentation">
                                <tr style="border-collapse:collapse">
                                  <td width="80%" align="left" style="padding:0;Margin:0"><h5 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Payment<br><br>Sub total<br>Discount<br>Delivery Fee</h5><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px"><br></p><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">TOTAL</h4></td>
                                  <td width="20%" align="left" style="padding:0;Margin:0"><h5 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">${
                                      order.paymentMethod
                                  }<br><br>${
                order.summary.baseCurrency_productAmount
            }<br>0 -<br>${
                order.summary.baseCurrency_riderFee == 0
                    ? 'Free'
                    : order.summary.baseCurrency_riderFee
            }</h5><h3 style="Margin:0;line-height:22px;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:18px;font-style:normal;font-weight:normal;color:#333333"><br></h3><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">${
                order.summary.baseCurrency_totalAmount
            }</h4></td>
                                </tr>
                              </table></td>
                            </tr>
                          </table></td>
                        </tr>
                      </table></td>
                    </tr>
                    <tr style="border-collapse:collapse">
                      <td align="left" style="Margin:0;padding-left:35px;padding-right:35px;padding-top:40px;padding-bottom:40px"><!--[if mso]><table style="width:530px" cellpadding="0" cellspacing="0"><tr><td style="width:255px" valign="top"><![endif]-->
                      <table class="es-left" cellspacing="0" cellpadding="0" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                        <tr style="border-collapse:collapse">
                          <td class="es-m-p20b" align="left" style="padding:0;Margin:0;width:255px">
                          <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                            <tr style="border-collapse:collapse">
                              <td align="left" style="padding:0;Margin:0;padding-bottom:15px"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Delivery Address</h4></td>
                            </tr>
                            <tr style="border-collapse:collapse">
                              <td align="left" style="padding:0;Margin:0;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                                  order.shop.address.address
                              }</p><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                order.shop.address.city
            }</p><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                order.shop.address.country
            }</p></td>
                            </tr>
                          </table></td>
                        </tr>
                      </table><!--[if mso]></td><td style="width:20px"></td><td style="width:255px" valign="top"><![endif]-->
                      <table class="es-right" cellspacing="0" cellpadding="0" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                        <tr style="border-collapse:collapse">
                          <td align="left" style="padding:0;Margin:0;width:255px">
                          <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                            <tr style="border-collapse:collapse">
                              <td align="left" style="padding:0;Margin:0;padding-bottom:15px"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Estimated Delivery Date</h4></td>
                            </tr>
                            <tr style="border-collapse:collapse">
                              <td align="left" style="padding:0;Margin:0"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${estimatedDate}</p></td>
                            </tr>
                          </table></td>
                        </tr>
                      </table><!--[if mso]></td></tr></table><![endif]--></td>
                    </tr>
                  </table></td>
                </tr>
              </table>
              <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                <tr style="border-collapse:collapse">
                  <td align="center" style="padding:0;Margin:0">
                  <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#1b9ba3;width:600px" cellspacing="0" cellpadding="0" bgcolor="#1b9ba3" align="center">
                    <tr style="border-collapse:collapse">
                      <td align="left" bgcolor="#010101" style="padding:0;Margin:0;padding-top:20px;padding-left:35px;padding-right:35px;background-color:#010101"><!--[if mso]><table style="width:530px" cellpadding="0" cellspacing="0"><tr><td style="width:255px" valign="top"><![endif]-->
                      <table cellpadding="0" cellspacing="0" class="es-left" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                        <tr style="border-collapse:collapse">
                          <td class="es-m-p20b" align="left" style="padding:0;Margin:0;width:255px">
                          <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                            <tr style="border-collapse:collapse">
                              <td align="left" class="h-auto" valign="bottom" height="138" style="padding:0;Margin:0;padding-bottom:25px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:20px;color:#cccccc;font-size:13px">For feedback please reach us at<br>support@dropdelivery.ng<u><br><br><br><br></u>©All Rights Reserved. Lyxa</p></td>
                            </tr>
                          </table></td>
                        </tr>
                      </table><!--[if mso]></td><td style="width:20px"></td><td style="width:255px" valign="top"><![endif]-->
                      <table cellpadding="0" cellspacing="0" class="es-right" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                        <tr style="border-collapse:collapse">
                          <td align="left" style="padding:0;Margin:0;width:255px">
                          <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                            <tr style="border-collapse:collapse">
                              <td align="center" style="padding:0;Margin:0;padding-top:5px;padding-bottom:5px;font-size:0px"><img class="adapt-img" src="https://storage.googleapis.com/lyxa-bucket/lyxa-logo-2x-drop-06112211446-12.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="95"></td>
                            </tr>
                          </table></td>
                        </tr>
                      </table><!--[if mso]></td></tr></table><![endif]--></td>
                    </tr>
                  </table></td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" class="es-footer" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%;background-color:transparent;background-repeat:repeat;background-position:center top">
                <tr style="border-collapse:collapse">
                  <td align="center" style="padding:0;Margin:0">
                  <table class="es-footer-body" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
                    <tr style="border-collapse:collapse">
                      <td align="left" style="Margin:0;padding-top:35px;padding-left:35px;padding-right:35px;padding-bottom:40px">
                      <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                        <tr style="border-collapse:collapse">
                          <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                          <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                            <tr style="border-collapse:collapse">
                              <td align="center" style="padding:0;Margin:0;display:none"></td>
                            </tr>
                          </table></td>
                        </tr>
                      </table></td>
                    </tr>
                  </table></td>
                </tr>
              </table>
              <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                <tr style="border-collapse:collapse">
                  <td align="center" style="padding:0;Margin:0">
                  <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" cellspacing="0" cellpadding="0" align="center">
                      </table></td>
                    </tr>
                  </table></td>
                </tr>
              </table></td>
            </tr>
          </table>
          </div>
        </body>
        </html>
            `;
        } else if (order.orderStatus === 'cancelled') {
            status = 'Canceled';
            // Calcel order html

            // html = `
            // <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            // <html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" style="width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
            //  <head>
            //   <meta charset="UTF-8">
            //   <meta content="width=device-width, initial-scale=1" name="viewport">
            //   <meta name="x-apple-disable-message-reformatting">
            //   <meta http-equiv="X-UA-Compatible" content="IE=edge">
            //   <meta content="telephone=no" name="format-detection">
            //   <title>Copy of New message</title><!--[if (mso 16)]>
            //     <style type="text/css">
            //     a {text-decoration: none;}
            //     </style>
            //     <![endif]--><!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--><!--[if gte mso 9]>
            // <xml>
            //     <o:OfficeDocumentSettings>
            //     <o:AllowPNG></o:AllowPNG>
            //     <o:PixelsPerInch>96</o:PixelsPerInch>
            //     </o:OfficeDocumentSettings>
            // </xml>
            // <![endif]--><!--[if !mso]><!-- -->
            //   <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,400i,700,700i" rel="stylesheet"><!--<![endif]-->
            //   <style type="text/css">
            // #outlook a {
            //   padding:0;
            // }
            // .ExternalClass {
            //   width:100%;
            // }
            // .ExternalClass,
            // .ExternalClass p,
            // .ExternalClass span,
            // .ExternalClass font,
            // .ExternalClass td,
            // .ExternalClass div {
            //   line-height:100%;
            // }
            // .es-button {
            //   mso-style-priority:100!important;
            //   text-decoration:none!important;
            // }
            // a[x-apple-data-detectors] {
            //   color:inherit!important;
            //   text-decoration:none!important;
            //   font-size:inherit!important;
            //   font-family:inherit!important;
            //   font-weight:inherit!important;
            //   line-height:inherit!important;
            // }
            // .es-desk-hidden {
            //   display:none;
            //   float:left;
            //   overflow:hidden;
            //   width:0;
            //   max-height:0;
            //   line-height:0;
            //   mso-hide:all;
            // }
            // [data-ogsb] .es-button {
            //   border-width:0!important;
            //   padding:15px 30px 15px 30px!important;
            // }
            // @media only screen and (max-width:600px) {p, ul li, ol li, a { line-height:150%!important } h1, h2, h3, h1 a, h2 a, h3 a { line-height:120%!important } h1 { font-size:32px!important; text-align:center } h2 { font-size:26px!important; text-align:center } h3 { font-size:20px!important; text-align:center } .es-header-body h1 a, .es-content-body h1 a, .es-footer-body h1 a { font-size:32px!important } .es-header-body h2 a, .es-content-body h2 a, .es-footer-body h2 a { font-size:26px!important } .es-header-body h3 a, .es-content-body h3 a, .es-footer-body h3 a { font-size:20px!important } .es-menu td a { font-size:16px!important } .es-header-body p, .es-header-body ul li, .es-header-body ol li, .es-header-body a { font-size:16px!important } .es-content-body p, .es-content-body ul li, .es-content-body ol li, .es-content-body a { font-size:16px!important } .es-footer-body p, .es-footer-body ul li, .es-footer-body ol li, .es-footer-body a { font-size:16px!important } .es-infoblock p, .es-infoblock ul li, .es-infoblock ol li, .es-infoblock a { font-size:12px!important } *[class="gmail-fix"] { display:none!important } .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3 { text-align:center!important } .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3 { text-align:right!important } .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3 { text-align:left!important } .es-m-txt-r img, .es-m-txt-c img, .es-m-txt-l img { display:inline!important } .es-button-border { display:inline-block!important } a.es-button, button.es-button { font-size:16px!important; display:inline-block!important; border-width:15px 30px 15px 30px!important } .es-btn-fw { border-width:10px 0px!important; text-align:center!important } .es-adaptive table, .es-btn-fw, .es-btn-fw-brdr, .es-left, .es-right { width:100%!important } .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } .es-adapt-td { display:block!important; width:100%!important } .adapt-img { width:100%!important; height:auto!important } .es-m-p0 { padding:0px!important } .es-m-p0r { padding-right:0px!important } .es-m-p0l { padding-left:0px!important } .es-m-p0t { padding-top:0px!important } .es-m-p0b { padding-bottom:0!important } .es-m-p20b { padding-bottom:20px!important } .es-mobile-hidden, .es-hidden { display:none!important } tr.es-desk-hidden, td.es-desk-hidden, table.es-desk-hidden { width:auto!important; overflow:visible!important; float:none!important; max-height:inherit!important; line-height:inherit!important } tr.es-desk-hidden { display:table-row!important } table.es-desk-hidden { display:table!important } td.es-desk-menu-hidden { display:table-cell!important } .es-menu td { width:1%!important } table.es-table-not-adapt, .esd-block-html table { width:auto!important } table.es-social { display:inline-block!important } table.es-social td { display:inline-block!important } .es-desk-hidden { display:table-row!important; width:auto!important; overflow:visible!important; max-height:inherit!important } .h-auto { height:auto!important } }
            // </style>
            //  </head>
            //  <body style="width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;padding:0;Margin:0">
            //   <div class="es-wrapper-color" style="background-color:#EEEEEE"><!--[if gte mso 9]>
            //       <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
            //         <v:fill type="tile" color="#eeeeee"></v:fill>
            //       </v:background>
            //     <![endif]-->
            //    <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#EEEEEE">
            //      <tr style="border-collapse:collapse">
            //       <td valign="top" style="padding:0;Margin:0">
            //        <table cellpadding="0" cellspacing="0" class="es-content" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
            //          <tr style="border-collapse:collapse">
            //           <td align="center" style="padding:0;Margin:0">
            //            <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" cellspacing="0" cellpadding="0" align="center">
            //              <tr style="border-collapse:collapse">
            //               <td align="left" style="Margin:0;padding-left:10px;padding-right:10px;padding-top:15px;padding-bottom:15px"><!--[if mso]><table style="width:580px" cellpadding="0" cellspacing="0"><tr><td style="width:282px" valign="top"><![endif]-->
            //                <table class="es-left" cellspacing="0" cellpadding="0" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
            //                </table><!--[if mso]></td><td style="width:20px"></td><td style="width:278px" valign="top"><![endif]-->
            //                <table class="es-right" cellspacing="0" cellpadding="0" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
            //                  </tr>
            //                </table><!--[if mso]></td></tr></table><![endif]--></td>
            //              </tr>
            //            </table></td>
            //          </tr>
            //        </table>
            //        <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
            //          <tr style="border-collapse:collapse"></tr>
            //          <tr style="border-collapse:collapse">
            //           <td align="center" style="padding:0;Margin:0">
            //            <table class="es-header-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#044767;width:600px" cellspacing="0" cellpadding="0" bgcolor="#044767" align="center">
            //              <tr style="border-collapse:collapse">
            //               <td align="left" bgcolor="#181616" style="Margin:0;padding-top:20px;padding-bottom:20px;padding-left:35px;padding-right:35px;background-color:#181616">
            //                <table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                  <tr style="border-collapse:collapse">
            //                   <td align="center" valign="top" style="padding:0;Margin:0;width:530px">
            //                    <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                      <tr style="border-collapse:collapse">
            //                       <td align="center" style="padding:0;Margin:0;font-size:0px"><img class="adapt-img" src="https://storage.googleapis.com/lyxa-bucket/lyxa-logo2-2x-drop-06112211334-19.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="170"></td>
            //                      </tr>
            //                    </table></td>
            //                  </tr>
            //                </table></td>
            //              </tr>
            //            </table></td>
            //          </tr>
            //        </table>
            //        <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
            //          <tr style="border-collapse:collapse">
            //           <td align="center" style="padding:0;Margin:0">
            //            <table class="es-content-body" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
            //              <tr style="border-collapse:collapse">
            //               <td align="left" style="padding:0;Margin:0;padding-left:35px;padding-right:35px;padding-top:40px">
            //                <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                  <tr style="border-collapse:collapse">
            //                   <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
            //                    <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                      <tr style="border-collapse:collapse">
            //                       <td align="center" style="Margin:0;padding-top:25px;padding-bottom:25px;padding-left:35px;padding-right:35px;font-size:0px"><a target="_blank" href="https://viewstripo.email/" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:none;color:#ED8E20;font-size:16px"><img src="https://storage.googleapis.com/lyxa-bucket/false-drop-051122201304-45.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="120"></a></td>
            //                      </tr>
            //                      <tr style="border-collapse:collapse">
            //                       <td align="center" style="padding:0;Margin:0;padding-bottom:10px"><h2 style="Margin:0;line-height:36px;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:30px;font-style:normal;font-weight:bold;color:#333333">Your order has been cancelled</h2></td>
            //                      </tr>
            //                      <tr style="border-collapse:collapse">
            //                       <td align="left" style="padding:0;Margin:0;padding-top:15px;padding-bottom:20px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#777777;font-size:16px">Your order from ${order.shop.shopName}&nbsp;with order nr&nbsp;${order.orderId}&nbsp;has been Cancelled.&nbsp;</p></td>
            //                      </tr>
            //                      <tr style="border-collapse:collapse">
            //                       <td align="left" style="padding:0;Margin:0;padding-bottom:15px"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Cancel reason</h4></td>
            //                      </tr>
            //                      <tr style="border-collapse:collapse">
            //                       <td align="left" style="padding:0;Margin:0;padding-top:15px;padding-bottom:20px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#777777;font-size:16px">${order.orderCancel?.cancelReason?.name ? order.orderCancel?.cancelReason?.name : order?.orderCancel?.otherReason}</p></td>
            //                      </tr>
            //                    </table></td>
            //                  </tr>
            //                </table></td>
            //              </tr>
            //            </table></td>
            //          </tr>
            //        </table>
            //        <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
            //          <tr style="border-collapse:collapse">
            //           <td align="center" style="padding:0;Margin:0">
            //            <table class="es-content-body" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
            //              <tr style="border-collapse:collapse">
            //               <td align="left" style="padding:0;Margin:0;padding-top:20px;padding-left:35px;padding-right:35px">
            //                <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                  <tr style="border-collapse:collapse">
            //                   <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
            //                    <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                      <tr style="border-collapse:collapse">
            //                       <td bgcolor="#eeeeee" align="left" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:10px;padding-right:10px">
            //                        <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:500px" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" align="left" role="presentation">
            //                          <tr style="border-collapse:collapse">
            //                           <td width="80%" style="padding:0;Margin:0"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Order Confirmation #</h4></td>
            //                           <td width="20%" style="padding:0;Margin:0"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">${order.orderId}</h4></td>
            //                          </tr>
            //                        </table></td>
            //                      </tr>
            //                    </table></td>
            //                  </tr>
            //                </table></td>
            //              </tr>
            //              <tr style="border-collapse:collapse">
            //               <td align="left" style="padding:0;Margin:0;padding-left:35px;padding-right:35px">
            //                <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                  <tr style="border-collapse:collapse">
            //                   <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
            //                    <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                      <tr style="border-collapse:collapse">
            //                       <td align="left" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:10px;padding-right:10px">
            //                        <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:500px" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" align="left" role="presentation">
            //                        ${
            //                         order.productsDetails.map(item => {
            //                           return (
            //                             `
            //                             <tr style="border-collapse:collapse">
            //                         <td style="padding:5px 10px 5px 0;Margin:0" width="80%" align="left"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${item.product.name}  x${item.productQuantity}<br>
            //                             ${item.product.attributes?.items?.length > 0 ? item.product.attributes?.items?.map(att => {
            //                               return (
            //                                 `
            //                                 ${att.name}<br>
            //                               `
            //                               )
            //                             }) : ''}
            //                             ${item.addons?.length > 0 ? item.addons?.map(addon => {
            //                               return (
            //                                 `
            //                                 ${addon.name}<br>
            //                               `
            //                               )
            //                             }) : ''}
            //                         </td>
            //                         <td style="padding:5px 0;Margin:0" width="20%" align="left"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${item.product.price}<br>
            //                             ${item.product.attributes?.items?.length > 0 ? item.product.attributes?.items?.map(att => {
            //                               return (
            //                                 `
            //                                 ${att.extraPrice}<br>
            //                               `
            //                               )
            //                             }) : ''}
            //                             ${item.addons?.length > 0 ? item.addons?.map(addon => {
            //                               return (
            //                                 `
            //                                 ${addon.price }<br>
            //                               `
            //                               )
            //                             }) : ''}
            //                             </td>
            //                             `
            //                           )
            //                         })
            //                       }
            //                        </table></td>
            //                      </tr>
            //                    </table></td>
            //                  </tr>
            //                </table></td>
            //              </tr>
            //              <tr style="border-collapse:collapse">
            //               <td align="left" style="padding:0;Margin:0;padding-top:10px;padding-left:35px;padding-right:35px">
            //                <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                  <tr style="border-collapse:collapse">
            //                   <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
            //                    <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;border-top:3px solid #eeeeee;border-bottom:3px solid #eeeeee" width="100%" cellspacing="0" cellpadding="0" role="presentation">
            //                      <tr style="border-collapse:collapse">
            //                       <td align="left" style="Margin:0;padding-left:10px;padding-right:10px;padding-top:15px;padding-bottom:15px">
            //                        <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:500px" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" align="left" role="presentation">
            //                        <tr style="border-collapse:collapse">
            //                         <td width="80%" align="left" style="padding:0;Margin:0"><h5 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Payment<br><br>Sub total<br>Discount<br>Delivery Fee</h5><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px"><br></p><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">TOTAL REDUND</h4></td>
            //                         <td width="20%" align="left" style="padding:0;Margin:0"><h5 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">${order.paymentMethod}<br><br>${order.summary.baseCurrency_productAmount}<br>0 -<br>${order.summary.baseCurrency_riderFee == 0 ? 'Free' : order.summary.baseCurrency_riderFee}</h5><h3 style="Margin:0;line-height:22px;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:18px;font-style:normal;font-weight:normal;color:#333333"><br></h3><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">${order.summary.baseCurrency_totalAmount}</h4></td>
            //                       </tr>
            //                        </table></td>
            //                      </tr>
            //                    </table></td>
            //                  </tr>
            //                </table></td>
            //              </tr>
            //              <tr style="border-collapse:collapse">
            //               <td align="left" style="Margin:0;padding-left:35px;padding-right:35px;padding-top:40px;padding-bottom:40px"><!--[if mso]><table style="width:530px" cellpadding="0" cellspacing="0"><tr><td style="width:255px" valign="top"><![endif]-->
            //                <table class="es-left" cellspacing="0" cellpadding="0" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
            //                  <tr style="border-collapse:collapse">
            //                   <td class="es-m-p20b" align="left" style="padding:0;Margin:0;width:255px">
            //                    <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                      <tr style="border-collapse:collapse">
            //                       <td align="left" style="padding:0;Margin:0;padding-bottom:15px"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Delivery Address</h4></td>
            //                      </tr>
            //                      <tr style="border-collapse:collapse">
            //                         <td align="left" style="padding:0;Margin:0;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${order.shop.address.address}</p><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${order.shop.address.city}</p><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${order.shop.address.country}</p></td>
            //                       </tr>
            //                    </table></td>
            //                  </tr>
            //                </table><!--[if mso]></td><td style="width:20px"></td><td style="width:255px" valign="top"><![endif]-->
            //                <table class="es-right" cellspacing="0" cellpadding="0" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
            //                  <tr style="border-collapse:collapse">
            //                   <td align="left" style="padding:0;Margin:0;width:255px">
            //                    <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                      <tr style="border-collapse:collapse">
            //                       <td align="left" style="padding:0;Margin:0;padding-bottom:15px"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Estimated Delivery Date</h4></td>
            //                      </tr>
            //                      <tr style="border-collapse:collapse">
            //                       <td align="left" style="padding:0;Margin:0"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${estimatedDate}</p></td>
            //                      </tr>
            //                    </table></td>
            //                  </tr>
            //                </table><!--[if mso]></td></tr></table><![endif]--></td>
            //              </tr>
            //            </table></td>
            //          </tr>
            //        </table>
            //        <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
            //          <tr style="border-collapse:collapse">
            //           <td align="center" style="padding:0;Margin:0">
            //            <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#1b9ba3;width:600px" cellspacing="0" cellpadding="0" bgcolor="#1b9ba3" align="center">
            //              <tr style="border-collapse:collapse">
            //               <td align="left" bgcolor="#010101" style="padding:0;Margin:0;padding-top:20px;padding-left:35px;padding-right:35px;background-color:#010101"><!--[if mso]><table style="width:530px" cellpadding="0" cellspacing="0"><tr><td style="width:255px" valign="top"><![endif]-->
            //                <table cellpadding="0" cellspacing="0" class="es-left" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
            //                  <tr style="border-collapse:collapse">
            //                   <td class="es-m-p20b" align="left" style="padding:0;Margin:0;width:255px">
            //                    <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                      <tr style="border-collapse:collapse">
            //                       <td align="left" class="h-auto" valign="bottom" height="138" style="padding:0;Margin:0;padding-bottom:25px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:20px;color:#cccccc;font-size:13px">For feedback please reach us at<br>support@dropdelivery.ng<u><br><br><br><br></u>©All Rights Reserved. Drop</p></td>
            //                      </tr>
            //                    </table></td>
            //                  </tr>
            //                </table><!--[if mso]></td><td style="width:20px"></td><td style="width:255px" valign="top"><![endif]-->
            //                <table cellpadding="0" cellspacing="0" class="es-right" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
            //                  <tr style="border-collapse:collapse">
            //                   <td align="left" style="padding:0;Margin:0;width:255px">
            //                    <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                      <tr style="border-collapse:collapse">
            //                       <td align="center" style="padding:0;Margin:0;padding-top:5px;padding-bottom:5px;font-size:0px"><img class="adapt-img" src="https://storage.googleapis.com/lyxa-bucket/lyxa-logo-2x-drop-06112211446-12.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="95"></td>
            //                      </tr>
            //                    </table></td>
            //                  </tr>
            //                </table><!--[if mso]></td></tr></table><![endif]--></td>
            //              </tr>
            //            </table></td>
            //          </tr>
            //        </table>
            //        <table cellpadding="0" cellspacing="0" class="es-footer" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%;background-color:transparent;background-repeat:repeat;background-position:center top">
            //          <tr style="border-collapse:collapse">
            //           <td align="center" style="padding:0;Margin:0">
            //            <table class="es-footer-body" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
            //              <tr style="border-collapse:collapse">
            //               <td align="left" style="Margin:0;padding-top:35px;padding-left:35px;padding-right:35px;padding-bottom:40px">
            //                <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                  <tr style="border-collapse:collapse">
            //                   <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
            //                    <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
            //                      <tr style="border-collapse:collapse">
            //                       <td align="center" style="padding:0;Margin:0;display:none"></td>
            //                      </tr>
            //                    </table></td>
            //                  </tr>
            //                </table></td>
            //              </tr>
            //            </table></td>
            //          </tr>
            //        </table>
            //        <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
            //          <tr style="border-collapse:collapse">
            //           <td align="center" style="padding:0;Margin:0">
            //            <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" cellspacing="0" cellpadding="0" align="center">
            //                </table></td>
            //              </tr>
            //            </table></td>
            //          </tr>
            //        </table></td>
            //      </tr>
            //    </table>
            //   </div>
            //  </body>
            // </html>
            // `
            html = `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" style="width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
       <head>
        <meta charset="UTF-8">
        <meta content="width=device-width, initial-scale=1" name="viewport">
        <meta name="x-apple-disable-message-reformatting">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta content="telephone=no" name="format-detection">
        <title>Copy of New message</title><!--[if (mso 16)]>
          <style type="text/css">
          a {text-decoration: none;}
          </style>
          <![endif]--><!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--><!--[if gte mso 9]>
      <xml>
          <o:OfficeDocumentSettings>
          <o:AllowPNG></o:AllowPNG>
          <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
      </xml>
      <![endif]--><!--[if !mso]><!-- -->
        <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,400i,700,700i" rel="stylesheet"><!--<![endif]-->
        <style type="text/css">
      #outlook a {
        padding:0;
      }
      .ExternalClass {
        width:100%;
      }
      .ExternalClass,
      .ExternalClass p,
      .ExternalClass span,
      .ExternalClass font,
      .ExternalClass td,
      .ExternalClass div {
        line-height:100%;
      }
      .es-button {
        mso-style-priority:100!important;
        text-decoration:none!important;
      }
      a[x-apple-data-detectors] {
        color:inherit!important;
        text-decoration:none!important;
        font-size:inherit!important;
        font-family:inherit!important;
        font-weight:inherit!important;
        line-height:inherit!important;
      }
      .es-desk-hidden {
        display:none;
        float:left;
        overflow:hidden;
        width:0;
        max-height:0;
        line-height:0;
        mso-hide:all;
      }
      [data-ogsb] .es-button {
        border-width:0!important;
        padding:15px 30px 15px 30px!important;
      }
      @media only screen and (max-width:600px) {p, ul li, ol li, a { line-height:150%!important } h1, h2, h3, h1 a, h2 a, h3 a { line-height:120%!important } h1 { font-size:32px!important; text-align:center } h2 { font-size:26px!important; text-align:center } h3 { font-size:20px!important; text-align:center } .es-header-body h1 a, .es-content-body h1 a, .es-footer-body h1 a { font-size:32px!important } .es-header-body h2 a, .es-content-body h2 a, .es-footer-body h2 a { font-size:26px!important } .es-header-body h3 a, .es-content-body h3 a, .es-footer-body h3 a { font-size:20px!important } .es-menu td a { font-size:16px!important } .es-header-body p, .es-header-body ul li, .es-header-body ol li, .es-header-body a { font-size:16px!important } .es-content-body p, .es-content-body ul li, .es-content-body ol li, .es-content-body a { font-size:16px!important } .es-footer-body p, .es-footer-body ul li, .es-footer-body ol li, .es-footer-body a { font-size:16px!important } .es-infoblock p, .es-infoblock ul li, .es-infoblock ol li, .es-infoblock a { font-size:12px!important } *[class="gmail-fix"] { display:none!important } .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3 { text-align:center!important } .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3 { text-align:right!important } .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3 { text-align:left!important } .es-m-txt-r img, .es-m-txt-c img, .es-m-txt-l img { display:inline!important } .es-button-border { display:inline-block!important } a.es-button, button.es-button { font-size:16px!important; display:inline-block!important; border-width:15px 30px 15px 30px!important } .es-btn-fw { border-width:10px 0px!important; text-align:center!important } .es-adaptive table, .es-btn-fw, .es-btn-fw-brdr, .es-left, .es-right { width:100%!important } .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } .es-adapt-td { display:block!important; width:100%!important } .adapt-img { width:70%!important; height:auto!important } .es-m-p0 { padding:0px!important } .es-m-p0r { padding-right:0px!important } .es-m-p0l { padding-left:0px!important } .es-m-p0t { padding-top:0px!important } .es-m-p0b { padding-bottom:0!important } .es-m-p20b { padding-bottom:20px!important } .es-mobile-hidden, .es-hidden { display:none!important } tr.es-desk-hidden, td.es-desk-hidden, table.es-desk-hidden { width:auto!important; overflow:visible!important; float:none!important; max-height:inherit!important; line-height:inherit!important } tr.es-desk-hidden { display:table-row!important } table.es-desk-hidden { display:table!important } td.es-desk-menu-hidden { display:table-cell!important } .es-menu td { width:1%!important } table.es-table-not-adapt, .esd-block-html table { width:auto!important } table.es-social { display:inline-block!important } table.es-social td { display:inline-block!important } .es-desk-hidden { display:table-row!important; width:auto!important; overflow:visible!important; max-height:inherit!important } .h-auto { height:auto!important } }
      </style>
       </head>
       <body style="width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;padding:0;Margin:0">
        <div class="es-wrapper-color" style="background-color:#EEEEEE"><!--[if gte mso 9]>
            <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
              <v:fill type="tile" color="#eeeeee"></v:fill>
            </v:background>
          <![endif]-->
         <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#EEEEEE">
           <tr style="border-collapse:collapse">
            <td valign="top" style="padding:0;Margin:0">
             <table cellpadding="0" cellspacing="0" class="es-content" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
               <tr style="border-collapse:collapse">
                <td align="center" style="padding:0;Margin:0">
                 <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" cellspacing="0" cellpadding="0" align="center">
                   <tr style="border-collapse:collapse">
                    <td align="left" style="Margin:0;padding-left:10px;padding-right:10px;padding-top:15px;padding-bottom:15px"><!--[if mso]><table style="width:580px" cellpadding="0" cellspacing="0"><tr><td style="width:282px" valign="top"><![endif]-->
                     <table class="es-left" cellspacing="0" cellpadding="0" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                     </table><!--[if mso]></td><td style="width:20px"></td><td style="width:278px" valign="top"><![endif]-->
                     <table class="es-right" cellspacing="0" cellpadding="0" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                       <tr style="border-collapse:collapse">
                        <td align="left" style="padding:0;Margin:0;width:278px">
                         <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                         </table></td>
                       </tr>
                     </table><!--[if mso]></td></tr></table><![endif]--></td>
                   </tr>
                 </table></td>
               </tr>
             </table>
             <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
               <tr style="border-collapse:collapse"></tr>
               <tr style="border-collapse:collapse">
                <td align="center" style="padding:0;Margin:0">
                 <table class="es-header-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#044767;width:600px" cellspacing="0" cellpadding="0" bgcolor="#044767" align="center">
                   <tr style="border-collapse:collapse">
                    <td align="left" bgcolor="#181616" style="Margin:0;padding-top:20px;padding-bottom:20px;padding-left:35px;padding-right:35px;background-color:#181616">
                     <table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                       <tr style="border-collapse:collapse">
                        <td align="center" valign="top" style="padding:0;Margin:0;width:530px">
                         <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr style="border-collapse:collapse">
                            <td align="center" style="padding:0;Margin:0;font-size:0px"><img class="adapt-img" src="https://storage.googleapis.com/lyxa-bucket/lyxa-logo2-2x-drop-06112211334-19.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="170"></td>
                                                 </tr>
                                               </table></td>
                                             </tr>
                                           </table></td>
                                         </tr>
                                       </table></td>
                                     </tr>
                                   </table>
                                   <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                                     <tr style="border-collapse:collapse">
                                      <td align="center" style="padding:0;Margin:0">
                                       <table class="es-content-body" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
                                         <tr style="border-collapse:collapse">
                                          <td align="left" style="padding:0;Margin:0;padding-left:35px;padding-right:35px;padding-top:40px">
                                           <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                             <tr style="border-collapse:collapse">
                                              <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                                               <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                                 <tr style="border-collapse:collapse">
                                                  <td align="center" style="Margin:0;padding-top:25px;padding-bottom:25px;padding-left:35px;padding-right:35px;font-size:0px"><a target="_blank" href="https://viewstripo.email/" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:none;color:#ED8E20;font-size:16px"><img src="https://storage.googleapis.com/lyxa-bucket/false-drop-051122201304-45.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="120"></a></td>
                                                 </tr>
                                                 <tr style="border-collapse:collapse">
                                                  <td align="center" style="padding:0;Margin:0;padding-bottom:10px"><h2 style="Margin:0;line-height:36px;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:30px;font-style:normal;font-weight:bold;color:#333333">Your order has been cancelled</h2></td>
                                                 </tr>
                                                 <tr style="border-collapse:collapse">
                                                  <td align="left" style="padding:0;Margin:0;padding-top:15px;padding-bottom:20px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#777777;font-size:16px">Your order from ${
                                                      order.shop.shopName
                                                  }&nbsp;with order nr&nbsp;${
                order.orderId
            }&nbsp;has been Cancelled.&nbsp;</p></td>
                                                 </tr>
                                                 <tr style="border-collapse:collapse">
                                                  <td align="left" style="padding:0;Margin:0;padding-bottom:15px"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Cancel reason</h4></td>
                                                 </tr>
                                                 <tr style="border-collapse:collapse">
                                                  <td align="left" style="padding:0;Margin:0;padding-top:15px;padding-bottom:20px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#777777;font-size:16px">${
                                                      order.orderCancel
                                                          ?.cancelReason?.name
                                                          ? order.orderCancel
                                                                ?.cancelReason
                                                                ?.name
                                                          : order?.orderCancel
                                                                ?.otherReason
                                                  }</p></td>
                                                 </tr>
                                               </table></td>
                                             </tr>
                                           </table></td>
                                         </tr>
                                       </table></td>
                                     </tr>
                                   </table>
                                   <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                                     <tr style="border-collapse:collapse">
                                      <td align="center" style="padding:0;Margin:0">
                                       <table class="es-content-body" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
                                         <tr style="border-collapse:collapse">
                                          <td align="left" style="padding:0;Margin:0;padding-top:20px;padding-left:35px;padding-right:35px">
                                           <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                             <tr style="border-collapse:collapse">
                                              <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                                               <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                                 <tr style="border-collapse:collapse">
                                                  <td bgcolor="#eeeeee" align="left" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:10px;padding-right:10px">
                                                   <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:500px" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" align="left" role="presentation">
                                                     <tr style="border-collapse:collapse">
                                                      <td width="80%" style="padding:0;Margin:0"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Order Confirmation #</h4></td>
                                                      <td width="20%" style="padding:0;Margin:0"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">${
                                                          order.orderId
                                                      }</h4></td>
                                                     </tr>
                                                   </table></td>
                                                 </tr>
                                               </table></td>
                                             </tr>
                                           </table></td>
                                         </tr>
                                         <tr style="border-collapse:collapse">
                                          <td align="left" style="padding:0;Margin:0;padding-left:35px;padding-right:35px">
                                           <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                             <tr style="border-collapse:collapse">
                                              <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                                               <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                                 <tr style="border-collapse:collapse">
                                                  <td align="left" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:10px;padding-right:10px">
                                                   <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:500px" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" align="left" role="presentation">
                                                   ${order.productsDetails.map(
                                                       item => {
                                                           return `
                                                        <tr style="border-collapse:collapse">
                                                    <td style="padding:5px 10px 5px 0;Margin:0" width="80%" align="left"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                                                        item.product.name
                                                    }  x${
                                                               item.productQuantity
                                                           }<br>
                                                        ${
                                                            item.product
                                                                .attributes
                                                                ?.items
                                                                ?.length > 0
                                                                ? item.product.attributes?.items?.map(
                                                                      att => {
                                                                          return `
                                                            ${att.name}<br>
                                                          `;
                                                                      }
                                                                  )
                                                                : ''
                                                        }
                                                        ${
                                                            item.addons
                                                                ?.length > 0
                                                                ? item.addons?.map(
                                                                      addon => {
                                                                          return `
                                                            ${addon.name}<br>
                                                          `;
                                                                      }
                                                                  )
                                                                : ''
                                                        }
                                                    </td>
                                                    <td style="padding:5px 0;Margin:0" width="20%" align="left"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                                                        item.product.price
                                                    }<br>
                                                        ${
                                                            item.product
                                                                .attributes
                                                                ?.items
                                                                ?.length > 0
                                                                ? item.product.attributes?.items?.map(
                                                                      att => {
                                                                          return `
                                                            ${att.extraPrice}<br>
                                                          `;
                                                                      }
                                                                  )
                                                                : ''
                                                        }
                                                        ${
                                                            item.addons
                                                                ?.length > 0
                                                                ? item.addons?.map(
                                                                      addon => {
                                                                          return `
                                                            ${addon.price}<br>
                                                          `;
                                                                      }
                                                                  )
                                                                : ''
                                                        }
                                                        </td>
                                                        `;
                                                       }
                                                   )}
                                                   </table></td>
                                                 </tr>
                                               </table></td>
                                             </tr>
                                           </table></td>
                                         </tr>
                                         <tr style="border-collapse:collapse">
                                          <td align="left" style="padding:0;Margin:0;padding-top:10px;padding-left:35px;padding-right:35px">
                                           <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                             <tr style="border-collapse:collapse">
                                              <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                                               <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;border-top:3px solid #eeeeee;border-bottom:3px solid #eeeeee" width="100%" cellspacing="0" cellpadding="0" role="presentation">
                                                 <tr style="border-collapse:collapse">
                                                  <td align="left" style="Margin:0;padding-left:10px;padding-right:10px;padding-top:15px;padding-bottom:15px">
                                                   <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:500px" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" align="left" role="presentation">
                                                   <tr style="border-collapse:collapse">
                                                    <td width="80%" align="left" style="padding:0;Margin:0"><h5 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Payment<br><br>Sub total<br>${
                                                        summary.baseCurrency_discount &&
                                                        `Discount<br>`
                                                    }Delivery Fee</h5><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px"><br></p><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">TOTAL REDUND</h4></td>
                                                    <td width="20%" align="left" style="padding:0;Margin:0"><h5 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">${
                                                        order.paymentMethod
                                                    }<br><br>${
                order.summary.baseCurrency_productAmount
            }<br>${
                summary.baseCurrency_discount &&
                summary.baseCurrency_discount`<br>`
            }${
                order.summary.baseCurrency_riderFee == 0
                    ? 'Free'
                    : order.summary.baseCurrency_riderFee
            }</h5><h3 style="Margin:0;line-height:22px;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:18px;font-style:normal;font-weight:normal;color:#333333"><br></h3><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">${
                order.summary.baseCurrency_totalAmount
            }</h4></td>
                                                  </tr>
                                                   </table></td>
                                                 </tr>
                                               </table></td>
                                             </tr>
                                           </table></td>
                                         </tr>
                                         <tr style="border-collapse:collapse">
                                          <td align="left" style="Margin:0;padding-left:35px;padding-right:35px;padding-top:40px;padding-bottom:40px"><!--[if mso]><table style="width:530px" cellpadding="0" cellspacing="0"><tr><td style="width:255px" valign="top"><![endif]-->
                                           <table class="es-left" cellspacing="0" cellpadding="0" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                                             <tr style="border-collapse:collapse">
                                              <td class="es-m-p20b" align="left" style="padding:0;Margin:0;width:255px">
                                               <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                                 <tr style="border-collapse:collapse">
                                                  <td align="left" style="padding:0;Margin:0;padding-bottom:15px"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Delivery Address</h4></td>
                                                 </tr>
                                                 <tr style="border-collapse:collapse">
                                                    <td align="left" style="padding:0;Margin:0;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                                                        order.shop.address
                                                            .address
                                                    }</p><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                order.shop.address.city
            }</p><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                order.shop.address.country
            }</p></td>
                                                  </tr>
                                               </table></td>
                                             </tr>
                                           </table><!--[if mso]></td><td style="width:20px"></td><td style="width:255px" valign="top"><![endif]-->
                                           <table class="es-right" cellspacing="0" cellpadding="0" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                                             <tr style="border-collapse:collapse">
                                              <td align="left" style="padding:0;Margin:0;width:255px">
                                               <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                                 <tr style="border-collapse:collapse">
                                                  <td align="left" style="padding:0;Margin:0;padding-bottom:15px"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Estimated Delivery Date</h4></td>
                                                 </tr>
                                                 <tr style="border-collapse:collapse">
                                                  <td align="left" style="padding:0;Margin:0"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${estimatedDate}</p></td>
                                                 </tr>
                                               </table></td>
                                             </tr>
                                           </table><!--[if mso]></td></tr></table><![endif]--></td>
                                         </tr>
                                       </table></td>
                                     </tr>
                                   </table>
                                   <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                                     <tr style="border-collapse:collapse">
                                      <td align="center" style="padding:0;Margin:0">
                                       <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#1b9ba3;width:600px" cellspacing="0" cellpadding="0" bgcolor="#1b9ba3" align="center">
                                         <tr style="border-collapse:collapse">
                                          <td align="left" bgcolor="#010101" style="padding:0;Margin:0;padding-top:20px;padding-left:35px;padding-right:35px;background-color:#010101"><!--[if mso]><table style="width:530px" cellpadding="0" cellspacing="0"><tr><td style="width:255px" valign="top"><![endif]-->
                                           <table cellpadding="0" cellspacing="0" class="es-left" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                                             <tr style="border-collapse:collapse">
                                              <td class="es-m-p20b" align="left" style="padding:0;Margin:0;width:255px">
                                               <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                                 <tr style="border-collapse:collapse">
                                                  <td align="left" class="h-auto" valign="bottom" height="138" style="padding:0;Margin:0;padding-bottom:25px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:20px;color:#cccccc;font-size:13px">For feedback please reach us at<br>support@dropdelivery.ng<u><br><br><br><br></u>©All Rights Reserved. Drop</p></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table><!--[if mso]></td><td style="width:20px"></td><td style="width:255px" valign="top"><![endif]-->
                     <table cellpadding="0" cellspacing="0" class="es-right" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                       <tr style="border-collapse:collapse">
                        <td align="left" style="padding:0;Margin:0;width:255px">
                         <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr style="border-collapse:collapse">
                            <td align="center" style="padding:0;Margin:0;padding-top:5px;padding-bottom:5px;font-size:0px"><img class="adapt-img" src="https://storage.googleapis.com/lyxa-bucket/lyxa-logo-2x-drop-06112211446-12.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="95"></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table><!--[if mso]></td></tr></table><![endif]--></td>
                   </tr>
                 </table></td>
               </tr>
             </table>
             <table cellpadding="0" cellspacing="0" class="es-footer" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%;background-color:transparent;background-repeat:repeat;background-position:center top">
               <tr style="border-collapse:collapse">
                <td align="center" style="padding:0;Margin:0">
                 <table class="es-footer-body" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
                   <tr style="border-collapse:collapse">
                    <td align="left" style="Margin:0;padding-top:35px;padding-left:35px;padding-right:35px;padding-bottom:40px">
                     <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                       <tr style="border-collapse:collapse">
                        <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                         <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr style="border-collapse:collapse">
                            <td align="center" style="padding:0;Margin:0;display:none"></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table></td>
                   </tr>
                 </table></td>
               </tr>
             </table>
             </td>
           </tr>
         </table>
        </div>
       </body>
      </html>
      `;
        } else if (order.orderStatus === 'refused') {
            status = 'Refused';
            // Calcel order html

            html = `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" style="width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
       <head>
        <meta charset="UTF-8">
        <meta content="width=device-width, initial-scale=1" name="viewport">
        <meta name="x-apple-disable-message-reformatting">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta content="telephone=no" name="format-detection">
        <title>Copy of New message</title><!--[if (mso 16)]>
          <style type="text/css">
          a {text-decoration: none;}
          </style>
          <![endif]--><!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--><!--[if gte mso 9]>
      <xml>
          <o:OfficeDocumentSettings>
          <o:AllowPNG></o:AllowPNG>
          <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
      </xml>
      <![endif]--><!--[if !mso]><!-- -->
        <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,400i,700,700i" rel="stylesheet"><!--<![endif]-->
        <style type="text/css">
      #outlook a {
        padding:0;
      }
      .ExternalClass {
        width:100%;
      }
      .ExternalClass,
      .ExternalClass p,
      .ExternalClass span,
      .ExternalClass font,
      .ExternalClass td,
      .ExternalClass div {
        line-height:100%;
      }
      .es-button {
        mso-style-priority:100!important;
        text-decoration:none!important;
      }
      a[x-apple-data-detectors] {
        color:inherit!important;
        text-decoration:none!important;
        font-size:inherit!important;
        font-family:inherit!important;
        font-weight:inherit!important;
        line-height:inherit!important;
      }
      .es-desk-hidden {
        display:none;
        float:left;
        overflow:hidden;
        width:0;
        max-height:0;
        line-height:0;
        mso-hide:all;
      }
      [data-ogsb] .es-button {
        border-width:0!important;
        padding:15px 30px 15px 30px!important;
      }
      @media only screen and (max-width:600px) {p, ul li, ol li, a { line-height:150%!important } h1, h2, h3, h1 a, h2 a, h3 a { line-height:120%!important } h1 { font-size:32px!important; text-align:center } h2 { font-size:26px!important; text-align:center } h3 { font-size:20px!important; text-align:center } .es-header-body h1 a, .es-content-body h1 a, .es-footer-body h1 a { font-size:32px!important } .es-header-body h2 a, .es-content-body h2 a, .es-footer-body h2 a { font-size:26px!important } .es-header-body h3 a, .es-content-body h3 a, .es-footer-body h3 a { font-size:20px!important } .es-menu td a { font-size:16px!important } .es-header-body p, .es-header-body ul li, .es-header-body ol li, .es-header-body a { font-size:16px!important } .es-content-body p, .es-content-body ul li, .es-content-body ol li, .es-content-body a { font-size:16px!important } .es-footer-body p, .es-footer-body ul li, .es-footer-body ol li, .es-footer-body a { font-size:16px!important } .es-infoblock p, .es-infoblock ul li, .es-infoblock ol li, .es-infoblock a { font-size:12px!important } *[class="gmail-fix"] { display:none!important } .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3 { text-align:center!important } .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3 { text-align:right!important } .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3 { text-align:left!important } .es-m-txt-r img, .es-m-txt-c img, .es-m-txt-l img { display:inline!important } .es-button-border { display:inline-block!important } a.es-button, button.es-button { font-size:16px!important; display:inline-block!important; border-width:15px 30px 15px 30px!important } .es-btn-fw { border-width:10px 0px!important; text-align:center!important } .es-adaptive table, .es-btn-fw, .es-btn-fw-brdr, .es-left, .es-right { width:100%!important } .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } .es-adapt-td { display:block!important; width:100%!important } .adapt-img { width:100%!important; height:auto!important } .es-m-p0 { padding:0px!important } .es-m-p0r { padding-right:0px!important } .es-m-p0l { padding-left:0px!important } .es-m-p0t { padding-top:0px!important } .es-m-p0b { padding-bottom:0!important } .es-m-p20b { padding-bottom:20px!important } .es-mobile-hidden, .es-hidden { display:none!important } tr.es-desk-hidden, td.es-desk-hidden, table.es-desk-hidden { width:auto!important; overflow:visible!important; float:none!important; max-height:inherit!important; line-height:inherit!important } tr.es-desk-hidden { display:table-row!important } table.es-desk-hidden { display:table!important } td.es-desk-menu-hidden { display:table-cell!important } .es-menu td { width:1%!important } table.es-table-not-adapt, .esd-block-html table { width:auto!important } table.es-social { display:inline-block!important } table.es-social td { display:inline-block!important } .es-desk-hidden { display:table-row!important; width:auto!important; overflow:visible!important; max-height:inherit!important } .h-auto { height:auto!important } }
      </style>
       </head>
       <body style="width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;padding:0;Margin:0">
        <div class="es-wrapper-color" style="background-color:#EEEEEE"><!--[if gte mso 9]>
            <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
              <v:fill type="tile" color="#eeeeee"></v:fill>
            </v:background>
          <![endif]-->
         <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#EEEEEE">
           <tr style="border-collapse:collapse">
            <td valign="top" style="padding:0;Margin:0">
             <table cellpadding="0" cellspacing="0" class="es-content" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
               <tr style="border-collapse:collapse">
                <td align="center" style="padding:0;Margin:0">
                 <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" cellspacing="0" cellpadding="0" align="center">
                   <tr style="border-collapse:collapse">
                    <td align="left" style="Margin:0;padding-left:10px;padding-right:10px;padding-top:15px;padding-bottom:15px"><!--[if mso]><table style="width:580px" cellpadding="0" cellspacing="0"><tr><td style="width:282px" valign="top"><![endif]-->
                     <table class="es-left" cellspacing="0" cellpadding="0" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                     </table><!--[if mso]></td><td style="width:20px"></td><td style="width:278px" valign="top"><![endif]-->
                     <table class="es-right" cellspacing="0" cellpadding="0" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                       </tr>
                     </table><!--[if mso]></td></tr></table><![endif]--></td>
                   </tr>
                 </table></td>
               </tr>
             </table>
             <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
               <tr style="border-collapse:collapse"></tr>
               <tr style="border-collapse:collapse">
                <td align="center" style="padding:0;Margin:0">
                 <table class="es-header-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#044767;width:600px" cellspacing="0" cellpadding="0" bgcolor="#044767" align="center">
                   <tr style="border-collapse:collapse">
                    <td align="left" bgcolor="#181616" style="Margin:0;padding-top:20px;padding-bottom:20px;padding-left:35px;padding-right:35px;background-color:#181616">
                     <table cellpadding="0" cellspacing="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                       <tr style="border-collapse:collapse">
                        <td align="center" valign="top" style="padding:0;Margin:0;width:530px">
                         <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr style="border-collapse:collapse">
                            <td align="center" style="padding:0;Margin:0;font-size:0px"><img class="adapt-img" src="https://storage.googleapis.com/lyxa-bucket/lyxa-logo2-2x-drop-06112211334-19.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="170"></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table></td>
                   </tr>
                 </table></td>
               </tr>
             </table>
             <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
               <tr style="border-collapse:collapse">
                <td align="center" style="padding:0;Margin:0">
                 <table class="es-content-body" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
                   <tr style="border-collapse:collapse">
                    <td align="left" style="padding:0;Margin:0;padding-left:35px;padding-right:35px;padding-top:40px">
                     <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                       <tr style="border-collapse:collapse">
                        <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                         <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr style="border-collapse:collapse">
                            <td align="center" style="Margin:0;padding-top:25px;padding-bottom:25px;padding-left:35px;padding-right:35px;font-size:0px"><a target="_blank" href="https://viewstripo.email/" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:none;color:#ED8E20;font-size:16px"><img src="https://storage.googleapis.com/lyxa-bucket/false-drop-051122201304-45.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="120"></a></td>
                           </tr>
                           <tr style="border-collapse:collapse">
                            <td align="center" style="padding:0;Margin:0;padding-bottom:10px"><h2 style="Margin:0;line-height:36px;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:30px;font-style:normal;font-weight:bold;color:#333333">Your order has been cancelled</h2></td>
                           </tr>
                           <tr style="border-collapse:collapse">
                            <td align="left" style="padding:0;Margin:0;padding-top:15px;padding-bottom:20px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#777777;font-size:16px">Your order from ${
                                order.shop.shopName
                            }&nbsp;with order nr&nbsp;${
                order.orderId
            }&nbsp;has been Refused.&nbsp;</p></td>
                           </tr>
                           <tr style="border-collapse:collapse">
                            <td align="left" style="padding:0;Margin:0;padding-bottom:15px"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Cancel reason</h4></td>
                           </tr>
                           <tr style="border-collapse:collapse">
                            <td align="left" style="padding:0;Margin:0;padding-top:15px;padding-bottom:20px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#777777;font-size:16px">${
                                order.orderCancel?.cancelReason?.name
                                    ? order.orderCancel?.cancelReason?.name
                                    : order?.orderCancel?.otherReason
                            }</p></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table></td>
                   </tr>
                 </table></td>
               </tr>
             </table>
             <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
               <tr style="border-collapse:collapse">
                <td align="center" style="padding:0;Margin:0">
                 <table class="es-content-body" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
                   <tr style="border-collapse:collapse">
                    <td align="left" style="padding:0;Margin:0;padding-top:20px;padding-left:35px;padding-right:35px">
                     <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                       <tr style="border-collapse:collapse">
                        <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                         <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr style="border-collapse:collapse">
                            <td bgcolor="#eeeeee" align="left" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:10px;padding-right:10px">
                             <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:500px" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" align="left" role="presentation">
                               <tr style="border-collapse:collapse">
                                <td width="80%" style="padding:0;Margin:0"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Order Confirmation #</h4></td>
                                <td width="20%" style="padding:0;Margin:0"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">${
                                    order.orderId
                                }</h4></td>
                               </tr>
                             </table></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table></td>
                   </tr>
                   <tr style="border-collapse:collapse">
                    <td align="left" style="padding:0;Margin:0;padding-left:35px;padding-right:35px">
                     <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                       <tr style="border-collapse:collapse">
                        <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                         <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr style="border-collapse:collapse">
                            <td align="left" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:10px;padding-right:10px">
                             <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:500px" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" align="left" role="presentation">
                             ${order.productsDetails.map(item => {
                                 return `
                                  <tr style="border-collapse:collapse">
                              <td style="padding:5px 10px 5px 0;Margin:0" width="80%" align="left"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                                  item.product.name
                              }  x${item.productQuantity}<br>
                                  ${
                                      item.product.attributes?.items?.length > 0
                                          ? item.product.attributes?.items?.map(
                                                att => {
                                                    return `
                                      ${att.name}<br>
                                    `;
                                                }
                                            )
                                          : ''
                                  }
                                  ${
                                      item.addons?.length > 0
                                          ? item.addons?.map(addon => {
                                                return `
                                      ${addon.name}<br>
                                    `;
                                            })
                                          : ''
                                  }
                              </td>
                              <td style="padding:5px 0;Margin:0" width="20%" align="left"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                                  item.product.price
                              }<br>
                                  ${
                                      item.product.attributes?.items?.length > 0
                                          ? item.product.attributes?.items?.map(
                                                att => {
                                                    return `
                                      ${att.extraPrice}<br>
                                    `;
                                                }
                                            )
                                          : ''
                                  }
                                  ${
                                      item.addons?.length > 0
                                          ? item.addons?.map(addon => {
                                                return `
                                      ${addon.price}<br>
                                    `;
                                            })
                                          : ''
                                  }
                                  </td>
                                  `;
                             })}
                             </table></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table></td>
                   </tr>
                   <tr style="border-collapse:collapse">
                    <td align="left" style="padding:0;Margin:0;padding-top:10px;padding-left:35px;padding-right:35px">
                     <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                       <tr style="border-collapse:collapse">
                        <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                         <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;border-top:3px solid #eeeeee;border-bottom:3px solid #eeeeee" width="100%" cellspacing="0" cellpadding="0" role="presentation">
                           <tr style="border-collapse:collapse">
                            <td align="left" style="Margin:0;padding-left:10px;padding-right:10px;padding-top:15px;padding-bottom:15px">
                             <table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:500px" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" align="left" role="presentation">
                             <tr style="border-collapse:collapse">
                              <td width="80%" align="left" style="padding:0;Margin:0"><h5 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Payment<br><br>Sub total<br>${
                                  summary.baseCurrency_discount &&
                                  `Discount<br>`
                              }Delivery Fee</h5><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px"><br></p><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">TOTAL REDUND</h4></td>
                              <td width="20%" align="left" style="padding:0;Margin:0"><h5 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">${
                                  order.paymentMethod
                              }<br><br>${
                order.summary.baseCurrency_productAmount
            }<br>${
                summary.baseCurrency_discount &&
                summary.baseCurrency_discount`<br>`
            }${
                order.summary.baseCurrency_riderFee == 0
                    ? 'Free'
                    : order.summary.baseCurrency_riderFee
            }</h5><h3 style="Margin:0;line-height:22px;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:18px;font-style:normal;font-weight:normal;color:#333333"><br></h3><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">${
                order.summary.baseCurrency_totalAmount
            }</h4></td>
                            </tr>
                             </table></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table></td>
                   </tr>
                   <tr style="border-collapse:collapse">
                    <td align="left" style="Margin:0;padding-left:35px;padding-right:35px;padding-top:40px;padding-bottom:40px"><!--[if mso]><table style="width:530px" cellpadding="0" cellspacing="0"><tr><td style="width:255px" valign="top"><![endif]-->
                     <table class="es-left" cellspacing="0" cellpadding="0" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                       <tr style="border-collapse:collapse">
                        <td class="es-m-p20b" align="left" style="padding:0;Margin:0;width:255px">
                         <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr style="border-collapse:collapse">
                            <td align="left" style="padding:0;Margin:0;padding-bottom:15px"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Delivery Address</h4></td>
                           </tr>
                           <tr style="border-collapse:collapse">
                              <td align="left" style="padding:0;Margin:0;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                                  order.shop.address.address
                              }</p><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                order.shop.address.city
            }</p><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${
                order.shop.address.country
            }</p></td>
                            </tr>
                         </table></td>
                       </tr>
                     </table><!--[if mso]></td><td style="width:20px"></td><td style="width:255px" valign="top"><![endif]-->
                     <table class="es-right" cellspacing="0" cellpadding="0" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                       <tr style="border-collapse:collapse">
                        <td align="left" style="padding:0;Margin:0;width:255px">
                         <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr style="border-collapse:collapse">
                            <td align="left" style="padding:0;Margin:0;padding-bottom:15px"><h4 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif">Estimated Delivery Date</h4></td>
                           </tr>
                           <tr style="border-collapse:collapse">
                            <td align="left" style="padding:0;Margin:0"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:24px;color:#333333;font-size:16px">${estimatedDate}</p></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table><!--[if mso]></td></tr></table><![endif]--></td>
                   </tr>
                 </table></td>
               </tr>
             </table>
             <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
               <tr style="border-collapse:collapse">
                <td align="center" style="padding:0;Margin:0">
                 <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#1b9ba3;width:600px" cellspacing="0" cellpadding="0" bgcolor="#1b9ba3" align="center">
                   <tr style="border-collapse:collapse">
                    <td align="left" bgcolor="#010101" style="padding:0;Margin:0;padding-top:20px;padding-left:35px;padding-right:35px;background-color:#010101"><!--[if mso]><table style="width:530px" cellpadding="0" cellspacing="0"><tr><td style="width:255px" valign="top"><![endif]-->
                     <table cellpadding="0" cellspacing="0" class="es-left" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                       <tr style="border-collapse:collapse">
                        <td class="es-m-p20b" align="left" style="padding:0;Margin:0;width:255px">
                         <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr style="border-collapse:collapse">
                            <td align="left" class="h-auto" valign="bottom" height="138" style="padding:0;Margin:0;padding-bottom:25px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:20px;color:#cccccc;font-size:13px">For feedback please reach us at<br>support@dropdelivery.ng<u><br><br><br><br></u>©All Rights Reserved. Drop</p></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table><!--[if mso]></td><td style="width:20px"></td><td style="width:255px" valign="top"><![endif]-->
                     <table cellpadding="0" cellspacing="0" class="es-right" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                       <tr style="border-collapse:collapse">
                        <td align="left" style="padding:0;Margin:0;width:255px">
                         <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr style="border-collapse:collapse">
                            <td align="center" style="padding:0;Margin:0;padding-top:5px;padding-bottom:5px;font-size:0px"><img class="adapt-img" src="https://storage.googleapis.com/lyxa-bucket/lyxa-logo-2x-drop-06112211446-12.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="95"></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table><!--[if mso]></td></tr></table><![endif]--></td>
                   </tr>
                 </table></td>
               </tr>
             </table>
             <table cellpadding="0" cellspacing="0" class="es-footer" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%;background-color:transparent;background-repeat:repeat;background-position:center top">
               <tr style="border-collapse:collapse">
                <td align="center" style="padding:0;Margin:0">
                 <table class="es-footer-body" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
                   <tr style="border-collapse:collapse">
                    <td align="left" style="Margin:0;padding-top:35px;padding-left:35px;padding-right:35px;padding-bottom:40px">
                     <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                       <tr style="border-collapse:collapse">
                        <td valign="top" align="center" style="padding:0;Margin:0;width:530px">
                         <table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr style="border-collapse:collapse">
                            <td align="center" style="padding:0;Margin:0;display:none"></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table></td>
                   </tr>
                 </table></td>
               </tr>
             </table>
             <table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
               <tr style="border-collapse:collapse">
                <td align="center" style="padding:0;Margin:0">
                 <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" cellspacing="0" cellpadding="0" align="center">
                     </table></td>
                   </tr>
                 </table></td>
               </tr>
             </table></td>
           </tr>
         </table>
        </div>
       </body>
      </html>
      `;
        }

        let data = {
            service_id: process.env.EMAIL_JS_SERVICE_ID,
            template_id: process.env.EMAIL_JS_ORDER_PLACED_TEMPLATE_ID,
            user_id: process.env.EMAIL_JS_USER_ID,
            accessToken: process.env.EMAIL_JS_ACCESS_TOKEN,
            template_params: {
                reply_to: 'User',
                status: status,
                html: html,
                to_email: order.user.email,
                orderId: order.orderId,
            },
        };

        const response = await axios.post(
            'https://api.emailjs.com/api/v1.0/email/send',
            data
        );

        // console.log("emailjs log ",response.data);

        return true;
    } catch (error) {
        console.log('emailjs error', error);
        console.log('emailjs error', error.message);
        return false;
    }
};

// exports.emailSend = async (req, res) => {
//     try {
//         emailjs.init('user_wQhl9aqwnnGrHZgwxqqhr'); //please encrypted user id for malicious attacks
//         //set the parameter as per you template parameter[https://dashboard.emailjs.com/templates]
//         var templateParams = {
//             to_name: 'xyz',
//             from_name: 'abc',
//             message_html: 'Please Find out the attached file',
//         };

// emailjs
//     .send('service_n3uesc2', 'template_015zsko', templateParams)
//     .then(function (response) {
//         console.log('SUCCESS!', response.status, response.text);
//     });
// const data = {
//     service_id: 'service_n3uesc2',
//     template_id: 'template_015zsko',
//     user_id: 'user_wQhl9aqwnnGrHZgwxqqhr',
//     // template_params: {
//     //     'username': 'James',
//     //     'g-recaptcha-response': '03AHJ_ASjnLA214KSNKFJAK12sfKASfehbmfd...'
//     // }
// };

//         // await axios({
//         //     method:"POST",
//         //     url : "https://api.emailjs.com/api/v1.0/email/send",
//         //     headers: {
//         //         "content-type":"application/x-www-form-urlencoded",
//         //         "x-rapidapi-host":"astrology-horoscope.p.rapidapi.com",
//         //         "x-rapidapi-key": "yourapikey"
//         //     },
//         //     data
//         // })
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
