const { validationResult } = require('express-validator');
const {
    successResponseWithData,
    errorResponse,
    validationError,
    successResponse,
} = require('../helpers/apiResponse');
const CuisinesModel = require('../models/CuisinesModel');
const ObjectId = require('mongoose').Types.ObjectId;

// Get cuisines

exports.getCuisines = async (req, res) => {
    try {
        const cuisines = await CuisinesModel.find({ deletedAt: null });

        successResponse(res, {
            message: 'Successfully find',
            data: {
                cuisines: cuisines,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

// Add Cuisines

exports.addCuisines = async (req, res) => {
    try {
        const errorValidation = validationResult(req);
        if (!errorValidation.isEmpty()) {
            const errors = errorValidation.array();
            return validationError(res, errors[0].msg);
        }

        const { name, status } = req.body;

        const cuisines = await CuisinesModel.create({
            name,
            status,
        });

        successResponse(res, {
            message: 'Successfully added',
            data: {
                cuisines: cuisines,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

// update cuisines

exports.updateCuisines = async (req, res) => {
    try {
        const errorValidation = validationResult(req);
        if (!errorValidation.isEmpty()) {
            const errors = errorValidation.array();
            return validationError(res, errors[0].msg);
        }
        const { id, name, status } = req.body;

        const isExist = await CuisinesModel.findOne({
            _id: id,
            deletedAt: null,
        });

        if (!isExist) return errorResponse(res, 'Cuisines not found');

        await CuisinesModel.updateOne(
            { _id: id },
            {
                $set: {
                    name,
                    status,
                },
            }
        );

        const cuisines = await CuisinesModel.findOne({ _id: id });

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                cuisines,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

// Delete cuisines

exports.deleteCuisines = async (req, res) => {
    try {
        const { id } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(200).json({
                status: false,
                message: 'id is invalid',
            });
        }

        const cuisines = await CuisinesModel.findOne({
            _id: id,
            deletedAt: null,
        });

        if (!cuisines) {
            return res.status(200).json({
                status: false,
                message: 'Cuisiness not found',
            });
        }

        await CuisinesModel.updateOne({ _id: id }, { deletedAt: new Date() });

        return res.status(200).json({
            status: true,
            message: 'Cuisines Successfully Deleted',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
