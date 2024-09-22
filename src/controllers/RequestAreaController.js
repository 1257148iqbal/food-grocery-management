const e = require('express');
const {
    successResponse,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const RequestAreaModel = require('../models/RequestAreaModel');
const { pagination } = require('../helpers/pagination');
const moment = require('moment');
const NotificationsModel = require('../models/NotificationsModel');

exports.getRequestNewAreas = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'desc',
            startDate,
            endDate,
        } = req.query;

        let whereConfig = {};

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            whereConfig = {
                ...whereConfig,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: RequestAreaModel,
            condition: whereConfig,
            pagingRange,
        });

        const areas = await RequestAreaModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate('user');

        successResponse(res, {
            message: 'Successfully Find',
            data: {
                areas,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getRequestNewAreaById = async (req, res) => {
    try {
        const { id } = req.query;

        const area = await RequestAreaModel.findOne({ _id: id }).populate(
            'user'
        );

        if (!area) return errorResponse(res, 'Request New Area not found');

        successResponse(res, {
            message: 'Successfully Find',
            data: {
                area,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.sendRequestNewArea = async (req, res) => {
    try {
        let { user, address, latitude, longitude, country, state, city } =
            req.body;

        const area = await RequestAreaModel.create({
            user,
            address,
            latitude,
            longitude,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude],
            },
            country,
            state,
            city,
        });

        if (area) {
            await NotificationsModel.create({
                title: 'You got a request for new area!',
                description: `User request to you for ${address}`,
                descriptionHtml: '',
                image: '',
                type: 'global',
                accountType: 'admin',
                requestArea: area._id,
                clickable: true,
            });
        }

        successResponse(res, {
            message: 'Successfully send request for new area',
            data: {
                area,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteRequestNewAreaById = async (req, res) => {
    try {
        const { id } = req.body;

        const isExist = await RequestAreaModel.findOne({ _id: id });

        if (!isExist) return errorResponse(res, 'Request New Area not found');

        await RequestAreaModel.findByIdAndDelete(id);

        successResponse(res, {
            message: 'Successfully Deleted',
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};
