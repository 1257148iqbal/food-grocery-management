const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const RatingSetting = require('../models/RatingSettingModel');

exports.getRatingSettingForAdmin = async (req, res) => {
    try {
        const { rating, type } = req.query;

        let config = {};

        if (rating) {
            config = { ...config, rating };
        }
        if (type && ['shop', 'deliveryBoy'].includes(type)) {
            config = { ...config, type };
        }

        const ratingSetting = await RatingSetting.find(config);

        successResponse(res, {
            message: 'Successfully find rating setting',
            data: {
                ratingSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.getRatingSettingForUserApp = async (req, res) => {
//     try {
//         const { rating } = req.query;

//         let config = {};

//         if ([1, 2, 3, 4, 5].includes(rating)) {
//             config = { type };
//         }

//         const ratingSetting = await RatingSetting.find(config);

//         successResponse(res, {
//             message: 'Successfully find rating setting',
//             data: {
//                 ratingSetting,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };

exports.addRatingSetting = async (req, res) => {
    try {
        const { rating, type, tags } = req.body;

        const ratingSetting = await RatingSetting.findOne({ rating, type });

        let newRatingSetting;

        if (!ratingSetting) {
            newRatingSetting = await RatingSetting.create({
                rating,
                type,
                tags,
            });
        } else {
            const newTags = [...ratingSetting.tags, ...tags];
            ratingSetting.tags = newTags;
            newRatingSetting = await ratingSetting.save();
        }

        successResponse(res, {
            message: 'Successfully added rating setting',
            data: {
                ratingSetting: newRatingSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editRatingSetting = async (req, res) => {
    try {
        const { id, rating, type, tags } = req.body;

        // check id
        const checkRatingSetting = await RatingSetting.findById(id);

        if (!checkRatingSetting) {
            return errorResponse(res, 'Rating Setting not found');
        }

        await RatingSetting.updateOne(
            {
                _id: id,
            },
            {
                $set: {
                    rating,
                    type,
                    tags,
                },
            }
        );

        const ratingSetting = await RatingSetting.findById(id);

        successResponse(res, {
            message: 'Successfully updated rating setting',
            data: {
                ratingSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteRatingSetting = async (req, res) => {
    try {
        const { id } = req.body;

        await RatingSetting.findByIdAndDelete(id);

        successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
