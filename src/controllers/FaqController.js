const FaqModel = require('../models/FaqModel');
const { successResponse, errorResponse } = require('../helpers/apiResponse');
const { pagination } = require('../helpers/pagination');
const moment = require('moment');
const AppSetting = require('../models/AppSetting');

exports.addFaq = async (req, res) => {
    try {
        const { question, ans, type } = req.body;

        if (!question || !ans || !type) {
            errorResponse(res, 'Validation error');
        }

        const faq = await FaqModel.create({
            question,
            ans,
            type,
        });

        successResponse(res, {
            message: 'Successfully added',
            data: faq,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.updateFaq = async (req, res) => {
    try {
        const { id, question, ans, type, status } = req.body;

        await FaqModel.updateOne(
            { _id: id },
            {
                question,
                ans,
                type,
                status,
            }
        );

        const faq = await FaqModel.findById(id);

        successResponse(res, {
            message: 'Successfully Updated',
            data: faq,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deleteFaq = async (req, res) => {
    try {
        const { id } = req.body;

        await FaqModel.findByIdAndDelete(id);

        successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getFaq = async (req, res) => {
    try {
        const {
            type,
            status,
            page = 1,
            pageSize = 50,
            pagingRange = 50,
            searchKey,
            startDate,
            endDate,
        } = req.query;

        let config = {};

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const questionSearchQuery = newQuery.map(str => ({
                question: RegExp(str, 'i'),
            }));
            config = {
                ...config,
                $and: [
                    {
                        $or: [{ $and: questionSearchQuery }],
                    },
                ],
            };
        }

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            config = {
                ...config,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        if (type && ['user', 'shop', 'deliveryBoy'].includes(type)) {
            config = {
                ...config,
                type,
            };
        }
        if (status && ['active', 'inactive'].includes(status)) {
            config = {
                ...config,
                status,
            };
        }

        var paginate = await pagination({
            page,
            pageSize,
            model: FaqModel,
            condition: config,
            pagingRange,
        });

        const list = await FaqModel.find(config)
            .sort([
                ['sortingOrder', 'asc'],
                ['createdAt', -1],
            ])
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully Find',
            data: {
                list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.singleFaq = async (req, res) => {
    try {
        const { id } = req.query;

        const faq = await FaqModel.findById(id);

        successResponse(res, {
            message: 'Successfully find',
            data: faq,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getFaqForUserApp = async (req, res) => {
    try {
        const { page = 1, pageSize = 50, pagingRange = 50 } = req.query;
    
        let config = {
            type: 'user',
            status: 'active',
        };
    
        var paginate = await pagination({
            page,
            pageSize,
            model: FaqModel,
            condition: config,
            pagingRange,
        });
    
        const list = await FaqModel.find(config)
            .sort([
                ['sortingOrder', 'asc'],
                ['createdAt', -1],
            ])
            .skip(paginate.offset)
            .limit(paginate.limit);
    
        successResponse(res, {
            message: 'Successfully Find',
            data: {
                list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    } 
}; 

exports.getFaqForShopApp = async (req, res) => {
    try {
        const { page = 1, pageSize = 50, pagingRange = 50 } = req.query;

        let config = {
            type: 'shop',
            status: 'active',
        };

        var paginate = await pagination({
            page,
            pageSize,
            model: FaqModel,
            condition: config,
            pagingRange,
        });

        const list = await FaqModel.find(config)
            .sort([
                ['sortingOrder', 'asc'],
                ['createdAt', -1],
            ])
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully Find',
            data: {
                list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getFaqForDeliveryApp = async (req, res) => {
    try {
        const { page = 1, pageSize = 50, pagingRange = 50 } = req.query;

        let config = {
            type: 'deliveryBoy',
            status: 'active',
        };

        var paginate = await pagination({
            page,
            pageSize,
            model: FaqModel,
            condition: config,
            pagingRange,
        });

        const list = await FaqModel.find(config)
            .sort([
                ['sortingOrder', 'asc'],
                ['createdAt', -1],
            ])
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully Find',
            data: {
                list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.sortFaq = async (req, res) => {
    try {
        const { faqs } = req.body;

        faqs?.forEach(async faq => {
            await FaqModel.updateOne(
                { _id: faq.id },
                {
                    $set: {
                        sortingOrder: faq.sortingOrder,
                    },
                }
            );
        });

        const updatedFaqs = await FaqModel.find().sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                faqs: updatedFaqs,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
