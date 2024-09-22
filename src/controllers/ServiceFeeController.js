const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const { pagination } = require('../helpers/pagination');
const { addAdminLogAboutActivity } = require('./AdminController');

const ServiceFeeModel = require('../models/ServiceFee');

exports.getServiceFee = async (req, res) => {
    try {
        const serviceFee = await ServiceFeeModel.findOne().select('serviceFee serviceFeeType');

        return successResponse(res, {
            message: 'Service Fee',
            data: {
                serviceFee: serviceFee.serviceFee,
                serviceFeeType: serviceFee.serviceFeeType
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.setServiceFee = async (req, res) => {
    try {
        const id = req.adminId;
        const { serviceFee, serviceFeeType } = req.body;

        if (serviceFee == undefined || !serviceFeeType) {
            return errorResponse(res, {
                message: 'Please provide serviceFee and serviceFeeType',
            });
        }

        // check serviceFeeType
        if (!['percentage', 'amount'].includes(serviceFeeType)) {
            return errorResponse(res, {
                message: 'serviceFeeType must be percentage or amount',
            });
        }

        let newFee = {
            serviceFee: serviceFee,
            serviceFeeType: serviceFeeType,
        };

        const serviceFeeDocument = await ServiceFeeModel.findOne();

        if (!serviceFeeDocument) {
            await ServiceFeeModel.create({
                serviceFee,
                serviceFeeType,
            });

            await addAdminLogAboutActivity(
                'setServiceFee',
                id,
                newFee,
                0
            );

            return successResponse(res, {
                message: 'Set Service Fee',
                data: {
                    newFee,
                },
            });
        }

        let oldFee = {
            serviceFee: serviceFeeDocument.serviceFee,
            serviceFeeType: serviceFeeDocument.serviceFeeType,
        };

        await addAdminLogAboutActivity(
            'setServiceFee',
            id,
            newFee,
            oldFee
        );

        // update
        serviceFeeDocument.serviceFee = serviceFee;
        serviceFeeDocument.serviceFeeType = serviceFeeType;
        await serviceFeeDocument.save();


        return successResponse(res, {
            message: 'Updated Service Fee',
            data: {
                newFee
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deductServiceFeePercentage = async (baseCurrency, secondaryCurrency) => {

    const serviceFee = await ServiceFeeModel.findOne().select('serviceFee');

    baseCurrency = (baseCurrency * (100 - serviceFee.serviceFee)) / 100
    secondaryCurrency = (secondaryCurrency * (100 - serviceFee.serviceFee)) / 100

    return {
        baseCurrency,
        secondaryCurrency
    }
}