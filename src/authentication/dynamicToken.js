const express = require('express');
const Seller = require('../models/SellerModel');

const { verify } = require('jsonwebtoken');

// Checks admin or seller Token

module.exports.dynamicToken = async (req, res, next) => {

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
        const { adminId } = verify(token, process.env.JWT_PRIVATE_KEY_ADMIN);

        if (!sellerId && !adminId) {
            return res.status(403).json({
                status: false,
                message: 'Invalid token',
            });
        }

        if (sellerId) {
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
        } else if (adminId) {
            const admin = await require('../models/AdminModel').findOne({
                _id: adminId,
                status: 'active',
                deletedAt: null,
            });

            if (!admin) {
                return res.status(403).json({
                    status: false,
                    message: 'Invalid token',
                });
            }

            req.adminId = adminId;
            req.requestId = adminId;
            next();
        }
    } catch (err) {
        return res.status(403).json({
            status: false,
            message: 'Invalid token',
        });
    }
};

