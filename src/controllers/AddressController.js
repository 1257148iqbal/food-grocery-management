const e = require('express');
const { validationResult } = require('express-validator');
const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const AddressModel = require('../models/AddressModel');
const Shops = require('../models/ShopModel');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const UserModel = require('../models/UserModel');
const ObjectId = require('mongoose').Types.ObjectId;
const SellerModel = require('../models/SellerModel');

// Add user address
exports.addUserAddress = async (req, res) => {
    try {
        const errorValidation = validationResult(req);
        if (!errorValidation.isEmpty()) {
            const errors = errorValidation.array();
            return validationError(res, errors[0].msg);
        }

        let {
            userId,
            address,
            nickname,
            apartment,
            latitude,
            longitude,
            country,
            state,
            city,
            pin,
            primary,
            note,
            tags,
            placeId,
            // new
            buildingName,
            deliveryOptions,
            addressLabel,
            instructions,
        } = req.body;

        if (!ObjectId.isValid(userId)) {
            return errorResponse(res, 'userId is invalid');
        }

        const userAddress = await AddressModel.find({ user: userId });

        if (userAddress.length > 0) {
            if (primary) {
                await AddressModel.updateMany(
                    { user: id },
                    { $set: { primary: false } }
                );
            }
        } else {
            primary = true;
        }

        const addAddress = await AddressModel.create({
            user: userId,
            address,
            nickname,
            apartment,
            latitude,
            longitude,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude],
            },
            country,
            state,
            city,
            pin,
            primary,
            note,
            tags: tags ? tags : 'home',
            placeId,
            // new
            buildingName,
            deliveryOptions,
            addressLabel,
            instructions,
        });

        await UserModel.updateOne(
            { _id: userId },
            {
                $push: {
                    address: addAddress._id,
                },
                location: primary && {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
            }
        );

        // const {
        //     status,
        //     message,
        //     address: createdAddress,
        // } = await getAddress(addAddress._id);

        successResponse(res, {
            message: 'Successfully added',
            data: {
                address: addAddress,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addUserAddressFromUserApp = async (req, res) => {
    try {
        const errorValidation = validationResult(req);
        if (!errorValidation.isEmpty()) {
            const errors = errorValidation.array();
            return validationError(res, errors[0].msg);
        }

        const userId = req.userId;

        let {
            address,
            nickname,
            apartment,
            latitude,
            longitude,
            country,
            state,
            city,
            pin,
            primary,
            note,
            tags,
            placeId,
            // new
            buildingName,
            deliveryOptions,
            addressLabel,
            instructions,
        } = req.body;

        if (!ObjectId.isValid(userId)) {
            return errorResponse(res, 'userId is invalid');
        }

        const userAddress = await AddressModel.find({ user: userId });

        if (userAddress.length > 0) {
            if (primary) {
                await AddressModel.updateMany(
                    { user: userId },
                    { $set: { primary: false } }
                );
            }
        } else {
            primary = true;
        }

        const addAddress = await AddressModel.create({
            user: userId,
            address,
            nickname,
            apartment,
            latitude,
            longitude,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude],
            },
            country,
            state,
            city,
            pin,
            primary,
            note,
            tags: tags ? tags : 'home',
            placeId,
            // new
            buildingName,
            deliveryOptions,
            addressLabel,
            instructions,
        });

        await UserModel.updateOne(
            { _id: userId },
            {
                $push: {
                    address: addAddress._id,
                },
                location: primary && {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
            }
        );

        // const address = await AddressModel.findOne({ _id: id }).populate([
        //     {
        //         path: 'user',
        //         select: '-password',
        //     },
        // ]);

        successResponse(res, {
            message: 'Successfully added',
            data: {
                address: addAddress,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateUserAddressFromUserApp = async (req, res) => {
    try {
        const userId = req.userId;

        let {
            addressId,
            address,
            nickname,
            apartment,
            latitude,
            longitude,
            country,
            state,
            city,
            pin,
            primary,
            note,
            tags,
            placeId,
            // new
            buildingName,
            deliveryOptions,
            addressLabel,
            instructions,
        } = req.body;

        if (!ObjectId.isValid(userId)) {
            return errorResponse(res, 'userId is invalid');
        }
        const checkAddress = await AddressModel.findOne({
            _id: addressId,
            user: userId,
        });

        if (!checkAddress) return errorResponse(res, 'Address not found');

        const userAddresses = await AddressModel.find({ user: userId });
        if (userAddresses.length) {
            if (primary) {
                await AddressModel.updateMany(
                    { user: userId },
                    { $set: { primary: false } }
                );
            }
        } else {
            primary = true;
        }

        await AddressModel.updateOne(
            {
                _id: addressId,
            },
            {
                address,
                nickname,
                apartment,
                latitude,
                longitude,
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                country,
                state,
                city,
                pin,
                primary,
                note,
                tags: tags ? tags : 'home',
                placeId,
                // new
                buildingName,
                deliveryOptions,
                addressLabel,
                instructions,
            }
        );

        if (primary) {
            await UserModel.updateOne(
                { _id: userId },
                {
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                }
            );
        }

        const updatedAddress = await AddressModel.findById(addressId);

        successResponse(res, {
            message: 'Successfully updated',
            data: {
                address: updatedAddress,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserAddressForUserApp = async (req, res) => {
    try {
        const userId = req.userId;

        const primaryAddress = await AddressModel.find({
            user: userId,
            deletedAt: null,
            primary: true,
        });
        const otherAddress = await AddressModel.find({
            user: userId,
            deletedAt: null,
            primary: false,
        });

        let address = [...primaryAddress, ...otherAddress];

        successResponse(res, {
            message: 'Successfully Find',
            data: {
                address: address,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAddressForUser = async (req, res) => {
    try {
        const userId = req.userId;

        const getAddress = await AddressModel.find({
            user: userId,
            deletedAt: null,
        });

        successResponse(res, {
            message: 'Successfully Get',
            data: getAddress,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

// Single user address
exports.getAllUserAddress = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!ObjectId.isValid(userId)) {
            return errorResponse(res, 'userId is invalid');
        }

        const userAddress = await AddressModel.find({
            user: userId,
            deletedAt: null,
        }).populate([
            {
                path: 'shop',
                select: '_id seller shopName shopLogo shopStatus minOrderAmount address delivery',
            },
            {
                path: 'user',
                select: '-password',
            },
            {
                path: 'seller',
                select: '-password',
            },
            {
                path: 'deliveryBoy',
                select: '-password',
            },
        ]);

        successResponse(res, {
            message: 'Successfully Find',
            data: {
                address: userAddress,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.addDeliveryAddress = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        let {
            address,
            latitude,
            longitude,
            country,
            state,
            city,
            pin,
            note,
            placeId,
        } = req.body;

        // update delivery address
        await DeliveryBoyModel.updateOne(
            { _id: deliveryBoyId },
            {
                $set: {
                    address: {
                        address,
                        location: {
                            type: 'Point',
                            coordinates: [longitude, latitude],
                        },
                        country,
                        state,
                        city,
                        pin,
                        note,
                        placeId,
                    },
                },
            }
        );

        // get delivery profile info
        const deliveryBoy = await DeliveryBoyModel.findOne({
            _id: deliveryBoyId,
        }).select('address');

        successResponse(res, {
            message: 'success',
            data: {
                address: deliveryBoy.address,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// delivery boy current address update
exports.deliveryBoyCurrentAddressUpdate = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;
        let { latitude, longitude } = req.query;

        // update delivery boy current location
        await DeliveryBoyModel.updateOne(
            { _id: deliveryBoyId },
            {
                $set: {
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                },
            }
        );

        successResponse(res, {
            message: 'Successfully update',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Update address
exports.updateAddress = async (req, res) => {
    try {
        let {
            id,
            address,
            latitude,
            longitude,
            country,
            state,
            city,
            pin,
            primary,
            note,
        } = req.body;

        const isExist = await AddressModel.findOne({ _id: id });

        if (!isExist) return errorResponse(res, 'Address not found');

        if (primary) {
            if (isExist.addressFor == 'shop') {
                await AddressModel.updateMany(
                    { shop: isExist.shop },
                    { $set: { primary: false } }
                );
            } else if (isExist.addressFor == 'user') {
                await AddressModel.updateMany(
                    { user: isExist.user },
                    { $set: { primary: false } }
                );
            } else if (isExist.addressFor == 'seller') {
                await AddressModel.updateMany(
                    { seller: isExist.seller },
                    { $set: { primary: false } }
                );
            } else if (isExist.addressFor == 'deliveryBoy') {
                await AddressModel.updateMany(
                    { deliveryBoy: isExist.deliveryBoy },
                    { $set: { primary: false } }
                );
            }
        } else {
            let list = [];

            if (isExist.addressFor == 'shop') {
                list = await AddressModel.find({ shop: isExist.shop });
            } else if (isExist.addressFor == 'user') {
                list = await AddressModel.find({ user: isExist.user });
            } else if (isExist.addressFor == 'seller') {
                list = await AddressModel.find({ seller: isExist.seller });
            } else if (isExist.addressFor == 'deliveryBoy') {
                list = await AddressModel.find({
                    deliveryBoy: isExist.deliveryBoy,
                });
            }

            // console.log(list);
            if (list.length == 0) {
                primary = true;
            } else if (list.length == 1) {
                primary = true;
            } else {
                const find = list.find(x => x.primary == true);
                if (find && find._id == id) {
                    primary = true;
                }
            }
        }

        // console.log(primary);

        await AddressModel.updateOne(
            { _id: id },
            {
                $set: {
                    address,
                    latitude,
                    longitude,
                    country,
                    state,
                    city,
                    pin,
                    primary,
                    note,
                },
            }
        );

        const {
            status,
            message,
            address: updatedAddress,
        } = await getAddress(id);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                address: updatedAddress,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deleteAddressById = async (req, res) => {
    try {
        const { id } = req.body;

        const isExist = await AddressModel.findOne({ _id: id });

        if (!isExist)
            return errorHandler(res, { message: 'Address not found' });

        await AddressModel.updateOne(
            { _id: id },
            {
                $set: {
                    deletedAt: new Date(),
                },
            }
        );

        const deleted = await AddressModel.findOne({ _id: id });

        await UserModel.updateOne(
            { _id: deleted.user },
            {
                $pull: {
                    address: id,
                },
            }
        );

        successResponse(res, {
            message: 'Successfully Deleted',
            data: {
                address: deleted,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getSingleAddress = async (req, res) => {
    try {
        const { id } = req.params;

        // 'shop userId sellerId deliveryBoyAddress'
        const { status, message, address } = await getAddress(id);

        if (!status) {
            return errorResponse(res, message);
        }

        successResponse(res, {
            message: 'Successfully Deleted',
            data: {
                address: address,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

const getAddress = async id => {
    try {
        const address = await AddressModel.findOne({ _id: id }).populate([
            {
                path: 'user',
                select: '-password',
            },
        ]);

        if (!address) {
            return {
                status: false,
                message: 'Address not found',
            };
        }

        return {
            status: true,
            message: 'success',
            address,
        };
    } catch (error) {
        return {
            status: false,
            message: error.message,
        };
    }
};
