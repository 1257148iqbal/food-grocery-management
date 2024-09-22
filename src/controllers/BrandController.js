const BrandModel = require('../models/BrandModel');
const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');

exports.getBrands = async (req, res) => {
    try {
        const brands = await BrandModel.find();
        if (!brands) return errorResponse(res, 'There is no available Brand');
        successResponse(res, {
            message: 'Successfully fetched all brands',
            data: {
                brands,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addBrand = async (req, res) => {
    try {
        const { brandName, description } = req.body;

        const newBrandData = {
            brandName,
            description,
        };

        const brands = await BrandModel.findOne({ brandName });
        if (brands)
            return errorResponse(
                res,
                'There is already a brand with the same name'
            );

        await BrandModel.create(newBrandData);

        successResponse(res, {
            message: 'Successfully added',
            data: {
                newBrandData,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editBrand = async (req, res) => {
    try {
        const { brandId, brandName, description } = req.body;

        const updatedBrand = await BrandModel.findOneAndUpdate(
            {
                _id: brandId,
            },
            {
                brandName,
                description,
            },
            {
                new: true,
            }
        );

        if (!updatedBrand)
            return errorResponse(res, 'There is no brand with the given id.');

        successResponse(res, {
            message: 'Successfully updated',
            data: {
                updatedBrand,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteBrand = async (req, res) => {
    try {
        const { brandId } = req.body;

        const deletedBrand = await BrandModel.findByIdAndDelete(brandId).exec();

        if (!deletedBrand)
            return errorResponse(res, 'There is no brand with this brandId.');

        successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
