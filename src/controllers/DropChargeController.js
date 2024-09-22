const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const { pagination } = require('../helpers/pagination');
const { addAdminLogAboutActivity } = require('./AdminController');

const GlobalDropCharge = require('../models/GlobalDropCharge');
const Seller = require('../models/SellerModel');

exports.getGlobalDropCharge = async (req, res) => {
    try {
        const charge = await GlobalDropCharge.findOne();

        return successResponse(res, {
            message: 'Global Drop Charge',
            data: {
                charge,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.setGlobalDropCharge = async (req, res) => {
    try {
        const id = req.adminId;
        const { dropPercentage, dropPercentageType } = req.body;

        if (!dropPercentage || !dropPercentageType) {
            return errorResponse(res, {
                message: 'Please provide dropPercentage and dropPercentageType',
            });
        }

        // check dropPercentageType
        if (!['percentage', 'amount'].includes(dropPercentageType)) {
            return errorResponse(res, {
                message: 'dropPercentageType must be percentage or amount',
            });
        }

        const globalCharge = await GlobalDropCharge.findOne();

        if (!globalCharge) {
            const charge = await GlobalDropCharge.create({
                dropPercentage,
                dropPercentageType,
            });

            let newParcentage = {
                dropPercentage: dropPercentage,
                dropPercentageType: dropPercentageType,
            };

            await addAdminLogAboutActivity(
                'globalDropCharge',
                id,
                newParcentage,
                0
            );

            // For updating drop percentage which seller charge type is global
            await Seller.updateMany(
                {
                    sellerChargeType: 'global',
                    deletedAt: null,
                    parentSeller: null,
                },
                { globalDropPercentage: dropPercentage }
            );

            return successResponse(res, {
                message: 'Set Global Drop Charge',
                data: {
                    charge,
                },
            });
        }

        let oldParcentage = {
            dropPercentage: globalCharge.dropPercentage,
            dropPercentageType: globalCharge.dropPercentageType,
        };
        let newParcentage = {
            dropPercentage: dropPercentage,
            dropPercentageType: dropPercentageType,
        };

        await addAdminLogAboutActivity(
            'globalDropCharge',
            id,
            newParcentage,
            oldParcentage
        );

        // update
        globalCharge.dropPercentage = dropPercentage;
        globalCharge.dropPercentageType = dropPercentageType;
        await globalCharge.save();

        // For updating drop percentage which seller charge type is global
        await Seller.updateMany(
            { sellerChargeType: 'global', deletedAt: null, parentSeller: null },
            { globalDropPercentage: dropPercentage }
        );

        return successResponse(res, {
            message: 'Update Global Drop Charge',
            data: {
                charge: globalCharge,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.setGlobalDeliveryCut = async (req, res) => {
    try {
        const id = req.adminId;
        const { deliveryRange } = req.body;
        const globalCharge = await GlobalDropCharge.findOne();
        if (!globalCharge) {
            const charge = await GlobalDropCharge.create({
                deliveryRange: deliveryRange,
            });
            await addAdminLogAboutActivity(
                'globalDeliveryCut',
                id,
                deliveryRange,
                0
            );
            return successResponse(res, {
                message: 'Set Global Drop Charge',
                data: {
                    charge,
                },
            });
        }

        await addAdminLogAboutActivity(
            'globalDeliveryCut',
            id,
            deliveryRange,
            globalCharge.deliveryRange
        );

        // update
        globalCharge.deliveryRange = deliveryRange;
        await globalCharge.save();

        successResponse(res, {
            message: 'Update Global Drop Charge',
            data: {
                charge: globalCharge,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.setGlobalDeliveryCutForButler = async (req, res) => {
    try {
        const id = req.adminId;
        const { deliveryRangeButler } = req.body;
        const globalCharge = await GlobalDropCharge.findOne();
        if (!globalCharge) {
            const charge = await GlobalDropCharge.create({
                deliveryRangeButler: deliveryRangeButler,
            });
            await addAdminLogAboutActivity(
                'globalDeliveryCutForButler',
                id,
                deliveryRangeButler,
                0
            );
            return successResponse(res, {
                message: 'Set Global Drop Charge For Butler',
                data: {
                    charge,
                },
            });
        }

        await addAdminLogAboutActivity(
            'globalDeliveryCutForButler',
            id,
            deliveryRangeButler,
            globalCharge.deliveryRangeButler
        );

        // update
        globalCharge.deliveryRangeButler = deliveryRangeButler;
        await globalCharge.save();

        successResponse(res, {
            message: 'Update Global Drop Charge For Butler',
            data: {
                charge: globalCharge,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sellerDropChargeReset = async (req, res) => {
    try {
        const id = req.adminId;
        const { sellerId } = req.body;
        const seller = await Seller.findById(sellerId);
        if (!seller) {
            return errorResponse(res, {
                message: 'Seller not found',
            });
        }

        let oldParcentage = {
            dropPercentage: seller.dropPercentage,
            dropPercentageType: seller.dropPercentageType,
        };

        const globalCharge = await GlobalDropCharge.findOne();

        let newParcentage = {
            dropPercentage: globalCharge.dropPercentage,
            dropPercentageType: globalCharge.dropPercentageType,
        };

        addAdminLogAboutActivity(
            'sellerDropChargeReset',
            id,
            newParcentage,
            oldParcentage
        );

        seller.dropPercentage = null;
        seller.dropPercentageType = globalCharge?.dropPercentageType;
        seller.sellerChargeType = 'global';
        seller.globalDropPercentage = globalCharge?.dropPercentage;

        await seller.save();

        return successResponse(res, {
            message: 'Seller Drop Charge Reset',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getGlobalDropChargeSeller = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'desc',
            pagingRange = 5,
            percentage,
            dropPercentageType,
        } = req.query;

        // check dropPercentage not null
        let whereConfig = {
            deletedAt: null,
            parentSeller: null,
            dropPercentage: {
                $ne: null,
            },
        };

        let paginate = await pagination({
            page,
            pageSize,
            model: Seller,
            condition: whereConfig,
            pagingRange,
        });

        const list = await Seller.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .select('-password');

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                sellers: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
