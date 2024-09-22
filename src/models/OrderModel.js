const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;
const { GeoLocationSchema } = require('./subSchema');
const shortid = require('shortid');

const orderSchema = new Schema(
    {
        autoGenId: {
            type: String,
            default: shortid.generate,
        },
        orderId: {
            type: String,
            required: false,
            unique: true,
        },
        // Creator (who create this order) --separate for group order
        user: {
            type: ObjectId,
            ref: 'users',
            required: true,
        },
        // All users (creator + guests) --separate for group order
        users: [
            {
                type: ObjectId,
                ref: 'users',
            },
        ],
        orderStatus: {
            type: String,
            enum: {
                values: [
                    'schedule', // Scheduled order
                    'placed',
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                    'delivered',
                    'refused',
                    'cancelled',
                ],
                message: '{VALUE} is not a valid order status',
            },
            default: 'placed',
        },
        order_placedAt: {
            type: Date,
            default: null,
        },
        accepted_delivery_boyAt: {
            type: Date,
            default: null,
        },
        preparingAt: {
            type: Date,
            default: null,
        },
        ready_to_pickupAt: {
            type: Date,
            default: null,
        },
        order_on_the_wayAt: {
            type: Date,
            default: null,
        },
        deliveredAt: {
            type: Date,
            default: null,
        },
        cancelledAt: {
            type: Date,
            default: null,
        },
        refusedAt: {
            type: Date,
            default: null,
        },

        deliveryBoy: {
            type: ObjectId,
            ref: 'deliveryBoy',
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        seller: {
            type: ObjectId,
            ref: 'sellers',
        },
        orderCancel: new Schema(
            {
                canceledBy: {
                    type: String,
                    enum: {
                        values: [
                            'user',
                            'shop',
                            'deliveryBoy',
                            'admin',
                            'automatically',
                        ],
                        message: '{VALUE} is not a valid cancel type',
                    },
                },
                userId: {
                    type: ObjectId,
                    ref: 'users',
                },
                cancelReason: {
                    type: ObjectId,
                    ref: 'order_cancel_reason',
                },
                shopId: {
                    type: ObjectId,
                    ref: 'shops',
                },
                sellerId: {
                    type: ObjectId,
                    ref: 'sellers',
                },
                otherReason: {
                    type: String,
                },
                deliveryBoyId: {
                    type: ObjectId,
                    ref: 'deliveryBoy',
                },
                adminId: {
                    type: ObjectId,
                    ref: 'admins',
                },
                // Shop cancel Status
                shopCancelType: {
                    type: String,
                    enum: {
                        values: [
                            'canceled',
                            'notAccepted',
                            'rejected',
                            null,
                            '',
                        ],
                        message: '{VALUE} is not a valid cancel type',
                    },
                },
            },
            {
                timestamps: true,
            }
        ),
        orderType: {
            type: String,
            comment: 'food,',
            enum: {
                values: [
                    'food',
                    'grocery',
                    'pharmacy',
                    'coffee',
                    'flower',
                    'pet',
                ],
                message: '{VALUE} is not a valid orderType',
            },
        },
        paymentMethod: {
            type: String,
            enum: {
                values: ['cash', 'card', 'wallet', 'online'],
                message: '{VALUE} is not a valid paymentMethod',
            },
        },
        selectedPaymentMethod: {
            type: String,
            enum: {
                values: ['cash', 'card'],
                message: '{VALUE} is not a valid selectedPaymentMethod',
            },
        },
        selectPos: {
            type: String,
            enum: {
                values: ['yes', 'no'],
                message: '{VALUE} is not a valid selectPos',
            },
            default: 'no',
        },
        orderFor: {
            type: String,
            enum: {
                values: ['global', 'specific'],
                message: '{VALUE} is not a valid orderFor',
            },
            default: 'global',
        },
        paymentStatus: {
            type: String,
            enum: {
                values: ['paid', 'pending'],
                message: '{VALUE} is not a valid paymentStatus',
            },
            default: 'pending',
        },
        transactions: {
            type: ObjectId,
            ref: 'transactions',
        },
        transactionsDrop: {
            type: ObjectId,
            ref: 'transactions',
        },
        transactionsStore: {
            type: ObjectId,
            ref: 'transactions',
        },
        transactionsDeliveryBoy: {
            type: ObjectId,
            ref: 'transactions',
        },
        deliveryAddress: {
            type: ObjectId,
            ref: 'address',
            required: true,
        },
        pickUpLocation: {},
        dropOffLocation: {},
        shopDeliveryMethod: {
            type: String,
            enum: {
                values: ['drop', 'own'],
                message: '{VALUE} is not a valid shop delivery method.',
            },
            default: 'drop',
        },
        summary: {
            baseCurrency_productAmount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_productAmount: {
                type: Number,
                default: 0,
            },
            baseCurrency_riderFee: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_riderFee: {
                type: Number,
                default: 0,
            },
            baseCurrency_totalAmount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_totalAmount: {
                type: Number,
                default: 0,
            },
            baseCurrency_discount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_discount: {
                type: Number,
                default: 0,
            },
            baseCurrency_vat: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_vat: {
                type: Number,
                default: 0,
            },
            baseCurrency_wallet: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_wallet: {
                type: Number,
                default: 0,
            },
            baseCurrency_card: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_card: {
                type: Number,
                default: 0,
            },
            baseCurrency_cash: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_cash: {
                type: Number,
                default: 0,
            },
            reward: {
                points: { type: Number, default: 0 },
                baseCurrency_amount: { type: Number, default: 0 },
                secondaryCurrency_amount: { type: Number, default: 0 },
            },
            baseCurrency_doubleMenuItemPrice: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_doubleMenuItemPrice: {
                type: Number,
                default: 0,
            },
            baseCurrency_riderTip: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_riderTip: {
                type: Number,
                default: 0,
            },
            baseCurrency_couponDiscountAmount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_couponDiscountAmount: {
                type: Number,
                default: 0,
            },
            baseCurrency_punchMarketingDiscountAmount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_punchMarketingDiscountAmount: {
                type: Number,
                default: 0,
            },
            // For store free delivery charge also
            baseCurrency_riderFeeWithFreeDelivery: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_riderFeeWithFreeDelivery: {
                type: Number,
                default: 0,
            },
            // For adjust butler purchase and delivery product amount
            // baseCurrency_butlerAdjustedAmount: {
            //     type: Number,
            //     default: 0,
            // },
            // secondaryCurrency_butlerAdjustedAmount: {
            //     type: Number,
            //     default: 0,
            // },
        },
        products: [
            new Schema({
                product: {
                    type: ObjectId,
                    ref: 'products',
                    required: true,
                },
                perProduct: {
                    type: Number,
                },
                discount: {
                    type: Number,
                },
                totalProductAmount: {
                    type: Number,
                },
                totalDiscount: {
                    type: Number,
                },
                quantity: {
                    type: Number,
                    required: true,
                },
                attributes: [],
                isDoubleDeal: {
                    type: Boolean,
                    default: false,
                },
                // Special Instruction
                productSpecialInstruction: {
                    type: String,
                },
                reward: {
                    points: { type: Number },
                    amount: { type: Number },
                },
                marketingId: {
                    type: ObjectId,
                    ref: 'marketing',
                },
                //Store who added this product when group cart
                owner: {
                    type: ObjectId,
                    ref: 'users',
                },
            }),
        ],
        productsDetails: [],
        oldOrderProductsDetails: [],
        timeline: [],
        orderActivity: [],
        note: {
            type: String,
        },
        deliveryBoyNote: {
            type: String,
        },
        location: GeoLocationSchema,
        deliveryDistance: {
            type: Number,
            default: 1,
        },
        chats: [
            new Schema(
                {
                    user: {
                        type: ObjectId,
                        ref: 'users',
                    },
                    message: {
                        type: String,
                    },
                    deliveryBoy: {
                        type: ObjectId,
                        ref: 'deliveryBoy',
                    },
                    shop: {
                        type: ObjectId,
                        ref: 'shops',
                    },
                    sender: {
                        type: String,
                        enum: {
                            values: ['user', 'deliveryBoy', 'shop'],
                            message: '{VALUE} is not a valid sender type',
                        },
                    },
                },
                { _id: true, timestamps: true }
            ),
        ],
        preparingTime: {
            type: Number,
            default: 0,
        },
        transactionHistory: [
            {
                type: ObjectId,
                ref: 'transactions',
            },
        ],
        orderDeliveryCharge: {
            type: ObjectId,
            ref: 'order_delivery_charge',
        },
        adminCharge: new Schema({
            baseCurrency_adminChargeFromOrder: {
                type: Number,
            },
            secondaryCurrency_adminChargeFromOrder: {
                type: Number,
            },
            baseCurrency_adminChargeFromDelivery: {
                type: Number,
            },
            secondaryCurrency_adminChargeFromDelivery: {
                type: Number,
            },
            baseCurrency_totalAdminCharge: {
                type: Number,
            },
            secondaryCurrency_totalAdminCharge: {
                type: Number,
            },
        }),
        baseCurrency_adminCommission: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_adminCommission: {
            type: Number,
            default: 0,
        },
        baseCurrency_riderFee: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_riderFee: {
            type: Number,
            default: 0,
        },
        baseCurrency_shopEarnings: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_shopEarnings: {
            type: Number,
            default: 0,
        },
        type: {
            type: String,
            num: {
                values: ['now', 'schedule'],
                message: '{VALUE} is not a valid type',
            },
        },
        scheduleDate: {
            type: Date,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        reviews: [
            new Schema(
                {
                    type: {
                        type: String,
                        enum: ['shop', 'deliveryBoy'],
                    },
                    rating: {
                        type: Number,
                    },
                    reviewDes: {
                        type: String,
                    },
                    reviewTags: [{ type: String }],
                },
                { _id: true, timestamps: true }
            ),
        ],
        shopRated: {
            type: Boolean,
            default: false,
        },
        deliveryBoyRated: {
            type: Boolean,
            default: false,
        },
        flag: [
            {
                type: ObjectId,
                ref: 'flags',
            },
        ],
        flaggedAt: {
            type: Date,
        },
        flaggedReason: [
            {
                type: String,
                comment: 'missing-item, wrong-item, others',
            },
        ],
        userCancelTnx: [
            {
                type: ObjectId,
                ref: 'transactions',
            },
        ],
        cancelShopTnx: {
            type: ObjectId,
            ref: 'transactions',
        },
        cancelDeliveryTnx: {
            type: ObjectId,
            ref: 'transactions',
        },
        adminCancelTnx: {
            type: ObjectId,
            ref: 'transactions',
        },
        deliveryBoyList: [
            {
                type: ObjectId,
                ref: 'deliveryBoy',
            },
        ],
        rejectedDeliveryBoy: [
            {
                type: ObjectId,
                ref: 'deliveryBoy',
            },
        ],
        // for track canceled order by deliveryBoy
        canceledDeliveryBoy: [
            {
                type: ObjectId,
                ref: 'deliveryBoy',
            },
        ],

        searchingTime: {
            type: Date,
            default: Date.now,
        },
        totalSearching: {
            type: Number,
            default: 0,
        },
        lastSearchKm: {
            type: Number,
            default: 0,
        },
        deliveredMinutes: {
            type: Number,
            default: 0,
        },
        admin_chat_request: [
            {
                type: ObjectId,
                ref: 'admin_chat_request',
            },
        ],
        isChat: {
            type: Boolean,
            default: false,
        },
        lastChatTime: {
            type: Date,
            default: Date.now,
        },
        userShopDistance: {
            type: Object,
        },
        deliveryBoyShopDistance: {
            type: Object,
        },
        delivered_time: {
            type: Date,
            default: Date.now,
        },
        vatAmount: {
            baseCurrency_vatForShop: {
                type: Number,
            },
            secondaryCurrency_vatForShop: {
                type: Number,
            },
            baseCurrency_vatForAdmin: {
                type: Number,
            },
            secondaryCurrency_vatForAdmin: {
                type: Number,
            },
        },
        // Reward System
        rewardPoints: { type: Number, default: 0 },
        rewardRedeemCut: {
            rewardAdminCut: { type: Number },
            baseCurrency_rewardAdminCut: { type: Number },
            secondaryCurrency_rewardAdminCut: { type: Number },
            rewardShopCut: { type: Number },
            baseCurrency_rewardShopCut: { type: Number },
            secondaryCurrency_rewardShopCut: { type: Number },
        },
        baseCurrency_rewardRedeemCashback: { type: Number, default: 0 },
        secondaryCurrency_rewardRedeemCashback: { type: Number, default: 0 },
        isRedeemReward: {
            type: Boolean,
            default: false,
        },
        // Discount System
        discountCut: {
            discountAdminCut: { type: Number },
            baseCurrency_discountAdminCut: { type: Number },
            secondaryCurrency_discountAdminCut: { type: Number },
            discountShopCut: { type: Number },
            baseCurrency_discountShopCut: { type: Number },
            secondaryCurrency_discountShopCut: { type: Number },
        },
        isDiscount: {
            type: Boolean,
            default: false,
        },
        // Double menu System
        doubleMenuItemPrice: {
            doubleMenuItemPriceAdmin: { type: Number },
            baseCurrency_doubleMenuItemPriceAdmin: { type: Number },
            secondaryCurrency_doubleMenuItemPriceAdmin: { type: Number },
            doubleMenuItemPriceShop: { type: Number },
            baseCurrency_doubleMenuItemPriceShop: { type: Number },
            secondaryCurrency_doubleMenuItemPriceShop: { type: Number },
        },
        doubleMenuCut: {
            doubleMenuAdminCut: { type: Number },
            baseCurrency_doubleMenuAdminCut: { type: Number },
            secondaryCurrency_doubleMenuAdminCut: { type: Number },
            doubleMenuShopCut: { type: Number },
            baseCurrency_doubleMenuShopCut: { type: Number },
            secondaryCurrency_doubleMenuShopCut: { type: Number },
        },
        isDoubleMenu: {
            type: Boolean,
            default: false,
        },
        // Marketing System
        marketings: [
            {
                type: ObjectId,
                ref: 'marketing',
            },
        ],
        // Special Instruction
        specialInstruction: {
            type: String,
        },
        // Cart
        cart: {
            type: ObjectId,
            ref: 'carts',
        },
        // Coupon Feature
        coupon: {
            type: ObjectId,
            ref: 'coupons',
        },
        couponDetails: {},
        couponDiscountCut: {
            baseCurrency_couponAdminCut: {
                type: Number,
            },
            secondaryCurrency_couponAdminCut: {
                type: Number,
            },
            baseCurrency_couponShopCut: {
                type: Number,
            },
            secondaryCurrency_couponShopCut: {
                type: Number,
            },
        },
        // Refund feature after delivered
        isRefundedAfterDelivered: {
            type: Boolean,
            default: false,
        },
        refundedAfterDeliveredAt: {
            type: Date,
            default: null,
        },
        userRefundTnx: [
            {
                type: ObjectId,
                ref: 'transactions',
            },
        ],
        // Rider have to first order delivery first then pick second order
        deliveredFirstDeliveryBoyList: [
            {
                type: ObjectId,
                ref: 'deliveryBoy',
            },
        ],
        // Rider have to second order delivery first then pick first order
        deliveredSecondDeliveryBoyList: [
            {
                type: ObjectId,
                ref: 'deliveryBoy',
            },
        ],
        // Shop can rate rider feature
        shopRateToRider: {
            type: String,
            enum: ['like', 'dislike', null],
        },
        // Rider have to add image when leave at door address instruction
        leaveAtDoorImage: {
            type: String,
        },
        // Store refer friend Information
        referFriend: {
            sender: {
                type: ObjectId,
                ref: 'users',
            },
            senderName: {
                type: String,
            },
            senderGetsType: {
                type: String,
            },
            senderGets: {
                type: Number,
            },
            receiver: {
                type: ObjectId,
                ref: 'users',
            },
            receiverName: {
                type: String,
            },
            receiverGetsType: {
                type: String,
            },
            receiverGets: {
                type: Number,
            },
            inviteDate: {
                type: Date,
            },
            expiryDate: {
                type: Date,
            },
        },
        // For store bring change amount
        bringChangeAmount: {
            type: Number,
        },
        // For exchange rate
        adminExchangeRate: { type: Number },
        shopExchangeRate: { type: Number },
        baseCurrency: {},
        secondaryCurrency: {},
        // For refund type
        refundType: { type: String, enum: ['full', 'partial', 'none', null] },
        // For order trip summary
        orderTripSummary: [
            {
                name: {
                    type: String,
                },
                address: {
                    type: String,
                },
                latitude: {
                    type: Number,
                },
                longitude: {
                    type: Number,
                },
                type: {
                    type: String,
                    enum: ['shop', 'rider', 'user'],
                },
                shopType: {
                    type: String,
                    enum: [
                        'food',
                        'grocery',
                        'pharmacy',
                        'coffee',
                        'flower',
                        'pet',
                        null,
                    ],
                },
                order: [
                    {
                        type: ObjectId,
                        ref: 'orders',
                    },
                ],
                user: {
                    type: ObjectId,
                    ref: 'users',
                },
                shop: {
                    type: ObjectId,
                    ref: 'shops',
                },
                deliveryBoy: {
                    type: ObjectId,
                    ref: 'deliveryBoy',
                },
                twoOrdersContainInSameUser: {
                    type: Boolean,
                },
                totalDistance: {
                    text: {
                        type: String,
                    },
                    value: {
                        type: Number,
                    },
                },
                totalDuration: {
                    text: {
                        type: String,
                    },
                    value: {
                        type: Number,
                    },
                },
                distance: {
                    text: {
                        type: String,
                    },
                    value: {
                        type: Number,
                    },
                },
                duration: {
                    text: {
                        type: String,
                    },
                    value: {
                        type: Number,
                    },
                },
                total_overview_polyline: [],
                overview_polyline: [],
            },
        ],
        // For track which currency user pay
        paidCurrency: {
            type: String,
            enum: ['baseCurrency', 'secondaryCurrency', 'mixedCurrency'],
            default: 'baseCurrency',
        },
        // free delivery cut
        freeDeliveryCut: {
            baseCurrency_freeDeliveryAdminCut: { type: Number },
            secondaryCurrency_freeDeliveryAdminCut: { type: Number },
            baseCurrency_dropLossForFreeDelivery: { type: Number },
            secondaryCurrency_dropLossForFreeDelivery: { type: Number },
            baseCurrency_freeDeliveryShopCut: { type: Number },
            secondaryCurrency_freeDeliveryShopCut: { type: Number },
            baseCurrency_shopLossForFreeDelivery: { type: Number },
            secondaryCurrency_shopLossForFreeDelivery: { type: Number },
        },
        // Payout system
        isShopPayoutCreated: {
            type: Boolean,
            default: false,
        },
        isRiderPayoutCreated: {
            type: Boolean,
            default: false,
        },
        // Urgent order feature
        errorOrderType: {
            type: String,
            enum: {
                values: [null, 'urgent'],
                message: '{VALUE} is not a valid error order type',
            },
            default: null,
        },
        isOrderLate: {
            type: Boolean,
            default: false,
        },
        errorOrderReason: [
            {
                _id: false, // Exclude _id for each item in the array
                errorReason: {
                    type: String,
                },
                errorAt: {
                    type: Date,
                },
            },
        ],
        assignedCustomerService: {
            type: ObjectId,
            ref: 'admins',
        },
        missedCustomerService: [
            {
                type: ObjectId,
                ref: 'admins',
            },
        ],
        isCustomerServiceAccepted: {
            type: Boolean,
        },
        // Replacement order feature
        isReplacementOrder: {
            type: Boolean,
            default: false,
        },
        isReplacementItemPickFromUser: {
            type: Boolean,
            default: false,
        },
        replacementOrderDelivered: {
            type: Boolean,
            default: false,
        },
        bringItemsForReplacementOrder: {
            type: String,
        },
        originalOrder: {
            //This is old order that would be replaced by new order
            type: ObjectId,
            ref: 'orders',
        },
        replacementOrder: {
            //This is replaced order that would be placed after original order
            type: ObjectId,
            ref: 'orders',
        },
        replacementOrderDeliveryInfo: {
            deliveryType: {
                type: String,
                enum: {
                    values: ['shop-customer', 'shop-customer-shop'],
                    message:
                        '{VALUE} is not a valid replacement order deliveryType',
                },
            },
            baseCurrency_deliveryFee: { type: Number },
            secondaryCurrency_deliveryFee: { type: Number },
            baseCurrency_riderProfit: { type: Number },
            secondaryCurrency_riderProfit: { type: Number },
            baseCurrency_adminDeliveryProfit: { type: Number },
            secondaryCurrency_adminDeliveryProfit: { type: Number },
            baseCurrency_deliveryVat: { type: Number },
            secondaryCurrency_deliveryVat: { type: Number },
        },
        replacementOrderCut: {
            baseCurrency_shopCutForReplacement: { type: Number },
            secondaryCurrency_shopCutForReplacement: { type: Number },
            baseCurrency_adminCutForReplacement: { type: Number },
            secondaryCurrency_adminCutForReplacement: { type: Number },
        },
        replacementAmount: {
            baseCurrency_shopReplacement: { type: Number },
            secondaryCurrency_shopReplacement: { type: Number },
            baseCurrency_adminReplacement: { type: Number },
            secondaryCurrency_adminReplacement: { type: Number },
        },
        isSendNotificationUserWhenRiderBeClosest: {
            type: Boolean,
            default: false,
        },
        // For Endorse Loss feature
        adminPercentage: {
            type: Number,
        },
        isEndorseLoss: {
            type: Boolean,
            default: false,
        },
        inEndorseLossDeliveryFeeIncluded: {
            type: Boolean,
            default: false,
        },
        endorseLoss: {
            baseCurrency_shopLoss: { type: Number },
            secondaryCurrency_shopLoss: { type: Number },
            baseCurrency_adminLoss: { type: Number },
            secondaryCurrency_adminLoss: { type: Number },
        },
        // For finding top tags-cuisines
        tagCuisines: [
            {
                type: ObjectId,
                ref: 'tags-cuisines',
            },
        ],
        // For adjustment order feature
        isOrderAdjusted: {
            type: Boolean,
            default: false,
        },
        adjustOrderRequest: {
            type: ObjectId,
            ref: 'adjustment_order_request',
        },
        adjustOrderRequestAt: {
            type: Date,
            default: null,
        },
        // For getting not rated delivered order
        isNotRatedDeliveredOrderShowed: {
            type: Boolean,
            default: false,
        },
        // Subscription feature
        baseCurrency_pendingSubscriptionFee: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_pendingSubscriptionFee: {
            type: Number,
            default: 0,
        },
        subscription: {
            type: ObjectId,
            ref: 'subscriptions',
        },
        subscriptionLoss: {
            baseCurrency_discount: { type: Number },
            secondaryCurrency_discount: { type: Number },
            baseCurrency_doubleMenuDiscount: { type: Number },
            secondaryCurrency_doubleMenuDiscount: { type: Number },
            baseCurrency_doubleMenuLoss: { type: Number },
            secondaryCurrency_doubleMenuLoss: { type: Number },
            baseCurrency_freeDelivery: { type: Number },
            secondaryCurrency_freeDelivery: { type: Number },
        },
        // Punch marketing feature
        punchMarketingApplied: {
            type: Boolean,
            default: false,
        },
        // Collect Mixed currency feature
        baseCurrency_collectCash: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_collectCash: {
            type: Number,
            default: 0,
        },
        baseCurrency_receivedCash: {
            type: Number,
            default: 0
        },
        secondaryCurrency_receivedCash: {
            type: Number,
            default: 0
        },
        baseCurrency_returnedCash: {
            type: Number,
            default: 0
        },
        secondaryCurrency_returnedCash: {
            type: Number,
            default: 0
        },
        // For Shop delay
        isShopDelay: {
            type: Boolean,
            default: false,
        },
        shopDelayTime: {
            type: Number,
            default: 0,
        },
        resendRiderRequestCount: { type: Number, default: 0 },
        isResolved: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

orderSchema.index({ location: '2dsphere' });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('orders', orderSchema);
