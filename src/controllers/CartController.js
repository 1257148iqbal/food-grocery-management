const { getUserBalance } = require('../helpers/BalanceQuery');
const {
    errorHandler,
    successResponse,
    errorResponse,
    scriptResponse,
} = require('../helpers/apiResponse');
const AddressModel = require('../models/AddressModel');
const CardModel = require('../models/CardModel');
const CartModel = require('../models/CartModel');
const TransactionModel = require('../models/TransactionModel');
const moment = require('moment');
const short = require('short-uuid');
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const SECRET_KEY = process.env.SECRET_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const Flutterwave = require('flutterwave-node-v3');
const FlutterTransaction = require('../models/FlutterTransaction');
const flw = new Flutterwave(PUBLIC_KEY, SECRET_KEY);
const open = require('open');
const useragent = require('useragent');
const { exec } = require('child_process');
const ShopModel = require('../models/ShopModel');
const UserModel = require('../models/UserModel');
const {
    pushNotificationForGroupCart,
    pushNotificationForDeleteCart,
} = require('./NotificationController');
const { checkOrderDistance } = require('./OrderController');
const ZoneModel = require('../models/ZoneModel');
const { checkShopOpeningHours } = require('../helpers/checkShopOpeningHours');
const ProductModel = require('../models/ProductModel');
const { applyExchangeRateInOrderSummary } = require('../helpers/orderHelper');
const OrderModel = require('../models/OrderModel');
const ButlerModel = require('../models/ButlerModel');
const {
    checkPlusUserProductMarketing,
    checkPlusUserMarketing,
} = require('../helpers/checkPlusUserMarketing');
const AreebaCardModel = require('../models/AreebaCardModel');
const { areebaPaymentGateway } = require('../lib/areebaPaymentGateway');
const CartPaymentRequestModel = require('../models/CartPaymentRequestModel');
const OrderRequestModel = require('../models/OrderRequestModel');
const ObjectId = require('mongoose').Types.ObjectId;

exports.getCartsForUserApp = async (req, res) => {
    try {
        const userId = req.userId;
        const plusUser = req.plusUser;

        let config = {
            cartItems: {
                $elemMatch: {
                    user: userId,
                },
            },
            deletedAt: null,
        };

        let carts = await CartModel.find(config)
            .populate([
                {
                    path: 'cartItems.user',
                },
                {
                    path: 'cartItems.products.product',
                    populate: [
                        {
                            path: 'category',
                        },
                        {
                            path: 'subCategory',
                        },
                        {
                            path: 'addons',
                            populate: [
                                {
                                    path: 'category',
                                },
                                {
                                    path: 'subCategory',
                                },
                            ],
                        },
                        {
                            path: 'marketing',
                        },
                        {
                            path: 'shop',
                            populate: 'address cuisineType marketings',
                        },
                        {

                            path: 'attributes',
                            populate: {
                                path: 'items',
                                 model: 'attributeItems',
                             },

                        },
                    ],
                },
                {
                    path: 'creator',
                },
                {
                    path: 'deliveryAddress',
                },
                {
                    path: 'shop',
                    populate: 'address cuisineType marketings',
                },
            ])
            .sort({ createdAt: 'desc' });

        for (const cart of carts) {
            if (cart.shop) {
                const isShopOpen = checkShopOpeningHours(cart.shop);
                cart.shop._doc.isShopOpen = isShopOpen;

                if (!plusUser) {
                    await checkPlusUserMarketing(cart.shop, true);
                }
            }

            if (!plusUser) {
                for (const item of cart.cartItems) {

                    // Filter out products with a non-null deletedAt field

                    item.products = item.products.filter(product => !product.product.deletedAt);
        
                    // Perform necessary operations on remaining products
                    
                    const promises = item.products.map(async (product) => {
                        await checkPlusUserMarketing(product.product.shop, true);
                        await checkPlusUserProductMarketing(product.product);
                    });
        
                    await Promise.all(promises);
                }
            }
        }

        successResponse(res, {
            message: 'Find all carts successfully',
            data: {
                carts,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSpecificShopCart = async (req, res) => {
    try {
        const userId = req.userId;
        const plusUser = req.plusUser;
        const { shopId } = req.query;

        if (!shopId) return errorResponse(res, 'shopId is required');

        let config = {
            shop: shopId,
            cartItems: {
                $elemMatch: {
                    user: userId,
                },
            },
            deletedAt: null,
        };

        let cart = await CartModel.findOne(config).populate([
            {
                path: 'cartItems.user',
            },
            {
                path: 'cartItems.products.product',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'addons',
                        populate: [
                            {
                                path: 'category',
                            },
                            {
                                path: 'subCategory',
                            },
                        ],
                    },
                    {
                        path: 'marketing',
                    },
                ],
            },
            {
                path: 'creator',
            },
            {
                path: 'deliveryAddress',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
            },
        ]);

        if (!cart) return errorResponse(res, 'Cart not found');

        const isShopOpen = checkShopOpeningHours(cart.shop);
        cart.shop._doc.isShopOpen = isShopOpen;

        if (!plusUser) {
            await checkPlusUserMarketing(cart.shop, true);

            for (const item of cart.cartItems) {
                for (const product of item.products) {
                    await checkPlusUserProductMarketing(product.product);
                }
            }
        }

        successResponse(res, {
            message: 'Find cart successfully',
            data: {
                cart,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getCartByID = async (req, res) => {
    try {
        const userId = req.userId;
        const plusUser = req.plusUser;

        const { cartId } = req.query;
        let joinable = true;

        if (!cartId) return errorResponse(res, 'cartId is required');

        let config = {
            _id: cartId,
            deletedAt: null,
        };

        let cart = await CartModel.findOne(config).populate([
            {
                path: 'cartItems.user',
            },
            {
                path: 'cartItems.products.product',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'addons',
                        populate: [
                            {
                                path: 'category',
                            },
                            {
                                path: 'subCategory',
                            },
                        ],
                    },
                    {
                        path: 'marketing',
                    },
                    {
                        path: 'shop',
                        populate: 'address cuisineType marketings',
                    },
                ],
            },
            {
                path: 'creator',
            },
            {
                path: 'deliveryAddress',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
            },
        ]);

        if (!cart) return errorResponse(res, 'Cart not found');

        let userCart = await CartModel.findOne({
            shop: cart.shop._id,
            cartItems: {
                $elemMatch: {
                    user: userId,
                },
            },
            deletedAt: null,
        });

        if (userCart) {
            joinable = false;
        }

        const isShopOpen = checkShopOpeningHours(cart.shop);
        cart.shop._doc.isShopOpen = isShopOpen;

        if (!plusUser) {
            await checkPlusUserMarketing(cart.shop, true);

            for (const item of cart.cartItems) {
                for (const product of item.products) {
                    await checkPlusUserMarketing(product.product.shop, true);
                    await checkPlusUserProductMarketing(product.product);
                }
            }
        }

        successResponse(res, {
            message: 'Find cart successfully',
            data: {
                cart,
                joinable,
                message: `Your order contains items from ${cart.shop.name}. By joining the group order, these items will be removed.`,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editCartForUserApp = async (req, res) => {
    try {
        const userId = req.userId;
        const plusUser = req.plusUser;
        let {
            name,
            creator,
            shop,
            cartType,
            cartStatus,
            cartItems,
            deliveryAddress,
            orderDeadline,
            paymentPreferences,
            deliveryFeePreferences,
            maxAmountPerGuest,
            blockList,
            specialInstruction,
            scheduleDate,
            hasCartStatusChanged,
            hasOrderDeadlineChanged
        } = req.body;

        const existingUser = await UserModel.findOne({ _id: userId });
        if (!existingUser) return errorResponse(res, 'User not found');

        const isExistCreator = await UserModel.findOne({ _id: creator });

        if (!isExistCreator) return errorResponse(res, 'Creator not found');

        const isExistShop = await ShopModel.findOne({ _id: shop });

        if (!isExistShop) return errorResponse(res, 'Shop not found');

        if (cartType === 'group') {
            if (isExistCreator.status !== 'active')
                return errorResponse(
                    res,
                    `Your account is ${isExistCreator.status}. Please contact support.`
                );

            const isExistAddress = await AddressModel.findOne({
                _id: deliveryAddress,
            });

            if (!isExistAddress) return errorResponse(res, 'Address not found');
        }

        let cart = await CartModel.findOne({
            shop: shop,
            cartItems: {
                $elemMatch: {
                    user: userId,
                },
            },
            deletedAt: null,
        });

        if (cart && cartType === 'individual') {
            if (cartItems[0]?.products?.length < 1) {
                await CartModel.findByIdAndDelete(cart._id);

                successResponse(res, {
                    message: 'Cart deleted successfully',
                });
            }
        }

        if (cart == null) {
            cart = new CartModel({
                creator,
                shop,
                image: isExistShop.shopBanner,
            });
        }
        if (name) {
            cart.name = name;
        }

        if (cartType) {
            cart.cartType = cartType;
        }

        if (cartStatus) {
            cart.cartStatus = cartStatus;
        }

        if (cartItems?.length > 0) {
            cart.cartItems = cartItems;
        }

        if (deliveryAddress) {
            cart.deliveryAddress = deliveryAddress;
        }

        if (orderDeadline) {
            cart.orderDeadline = orderDeadline;
        }

        if (paymentPreferences) {
            cart.paymentPreferences = paymentPreferences;
        }

        if (deliveryFeePreferences) {
            cart.deliveryFeePreferences = deliveryFeePreferences;
        }

        if (maxAmountPerGuest >= 0) {
            cart.maxAmountPerGuest = maxAmountPerGuest;
        }

        if (blockList?.length > 0) {
            cart.blockList = blockList;
        }

        if ([true, false].includes(specialInstruction)) {
            cart.specialInstruction = specialInstruction;
        }

        if (scheduleDate) {
            cart.scheduleDate = scheduleDate;
        }

        await cart.save();

        let updateCart = await CartModel.findOne({
            _id: cart._id,
        }).populate([
            {
                path: 'cartItems.user',
            },
            {
                path: 'cartItems.products.product',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'addons',
                        populate: [
                            {
                                path: 'category',
                            },
                            {
                                path: 'subCategory',
                            },
                        ],
                    },
                    {
                        path: 'marketing',
                    },
                ],
            },
            {
                path: 'creator',
            },
            {
                path: 'deliveryAddress',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
            },
        ]);

        if (maxAmountPerGuest && updateCart?.cartItems?.length)
            await pushNotificationForGroupCart(
                updateCart,
                existingUser,
                'update',
                [],
                `${existingUser.name} has changed th payment limit to ${maxAmountPerGuest}`
            );
        if(hasCartStatusChanged){
            await pushNotificationForGroupCart(
                updateCart,
                existingUser,
                'update',
                [],
                `The group order basket has been ${cartStatus}. ${cartStatus === 'lock' ?  'No further' : '' } items can be added to your order`
            );
        }
        if(hasOrderDeadlineChanged){
            await pushNotificationForGroupCart(
                updateCart,
                existingUser,
                'update',
                [],
               `The order deadline has been changed to ${moment(orderDeadline?.date).format('DD-MM-YYYY HH:mm')} . Please ensure you place your order before this new deadline.`
            );
        }
        const isShopOpen = checkShopOpeningHours(updateCart.shop);
        updateCart.shop._doc.isShopOpen = isShopOpen;

        if (!plusUser) {
            await checkPlusUserMarketing(updateCart.shop, true);

            for (const item of updateCart.cartItems) {
                for (const product of item.products) {
                    await checkPlusUserProductMarketing(product.product);
                }
            }
        }

        successResponse(res, {
            message: 'Cart updated successfully',
            data: {
                cart: updateCart,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addItemToCartForUserApp = async (req, res) => {
    try {
        
        
        const { userId, shopId, products } = req.body;
        const selfId = req.userId;
        const plusUser = req.plusUser;

        if (!userId || !shopId)
            return errorResponse(res, 'userId and shopId  is required');

        const user = await UserModel.findOne({
            _id: userId,
            deletedAt: null,
        });
        if (!user) return errorResponse(res, 'User not found');

        const isExistShop = await ShopModel.findById(shopId);
        if (!isExistShop) return errorResponse(res, 'Shop not found');

        let cart = await CartModel.findOne({
            shop: shopId,
            'cartItems.user': userId,
            deletedAt: null,
        });

        if (
            cart &&
            cart.cartType === 'individual' &&
            (!products || products?.length < 1)
        ) {
            await CartModel.findByIdAndDelete(cart._id);
            return successResponse(res, {
                message: 'Cart deleted successfully',
            });
        }

        if (!cart) {
            cart = new CartModel({
                creator: userId,
                shop: shopId,
                cartType: 'individual',
                cartStatus: 'unlock',
                cartItems: [{ user: userId, products: [] }],
                image: isExistShop.shopBanner,
            });
        }

        if (
            selfId.toString() !== userId.toString() &&
            selfId.toString() !== cart.creator.toString()
        ) {
            return errorResponse(res, 'You are not eligible');
        }

        let isProductError = false;

        let isOutOfStock = false;
        let isMaxLimitExceeded = false;
        let isUnvailable = false;

        let errorProduct = [];
        const newProducts = [];

        if (products) {
            for (const element of products) {
                //Checking product info
                const product = await ProductModel.findById(element.product);

                if (!product) {
                    // isProductError = true;
                    continue;
                }

                if (
                    product.orderQuantityLimit > 0 &&
                    product.orderQuantityLimit < element.quantity
                ) {
                    isMaxLimitExceeded = true;
                    // isProductError = true;
                    errorProduct.push(product.name);
                    element.quantity = product.orderQuantityLimit;
                }

                if (
                    product.isStockEnabled &&
                    product.stockQuantity < element.quantity
                ) {
                    isMaxLimitExceeded = true;
                    // isProductError = true;
                    errorProduct.push(product.name);
                    element.quantity = product.stockQuantity;
                }

                if (
                    product.status !== 'active' || // product is not available
                    !product.productVisibility // product is not available
                ) {
                    isUnvailable = true;
                    errorProduct.push(product.name);
                    continue;
                }

                // if (!product.isStockEnabled && product.stockQuantity < 1) {
                if (product.stockQuantity < 1) {
                    // outOfStock
                    isOutOfStock = true;
                    // isProductError = true;
                    errorProduct.push(product.name);
                    continue;
                }

                newProducts.push(element);
            }

           

            // For finding reward product
            const newProductsWithIndex = newProducts.map((product, index) => {
                return { ...product, productIndex: index };
            });

            const userCartIndex = cart.cartItems.findIndex(
                item => item.user.toString() === userId.toString()
            );
            cart.cartItems[userCartIndex].products = newProductsWithIndex;
        }

        console.log('cart info',cart.cartItems[0].products);

        await cart.save();

        const updateCart = await CartModel.findById(cart._id).populate([
            {
                path: 'cartItems.user',
            },
            {
                path: 'cartItems.products.product',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'addons',
                        populate: [
                            {
                                path: 'category',
                            },
                            {
                                path: 'subCategory',
                            },
                        ],
                    },
                    {
                        path: 'marketing',
                    },
                ],
            },
            {
                path: 'creator',
            },
            {
                path: 'deliveryAddress',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
            },
        ]);

        if (updateCart?.creator?._id?.toString() !== selfId?.toString()) {
            await pushNotificationForGroupCart(cart, user, 'addItem');
        }

        updateCart.shop._doc.isShopOpen = checkShopOpeningHours(
            updateCart.shop
        );

        if (!plusUser) {
            await checkPlusUserMarketing(updateCart.shop, true);

            for (const item of updateCart.cartItems) {
                for (const product of item.products) {
                    await checkPlusUserProductMarketing(product.product);
                }
            }
        }

        // Create error message
        // errorProduct = [...new Set(errorProduct)];
        // const errorMessage =
        //     errorProduct.length === 1
        //         ? `${errorProduct[0]} is not available`
        //         : errorProduct.length > 1
        //         ? `${errorProduct
        //               .slice(0, -1)
        //               .join(', ')} and ${errorProduct.slice(
        //               -1
        //           )} are not available`
        //         : '';

        // const errorMessage = isProductError
        //     ? 'You have reached the maximum quantity per this item'
        //     : '';

        // let errorMessage = '';

        const errorMessage = isOutOfStock
            ? 'The product is out of stock'
            : isMaxLimitExceeded
            ? 'You have reached the maximum quantity per this item'
            : isUnvailable
            ? 'The product is not available'
            : '';

        // if(isOutOfStock)                errorMessage = 'The product is out of stock';
        // else if (isMaxLimitExceeded)    errorMessage = 'You have reached the maximum quantity per this item';
        // else if (isUnvailable)          errorMessage = 'The product is not available';
        isProductError = isOutOfStock || isMaxLimitExceeded || isUnvailable;
        // If individual cart and all products are error then remove cart
        if (updateCart.cartType === 'individual' && newProducts?.length < 1) {
            await CartModel.findByIdAndDelete(updateCart._id);

            return successResponse(res, {
                message: 'Cart deleted successfully',
                data: {
                    isProductError,
                    errorMessage,
                },
            });
        }

        successResponse(res, {
            message: 'Cart updated successfully',
            data: {
                cart: updateCart,
                isProductError,
                errorMessage,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateExtraInfoCartForUserApp = async (req, res) => {
    try {
        const userId = req.userId;
        const plusUser = req.plusUser;
        let {
            cartId,
            cartRiderTip,
            cartCouponDiscountAmount,
            rewardProductIndex,
        } = req.body;

        let cart = await CartModel.findById(cartId);

        if (!cart) return errorResponse(res, 'Cart not found');

        if (cartRiderTip) {
            cart.cartRiderTip = cartRiderTip;
        }

        if (cartCouponDiscountAmount || cartCouponDiscountAmount === 0) {
            cart.cartCouponDiscountAmount = cartCouponDiscountAmount;
        }

        if (rewardProductIndex) {
            const cartItem = cart?.cartItems?.find(
                item => item.user.toString() === userId.toString()
            );
            const product = cartItem.products.find(
                product => product.productIndex === rewardProductIndex
            );

            product.rewardApplied = true;
        }

        await cart.save();

        let updateCart = await CartModel.findOne({
            _id: cart._id,
        }).populate([
            {
                path: 'cartItems.user',
            },
            {
                path: 'cartItems.products.product',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'addons',
                        populate: [
                            {
                                path: 'category',
                            },
                            {
                                path: 'subCategory',
                            },
                        ],
                    },
                    {
                        path: 'marketing',
                    },
                ],
            },
            {
                path: 'creator',
            },
            {
                path: 'deliveryAddress',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
            },
        ]);

        const isShopOpen = checkShopOpeningHours(updateCart.shop);
        updateCart.shop._doc.isShopOpen = isShopOpen;

        if (!plusUser) {
            await checkPlusUserMarketing(updateCart.shop, true);

            for (const item of updateCart.cartItems) {
                for (const product of item.products) {
                    await checkPlusUserProductMarketing(product.product);
                }
            }
        }

        successResponse(res, {
            message: 'Cart updated successfully',
            data: {
                cart: updateCart,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateReadyStatusForUserApp = async (req, res) => {
    try {
        const userId = req.userId;
        const plusUser = req.plusUser;
        let { cartId, isReady } = req.body;

        let user = await UserModel.findOne({
            _id: userId,
            deletedAt: null,
        });

        if (!user) return errorResponse(res, 'User not found');

        let cart = await CartModel.findOne({
            _id: cartId,
            cartItems: {
                $elemMatch: {
                    user: userId,
                },
            },
            deletedAt: null,
        });

        if (!cart) return errorResponse(res, 'Cart not found');

        const userCartItem = cart?.cartItems?.find(
            item => item?.user?.toString() === userId?.toString()
        );

        userCartItem.isReady = isReady || false;

        await cart.save();

        let updateCart = await CartModel.findOne({
            _id: cartId,
        }).populate([
            {
                path: 'cartItems.user',
            },
            {
                path: 'cartItems.products.product',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'addons',
                        populate: [
                            {
                                path: 'category',
                            },
                            {
                                path: 'subCategory',
                            },
                        ],
                    },
                    {
                        path: 'marketing',
                    },
                ],
            },
            {
                path: 'creator',
            },
            {
                path: 'deliveryAddress',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
            },
        ]);

        if (isReady) {
            await pushNotificationForGroupCart(cart, user, 'ready');
        }

        const isShopOpen = checkShopOpeningHours(updateCart.shop);
        updateCart.shop._doc.isShopOpen = isShopOpen;

        if (!plusUser) {
            await checkPlusUserMarketing(updateCart.shop, true);

            for (const item of updateCart.cartItems) {
                for (const product of item.products) {
                    await checkPlusUserProductMarketing(product.product);
                }
            }
        }

        successResponse(res, {
            message: 'Cart updated successfully',
            data: {
                cart: updateCart,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.joinUserToGroupCart = async (req, res) => {
    try {
        const userId = req.userId;
        const plusUser = req.plusUser;
        let { cartId } = req.body;

        let user = await UserModel.findOne({
            _id: userId,
            deletedAt: null,
        });

        if (!user) return errorResponse(res, 'User not found');

        let cart = await CartModel.findOne({
            _id: cartId,
            deletedAt: null,
        });

        if (!cart) return errorResponse(res, 'Cart not found');

        const blockListString = cart?.blockList?.map(user => user.toString());

        if (blockListString.includes(userId.toString())) {
            return errorResponse(res, `You are in the blocklist.`);
        }

        if(cart?.cartStatus === 'lock'){
            return errorResponse(res, `This group order is currently locked by its host and not accepting new participants. 
                                        You can explore our wide selection of delicious restaurants and find something new to order.`);
        }

        let userCart = await CartModel.findOne({
            shop: cart.shop,
            cartItems: {
                $elemMatch: {
                    user: userId,
                },
            },
            deletedAt: null,
        });

        if (userCart) {
            if (userCart?.cartType === 'group') {
                return errorResponse(
                    res,
                    // `You are already join ${userCart.name} in this shop. Please leave first.`
                    `Oops! It looks like you're already a member of this group order. You can't join the same group order twice. Please continue to participate in the group order you're already a part of.`
                );
            } else {
                await CartModel.findByIdAndDelete(userCart._id);
            }
        }

        await CartModel.updateOne(
            { _id: cartId },
            {
                $push: {
                    cartItems: {
                        user: userId,
                        products: [],
                    },
                },
            }
        );

        cart = await CartModel.findOne({
            _id: cartId,
        }).populate([
            {
                path: 'cartItems.user',
            },
            {
                path: 'cartItems.products.product',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'addons',
                        populate: [
                            {
                                path: 'category',
                            },
                            {
                                path: 'subCategory',
                            },
                        ],
                    },
                    {
                        path: 'marketing',
                    },
                ],
            },
            {
                path: 'creator',
            },
            {
                path: 'deliveryAddress',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
            },
        ]);

        await pushNotificationForGroupCart(cart, user, 'join');

        const isShopOpen = checkShopOpeningHours(cart.shop);
        cart.shop._doc.isShopOpen = isShopOpen;

        if (!plusUser) {
            await checkPlusUserMarketing(cart.shop, true);

            for (const item of cart.cartItems) {
                for (const product of item.products) {
                    await checkPlusUserProductMarketing(product.product);
                }
            }
        }

        successResponse(res, {
            message: 'User joined the cart successfully',
            data: {
                cart,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.leaveUserFromGroupCart = async (req, res) => {
    try {
        let { userId, cartId } = req.body;

        let user = await UserModel.findOne({
            _id: userId,
            deletedAt: null,
        });

        if (!user) return errorResponse(res, 'User not found');

        let cart = await CartModel.findOne({
            _id: cartId,
            deletedAt: null,
        });

        if (!cart) return errorResponse(res, 'Cart not found');

        if (cart?.creator?.toString() === userId?.toString())
            return errorResponse(res, 'You are a creator');

        const userCartItem = cart?.cartItems?.find(
            item => item.user.toString() === userId.toString()
        );

        if (userCartItem.isReady)
            return errorResponse(
                res,
                'You are not eligible for leaving. Mark as not ready first.'
            );

        if (cart.cartStatus === 'lock')
            return errorResponse(
                res,
                'Cart is locked, You are not eligible for leaving.'
            );

        await CartModel.updateOne(
            { _id: cartId },
            {
                $pull: {
                    cartItems: userCartItem,
                },
            }
        );

        cart = await CartModel.findOne({
            _id: cartId,
        }).populate([
            {
                path: 'cartItems.user',
            },
            {
                path: 'cartItems.products.product',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'addons',
                        populate: [
                            {
                                path: 'category',
                            },
                            {
                                path: 'subCategory',
                            },
                        ],
                    },
                    {
                        path: 'marketing',
                    },
                ],
            },
            {
                path: 'creator',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
            },
        ]);

        await pushNotificationForGroupCart(cart, user, 'leave');

        const isShopOpen = checkShopOpeningHours(cart.shop);
        cart.shop._doc.isShopOpen = isShopOpen;

        successResponse(res, {
            message: 'User left the cart successfully',
            data: {
                cart,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.removeMultipleUserFromGroupCart = async (req, res) => {
    try {
        let { usersId, cartId } = req.body;

        let users = await UserModel.find({
            _id: { $in: usersId },
            deletedAt: null,
        });

        if (usersId.length !== users.length)
            return errorResponse(res, 'User not found');

        let cart = await CartModel.findOne({
            _id: cartId,
            deletedAt: null,
        });

        if (!cart) return errorResponse(res, 'Cart not found');

        const userCartItems = usersId.map(userId =>
            cart?.cartItems?.find(
                item => item.user.toString() === userId.toString()
            )
        );

        await CartModel.updateOne(
            { _id: cartId },
            {
                $pull: {
                    cartItems: { $in: userCartItems },
                },
            }
        );

        cart = await CartModel.findOne({
            _id: cartId,
        }).populate([
            {
                path: 'cartItems.user',
            },
            {
                path: 'cartItems.products.product',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'addons',
                        populate: [
                            {
                                path: 'category',
                            },
                            {
                                path: 'subCategory',
                            },
                        ],
                    },
                    {
                        path: 'marketing',
                    },
                ],
            },
            {
                path: 'creator',
            },
            {
                path: 'deliveryAddress',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
            },
        ]);

        await pushNotificationForGroupCart(cart, cart.creator, 'remove', users);

        const isShopOpen = checkShopOpeningHours(cart.shop);
        cart.shop._doc.isShopOpen = isShopOpen;

        successResponse(res, {
            message: 'Remove users from group cart successfully',
            data: {
                cart,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteCart = async (req, res) => {
    try {
        const userId = req.userId;

        const { cartId } = req.body;

        let user = await UserModel.findOne({
            _id: userId,
            deletedAt: null,
        });

        if (!user) return errorResponse(res, 'User not found');

        let cart = await CartModel.findOne({
            _id: cartId,
            deletedAt: null,
        }).populate([
            {
                path: 'cartItems.user',
            },
            {
                path: 'creator',
            },
        ]);

        if (!cart) return errorResponse(res, 'Cart not found');

        if (cart?.creator?._id?.toString() !== userId?.toString())
            return errorResponse(res, 'You are not a creator');

        if (cart?.cartType === 'group') {
            if (cart?.paymentPreferences !== 'pay_for_everyone') {
                cart?.cartItems?.forEach(async item => {
                    // Areeba payment gateway integration
                    if (item.isReady && item?.summary?.baseCurrency_card > 0) {
                        const newTransactionId = ObjectId();
                        const voidPutData = {
                            apiOperation: 'VOID',
                            transaction: {
                                targetTransactionId:
                                    item?.areebaCard?.transactionId,
                            },
                        };
                        const { data: voidData } = await areebaPaymentGateway(
                            item?.areebaCard?.orderId,
                            newTransactionId,
                            voidPutData
                        );
                        if (voidData?.result === 'ERROR')
                            return errorResponse(
                                res,
                                voidData?.error?.explanation
                            );
                        pushNotificationForDeleteCart(item.user._id);
                    }
                });
            }

            await CartModel.updateOne(
                { _id: cartId },
                { deletedAt: new Date() }
            );

            await pushNotificationForGroupCart(cart, user, 'delete');
        } else {
            await CartModel.findByIdAndDelete(cartId);
        }

        successResponse(res, {
            message: 'Cart deleted successfully',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.userPayWithWallet = async (req, res) => {
    try {
        const userId = req.userId;
        const plusUser = req.plusUser;
        let {
            cartId,
            summary,
            paymentMethod,
            rewardPoints,
            shopExchangeRate = 0,
            adminExchangeRate = 0,
            shopId,
        } = req.body;

        let user = await UserModel.findOne({
            _id: userId,
            deletedAt: null,
        });

        if (!user) return errorResponse(res, 'User not found');

        let cart = await CartModel.findOne({
            _id: cartId,
            deletedAt: null,
        });

        if (!cart) return errorResponse(res, 'Cart not found');

        const { secondaryCurrency_availableBalance } = await getUserBalance(
            userId
        );

        if (
            secondaryCurrency_availableBalance <
            summary.secondaryCurrency_wallet
        ) {
            return errorResponse(res, 'Insufficient wallet balance');
        }

        const shopInfo = await ShopModel.findById(shopId);
        //*** Start apply exchange rate ***/
        summary.baseCurrency_riderFeeWithFreeDelivery = 0;

        summary = applyExchangeRateInOrderSummary(
            summary,
            shopExchangeRate,
            adminExchangeRate,
            shopInfo
        );
        //*** End apply exchange rate ***/

        // const transaction = await TransactionModel.create({
        //     user: userId,
        //     amount: summary.baseCurrency_wallet,
        //     secondaryCurrency_amount: summary.secondaryCurrency_wallet,
        //     userNote: 'Order Payment Completed',
        //     adminNote: 'User order pay throw wallet for group order',
        //     account: 'user',
        //     type: 'userPayBeforeReceivedOrderByWallet',
        //     status: 'success',
        //     paidCurrency: 'baseCurrency',
        // });

        // await UserModel.updateOne(
        //     { _id: userId },
        //     {
        //         $inc: {
        //             tempBalance: -summary.baseCurrency_wallet,
        //         },
        //     }
        // );

        // // for redeem reward
        // if (summary?.reward?.baseCurrency_amount > 0) {
        //     const transactionForRedeemReward = await TransactionModel.create({
        //         autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        //         account: 'user',
        //         type: 'userRedeemRewardPoints',
        //         user: userId,
        //         amount: summary.reward.baseCurrency_amount,
        //         secondaryCurrency_amount:
        //             summary.reward.secondaryCurrency_amount,
        //         status: 'success',
        //         userNote: 'User redeem reward points for order',
        //         summary: summary,
        //         rewardPoints: summary.reward.points,
        //         paidCurrency: 'baseCurrency',
        //     });

        //     await UserModel.updateOne(
        //         { _id: userId },
        //         {
        //             $inc: {
        //                 tempRewardPoints: -summary.reward.points,
        //             },
        //         }
        //     );
        // }

        // cart?.transactionHistory?.push(transaction._id);

        const userCartItem = cart?.cartItems?.find(
            item => item?.user?.toString() === userId?.toString()
        );

        userCartItem.summary = summary;
        userCartItem.rewardPoints = rewardPoints;
        userCartItem.paymentMethod = paymentMethod;
        userCartItem.isPaid = false;
        userCartItem.isReady = true;

        await cart.save();

        let updateCart = await CartModel.findOne({
            _id: cartId,
        }).populate([
            {
                path: 'cartItems.user',
            },
            {
                path: 'cartItems.products.product',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'addons',
                        populate: [
                            {
                                path: 'category',
                            },
                            {
                                path: 'subCategory',
                            },
                        ],
                    },
                    {
                        path: 'marketing',
                    },
                ],
            },
            {
                path: 'creator',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
            },
        ]);

        await pushNotificationForGroupCart(updateCart, user, 'payment');

        const isShopOpen = checkShopOpeningHours(updateCart.shop);
        updateCart.shop._doc.isShopOpen = isShopOpen;

        if (!plusUser) {
            await checkPlusUserMarketing(updateCart.shop, true);

            for (const item of updateCart.cartItems) {
                for (const product of item.products) {
                    await checkPlusUserProductMarketing(product.product);
                }
            }
        }

        successResponse(res, {
            message: 'Payment successful',
            data: {
                cart: updateCart,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.paymentGenerate = async (req, res) => {
    try {
        const userId = req.userId;
        let {
            cartId,
            cardId,
            pin,
            amount,
            orderDeliveryAddressId,
            shopId,
            // productAmount,
            summary,
        } = req.body;

        let cart = await CartModel.findOne({
            _id: cartId,
            deletedAt: null,
        });

        if (!cart) return errorResponse(res, 'Cart not found');

        if (!orderDeliveryAddressId || !shopId) {
            return errorResponse(
                res,
                'orderDeliveryAddressId or shopId is required'
            );
        }

        if (summary?.secondaryCurrency_wallet > 0) {
            const { secondaryCurrency_availableBalance } = await getUserBalance(
                userId
            );

            if (
                secondaryCurrency_availableBalance <
                summary.secondaryCurrency_wallet
            ) {
                return errorResponse(res, 'Insufficient wallet balance');
            }
        }

        const dropOffLocation = await AddressModel.findOne({
            _id: orderDeliveryAddressId,
        });

        if (!dropOffLocation) {
            return errorResponse(res, 'dropOffLocation not found');
        }

        // Check user location zone
        const zoneConfig = {
            zoneGeometry: {
                $geoIntersects: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [
                            dropOffLocation?.longitude,
                            dropOffLocation?.latitude,
                        ],
                    },
                },
            },
            zoneStatus: 'active',
            zoneAvailability: 'online',
        };
        const zone = await ZoneModel.findOne(zoneConfig);
        if (!zone)
            return errorResponse(res, 'User address is out of our service.');

        const shop = await ShopModel.findOne({ _id: shopId });
        if (!shop) {
            return errorResponse(res, 'shop not found');
        }
        if (shop.shopStatus !== 'active' || shop.liveStatus !== 'online')
            return errorResponse(res, 'Shop is not active or online.');

        // if (productAmount < shop.minOrderAmount) {
        //     return errorResponse(
        //         res,
        //         `Your order amount must not be less than ${shop.minOrderAmount}`
        //     );
        // }

        const pickUpLocation = shop.address;

        // total distance between to place pick & drop
        // check location  shop,user
        const distanceStatus = await checkOrderDistance(
            {
                latitude: pickUpLocation?.location?.coordinates[1],
                longitude: pickUpLocation?.location?.coordinates[0],
            },
            {
                latitude: dropOffLocation?.location?.coordinates[1],
                longitude: dropOffLocation?.location?.coordinates[0],
            }
        );

        if (!distanceStatus) {
            return errorResponse(res, 'shop over delivery area');
        }

        if (!cardId) {
            return res.json({
                status: false,
                message: 'Please fill all fields',
            });
        }

        const user = await UserModel.findById(userId).select(
            'name gender phone_number email'
        );

        const card = await CardModel.findOne({ _id: cardId });

        // check pin have or not in cardModel
        if (card.pins?.length.length > 0 && !pin) {
            // get last pin
            pin = card.pins[card.pins.length - 1];
        }

        if (card.pins.length.length <= 0 && !pin) {
            return res.json({
                status: false,
                message: 'Please enter a pin',
                error_type: 'empty_pin',
            });
        }

        const tx_ref = `${moment().format('DDMMYYHmm')}${short().new()}`;

        const cardInformation = {
            card_number: card.card_number,
            cvv: card.cvv,
            expiry_month: card.expiry_month,
            expiry_year: card.expiry_year,
            currency: card.currency || 'NGN',
            amount,
            fullname: user.name,
            email: user.email,
            phone_number: user.phone_number,
            tx_ref,
            // redirect_url: null,
            enckey: ENCRYPTION_KEY,
        };

        if (card.mode === 'pin') {
            let payload2 = cardInformation;
            payload2.authorization = {
                mode: 'pin',
                // fields: ['pin'],
                pin: pin,
            };

            const reCallCharge = await flw.Charge.card(payload2);

            if (reCallCharge.status === 'error') {
                if (reCallCharge.message.includes('Invalid PIN')) {
                    return res.json({
                        status: false,
                        message: reCallCharge.message,
                        error_type: 'invalid_pin',
                    });
                }

                return res.json({
                    status: false,
                    message: reCallCharge.message,
                });
            }

            // check pin have in card.pins in mongoose
            if (card.pins.length.length > 0) {
                if (card.pins[card.pins.length - 1] !== pin) {
                    await CardModel.updateOne(
                        { _id: cardId },
                        { $push: { pins: pin } }
                    );
                }
            } else {
                // update CardModel in pin add
                await CardModel.updateOne(
                    { _id: cardId },
                    { $push: { pins: pin } }
                );
            }

            const flutterTransaction = await FlutterTransaction.create({
                user: userId,
                flutterWave: reCallCharge,
                cardInfo: {
                    cardId,
                    card_number: card.card_number,
                    cvv: card.cvv,
                    expiry_month: card.expiry_month,
                    expiry_year: card.expiry_year,
                    currency: cardInformation.currency,
                    amount: cardInformation.amount,
                    validationType: card.mode,
                    pin,
                    tx_ref,
                },
                type: 'order',
            });

            return res.json({
                status: reCallCharge.status == 'success' ? true : false,
                message:
                    reCallCharge.status == 'success'
                        ? 'payment generate'
                        : reCallCharge.message,
                data: {
                    flw: reCallCharge,
                    flutter: flutterTransaction,
                },
                error_type:
                    reCallCharge.status == 'success'
                        ? null
                        : reCallCharge.message,
            });
        } else {
            return res.json({
                status: false,
                message: 'security type not others. contact to support',
            });
        }
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.userPayWithCard = async (req, res) => {
    try {
        const userId = req.userId;
        const { card } = req.body;
        const { token, token_id, otp, defaultPayment } = card;

        if (!otp) {
            return res.json({
                status: false,
                message: 'please enter your otp',
                error_type: 'otp_empty',
            });
        }

        const flutterTransaction = await FlutterTransaction.findOne({
            _id: token_id,
            token: token,
        });

        if (!flutterTransaction) {
            return res.json({
                status: false,
                message: 'Transaction not found',
            });
        }

        const flw_ref = flutterTransaction.flutterWave.data.flw_ref;

        const callValidate = await flw.Charge.validate({
            otp: otp,
            flw_ref: flw_ref,
        });

        if (callValidate.status === 'success') {
            flutterTransaction.status = 'success';
            await flutterTransaction.save();

            // set balance to user

            const amount = flutterTransaction.flutterWave.data.amount;

            const cardTypeString = callValidate.data.card.issuer;

            await CardModel.updateOne(
                { _id: flutterTransaction.cardInfo.cardId },
                {
                    $set: {
                        cardTypeString: cardTypeString,
                    },
                }
            );

            userConfirmPayWithCard(
                req,
                res,
                flutterTransaction.cardInfo.cardId,
                cardTypeString
            );
        } else {
            return res.json({
                status: false,
                message: callValidate.message,
                error: callValidate.message,
                data: {
                    flw: callValidate,
                },
            });
        }
    } catch (error) {
        errorHandler(res, error);
    }
};

const userConfirmPayWithCard = async (req, res, cardId, cardTypeString) => {
    try {
        const userId = req.userId;
        const plusUser = req.plusUser;
        let {
            cartId,
            summary,
            paymentMethod,
            rewardPoints,
            shopExchangeRate = 0,
            adminExchangeRate = 0,
            shopId,
        } = req.body;

        let user = await UserModel.findOne({
            _id: userId,
            deletedAt: null,
        });

        let cart = await CartModel.findOne({
            _id: cartId,
            deletedAt: null,
        });

        const shopInfo = await ShopModel.findById(shopId);
        //*** Start apply exchange rate ***/
        summary.baseCurrency_riderFeeWithFreeDelivery = 0;

        summary = applyExchangeRateInOrderSummary(
            summary,
            shopExchangeRate,
            adminExchangeRate,
            shopInfo
        );
        //*** End apply exchange rate ***/

        const userCartItem = cart?.cartItems?.find(
            item => item?.user?.toString() === userId?.toString()
        );

        userCartItem.summary = summary;
        userCartItem.rewardPoints = rewardPoints;
        userCartItem.paymentMethod = paymentMethod;
        userCartItem.isPaid = false;
        userCartItem.isReady = true;
        // Store card info for taking money after delivered
        userCartItem.cardId = cardId;
        userCartItem.cardTypeString = cardTypeString;

        await cart.save();

        let updateCart = await CartModel.findOne({
            _id: cartId,
        }).populate([
            {
                path: 'cartItems.user',
            },
            {
                path: 'cartItems.products.product',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'addons',
                        populate: [
                            {
                                path: 'category',
                            },
                            {
                                path: 'subCategory',
                            },
                        ],
                    },
                    {
                        path: 'marketing',
                    },
                ],
            },
            {
                path: 'creator',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
            },
        ]);

        await pushNotificationForGroupCart(updateCart, user, 'payment');

        const isShopOpen = checkShopOpeningHours(updateCart.shop);
        updateCart.shop._doc.isShopOpen = isShopOpen;

        if (!plusUser) {
            await checkPlusUserMarketing(updateCart.shop, true);

            for (const item of updateCart.cartItems) {
                for (const product of item.products) {
                    await checkPlusUserProductMarketing(product.product);
                }
            }
        }

        successResponse(res, {
            message: 'Payment successful',
            data: {
                cart: updateCart,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.redirectGroupScreen = async (req, res) => {
    // try {
    //     const { groupID } = req.query;
    //     const userAgentString = req.headers['user-agent'];
    //     const userAgent = useragent.parse(userAgentString);

    //     let config = {
    //         _id: groupID,
    //         deletedAt: null,
    //     };

    //     let cart = await CartModel.findOne(config);

    //     if (!cart) return errorResponse(res, 'Group Cart not found');

    //     // Your app's deep link
    //     const deepLink = `lyxauserapp://NewHomeScreen/${groupID}`;

    //     // Your app's store URL
    //     let storeUrl;

    //     if (userAgent.os.family === 'iOS') {
    //         storeUrl = 'https://itunes.apple.com/app/id1330123889';
    //         console.log('********************IOS');
    //     } else if (userAgent.os.family === 'Android') {
    //         storeUrl =
    //             'https://play.google.com/store/apps/details?id=1330123889';
    //         console.log('****************android');
    //     }

    //     // Try to open the app with the deep link
    //     await open(deepLink)
    //         .then(() => {
    //             console.log('App is installed and opened');
    //             res.redirect(deepLink);
    //         })
    //         .catch(() => {
    //             // If the app is not installed, redirect to the store URL
    //             open(storeUrl)
    //                 .then(() => {
    //                     console.log('Redirected to app store');
    //                 })
    //                 .catch(() => {
    //                     console.log('Failed to redirect to app store');
    //                 });
    //         });
    // } catch (error) {
    //     errorHandler(res, error);
    // }
    try {
        const { groupID } = req.params;

        const config = {
            _id: groupID,
            deletedAt: null,
        };

        const cart = await CartModel.findOne(config);

        const cartDetails = cart?.toObject();
        return res.render('cart', { cart: cartDetails });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Areeba payment gateway integration ***/
exports.areebaPaymentGenerate = async (req, res) => {
    try {
        const userId = req.userId;
        const { cardId, amount, cartId, summary } = req.body;

        if (!cardId) return errorResponse(res, 'cardId is required');

        const cart = await CartModel.findOne({
            _id: cartId,
            deletedAt: null,
        });

        if (!cart) return errorResponse(res, 'Cart not found');

        if (summary?.secondaryCurrency_wallet > 0) {
            const { secondaryCurrency_availableBalance } = await getUserBalance(
                userId
            );

            if (
                secondaryCurrency_availableBalance <
                summary.secondaryCurrency_wallet
            ) {
                return errorResponse(res, 'Insufficient wallet balance');
            }
        }

        const areebaCard = await AreebaCardModel.findOne({
            _id: cardId,
            user: userId,
        });

        if (!areebaCard) return errorResponse(res, 'areebaCard not found');

        const orderId = ObjectId();
        const transactionId = ObjectId();
        const currency = 'USD';
        const initiateAuthenticationPutData = {
            authentication: {
                acceptVersions: '3DS1,3DS2',
                channel: 'PAYER_BROWSER',
                purpose: 'PAYMENT_TRANSACTION',
            },
            correlationId: 'test',
            order: {
                currency: currency,
            },
            sourceOfFunds: {
                token: areebaCard.token,
            },
            apiOperation: 'INITIATE_AUTHENTICATION',
        };

        const { data: initiateAuthenticationData } = await areebaPaymentGateway(
            orderId,
            transactionId,
            initiateAuthenticationPutData
        );

        if (initiateAuthenticationData?.result == 'ERROR')
            return errorResponse(
                res,
                initiateAuthenticationData?.error?.explanation
            );

        if (
            initiateAuthenticationData?.transaction?.authenticationStatus !=
            'AUTHENTICATION_AVAILABLE'
        )
            return errorResponse(res, 'Authentication is not available');

        const authenticatePayerPutData = {
            authentication: {
                redirectResponseUrl: `${process.env.WEBSITE_URL}app/user/cart/areeba-payment-completed`,
            },
            correlationId: 'test',
            device: {
                browser: 'MOZILLA',
                browserDetails: {
                    '3DSecureChallengeWindowSize': 'FULL_SCREEN',
                    acceptHeaders: 'application/json',
                    colorDepth: 24,
                    javaEnabled: true,
                    language: 'en-US',
                    screenHeight: 640,
                    screenWidth: 480,
                    timeZone: 273,
                },
                // ipAddress: "127.0.0.1"
            },
            order: {
                amount: amount,
                currency: currency,
            },
            sourceOfFunds: {
                token: areebaCard.token,
            },
            apiOperation: 'AUTHENTICATE_PAYER',
        };

        const { data: authenticatePayerData } = await areebaPaymentGateway(
            orderId,
            transactionId,
            authenticatePayerPutData
        );

        if (authenticatePayerData?.result == 'ERROR')
            return errorResponse(
                res,
                authenticatePayerData?.error?.explanation
            );

        const redirectHtml = authenticatePayerData.authentication.redirect.html;

        await CartPaymentRequestModel.create({
            ...req.body,
            userId,
            areebaCard: { orderId, transactionId, token: areebaCard.token },
        });

        successResponse(res, {
            message: 'Successfully fetched.',
            data: {
                redirectHtml,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.areebaPaymentComplete = async (req, res) => {
    try {
        const { 'order.id': orderId, 'transaction.id': transactionId } =
            req.body;

        const orderRequest = await CartPaymentRequestModel.findOne({
            'areebaCard.orderId': orderId,
        }).lean();

        if (!orderRequest)
            return scriptResponse(res, `failed/orderRequest not found`);

        let {
            userId,
            cartId,
            summary,
            paymentMethod,
            rewardPoints,
            shopExchangeRate = 0,
            adminExchangeRate = 0,
            shopId,
            areebaCard,
        } = orderRequest;

        await CartPaymentRequestModel.findByIdAndDelete(orderRequest._id);

        const newTransactionId = ObjectId();
        const currency = 'USD';

        const authorizePutData = {
            apiOperation: 'AUTHORIZE',
            authentication: {
                transactionId: transactionId,
            },
            order: {
                amount: summary?.baseCurrency_card,
                currency: currency,
                reference: orderId,
            },
            sourceOfFunds: {
                token: areebaCard?.token,
            },
            transaction: {
                reference: transactionId,
            },
        };

        const { data: authorizeData } = await areebaPaymentGateway(
            orderId,
            newTransactionId,
            authorizePutData
        );

        if (authorizeData?.result == 'ERROR')
            return scriptResponse(
                res,
                `failed/${authorizeData?.error?.explanation}`
            );

        if (
            authorizeData?.transaction?.authenticationStatus !=
            'AUTHENTICATION_SUCCESSFUL'
        )
            return scriptResponse(
                res,
                `failed/Authentication is not successful`
            );

        const user = await UserModel.findOne({
            _id: userId,
            deletedAt: null,
        });

        const cart = await CartModel.findOne({
            _id: cartId,
            deletedAt: null,
        });

        const shopInfo = await ShopModel.findById(shopId);
        //*** Start apply exchange rate ***/
        summary.baseCurrency_riderFeeWithFreeDelivery = 0;

        summary = applyExchangeRateInOrderSummary(
            summary,
            shopExchangeRate,
            adminExchangeRate,
            shopInfo
        );
        //*** End apply exchange rate ***/

        const userCartItem = cart?.cartItems?.find(
            item => item?.user?.toString() === userId?.toString()
        );

        userCartItem.summary = summary;
        userCartItem.rewardPoints = rewardPoints;
        userCartItem.paymentMethod = paymentMethod;
        userCartItem.isPaid = false;
        userCartItem.isReady = true;
        // Areeba payment gateway integration
        areebaCard.transactionId = newTransactionId;
        delete areebaCard.token;
        userCartItem.areebaCard = areebaCard;

        await cart.save();

        const updateCart = await CartModel.findOne({
            _id: cartId,
        }).populate([
            {
                path: 'cartItems.user',
            },
            {
                path: 'cartItems.products.product',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'addons',
                        populate: [
                            {
                                path: 'category',
                            },
                            {
                                path: 'subCategory',
                            },
                        ],
                    },
                    {
                        path: 'marketing',
                    },
                ],
            },
            {
                path: 'creator',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
            },
        ]);

        await pushNotificationForGroupCart(updateCart, user, 'payment');

        return scriptResponse(res, `success/${updateCart._id}`);
    } catch (error) {
        console.log(error);
        return scriptResponse(res, `failed/${error.message}`);
    }
};
