const {
    errorResponse,
    successResponse,
    errorHandler,
} = require('../helpers/apiResponse');
const UserAppScreenModel = require('../models/UserAppScreenModel');

exports.getUserAppScreens = async (req, res) => {
    try {
        const { searchKey, sortBy = 'asc', screen, status } = req.query;

        let whereConfig = {};

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const titleSearchQuery = newQuery.map(str => ({
                title: RegExp(str, 'i'),
            }));
            const sectionSearchQuery = newQuery.map(str => ({
                section: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: titleSearchQuery },
                            { $and: sectionSearchQuery },
                        ],
                    },
                ],
            };
        }

        if (
            screen &&
            [
                'home',
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
            ].includes(screen)
        ) {
            whereConfig = {
                screen,
                ...whereConfig,
            };
        }

        if (
            screen &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                screen
            )
        ) {
            whereConfig = {
                shopType: screen,
                ...whereConfig,
            };
        }

        if (status && ['active', 'inactive'].includes(status)) {
            whereConfig = {
                status,
                ...whereConfig,
            };
        }

        const userAppScreen = await UserAppScreenModel.find(whereConfig).sort([
            ['sortingOrder', sortBy],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'Successfully find',
            data: {
                userAppScreen,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addUserAppScreen = async (req, res) => {
    try {
        const { screen, title, shopType, section } = req.body;

        const isExist = await UserAppScreenModel.countDocuments({
            screen,
            shopType,
            section,
        });

        if (isExist)
            return errorResponse(res, 'This section has been already added.');

        const userAppScreen = await UserAppScreenModel.create({
            screen,
            title,
            shopType,
            section,
        });

        successResponse(res, {
            message: 'Successfully added',
            data: {
                userAppScreen,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateUserAppScreen = async (req, res) => {
    try {
        const { id, title, status } = req.body;

        const isExist = await UserAppScreenModel.findOne({
            _id: id,
        });

        if (!isExist) return errorResponse(res, 'UserApp screen not found');

        await UserAppScreenModel.updateOne(
            { _id: id },
            {
                $set: {
                    title,
                    status,
                },
            }
        );

        const userAppScreen = await UserAppScreenModel.findOne({ _id: id });

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                userAppScreen,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sortUserAppScreen = async (req, res) => {
    try {
        const { list } = req.body;

        if (!list || list.length === 0) {
            return errorResponse(res, 'List can not be empty.');
        }

        const updatePromises = list.map(async element => {
            await UserAppScreenModel.updateOne(
                { _id: element.id },
                {
                    $set: {
                        sortingOrder: element.sortingOrder,
                    },
                }
            );
        });

        await Promise.all(updatePromises);

        const userAppScreens = await UserAppScreenModel.find().sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                userAppScreens,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteUserAppScreen = async (req, res) => {
    try {
        const { id } = req.body;

        const userAppScreen = await UserAppScreenModel.findOne({
            _id: id,
        });

        if (!userAppScreen) {
            return res.status(200).json({
                status: false,
                message: 'UserApp screen not found',
            });
        }

        await UserAppScreenModel.findByIdAndDelete(id);

        successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
