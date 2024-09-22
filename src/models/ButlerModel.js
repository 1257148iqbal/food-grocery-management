const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;
const { GeoLocationSchema } = require('./subSchema');
const shortid = require('shortid');

const butlerSchema = new Schema(
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
        user: {
            type: ObjectId,
            ref: 'users',
            required: true,
        },
        orderStatus: {
            type: String,
            enum: {
                values: [
                    'schedule', // Scheduled order
                    'placed',
                    'accepted_delivery_boy',
                    // 'received_item',
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
        orderCancel: new Schema(
            {
                canceledBy: {
                    type: String,
                    enum: {
                        values: [
                            'user',
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
            },
            {
                timestamps: true,
            }
        ),
        orderType: {
            type: String,
            comment: 'delivery_only, purchase_delivery',
            enum: {
                values: ['delivery_only', 'purchase_delivery'],
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
                values: ['global'],
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
        transactionsDeliveryBoy: {
            type: ObjectId,
            ref: 'transactions',
        },
        receivedAddress: new Schema({
            name: {
                type: String,
            },
            phone_number: {
                type: String,
            },
            address: {
                type: String,
                required: true,
            },
            nickname: {
                type: String,
            },
            apartment: {
                type: String,
            },
            buildingName: {
                type: String,
            },
            latitude: {
                type: Number,
            },
            longitude: {
                type: Number,
            },
            country: {
                type: String,
            },
            state: {
                type: String,
            },
            city: {
                type: String,
            },
            location: GeoLocationSchema,
            instructions: {
                type: String,
            },
            deliveryOptions: {
                type: String,
            },
            addressLabel: {
                type: String,
            },
        }),
        deliveryAddress: new Schema({
            name: {
                type: String,
            },
            phone_number: {
                type: String,
            },
            address: {
                type: String,
                required: true,
            },
            nickname: {
                type: String,
            },
            apartment: {
                type: String,
            },
            buildingName: {
                type: String,
            },
            latitude: {
                type: Number,
            },
            longitude: {
                type: Number,
            },
            country: {
                type: String,
            },
            state: {
                type: String,
            },
            city: {
                type: String,
            },
            location: GeoLocationSchema,
            instructions: {
                type: String,
            },
            deliveryOptions: {
                type: String,
            },
            addressLabel: {
                type: String,
            },
        }),
        // add duplicate field for frontend demand
        pickUpLocation: {},
        dropOffLocation: {},
        summary: {
            baseCurrency_productAmount: {
                type: Number,
            },
            secondaryCurrency_productAmount: {
                type: Number,
            },
            baseCurrency_riderFee: {
                type: Number,
            },
            secondaryCurrency_riderFee: {
                type: Number,
            },
            baseCurrency_totalAmount: {
                type: Number,
            },
            secondaryCurrency_totalAmount: {
                type: Number,
            },
            baseCurrency_vat: {
                type: Number,
            },
            secondaryCurrency_vat: {
                type: Number,
            },
            baseCurrency_wallet: {
                type: Number,
            },
            secondaryCurrency_wallet: {
                type: Number,
            },
            baseCurrency_card: {
                type: Number,
            },
            secondaryCurrency_card: {
                type: Number,
            },
            baseCurrency_cash: {
                type: Number,
            },
            secondaryCurrency_cash: {
                type: Number,
            },
            //Unnecessary  field for Muin bro
            baseCurrency_discount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_discount: {
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
        itemDescription: {
            type: String,
        },
        products: [
            new Schema({
                productName: {
                    type: String,
                },
                productImage: {
                    type: String,
                },
                baseCurrency_perProductPrice: {
                    type: Number,
                },
                secondaryCurrency__perProductPrice: {
                    type: Number,
                },
                baseCurrency_totalProductAmount: {
                    type: Number,
                },
                secondaryCurrency_totalProductAmount: {
                    type: Number,
                },
                quantity: {
                    type: Number,
                },
            }),
        ],
        // let timeline = [
        //     {
        //         title: 'Order placed',
        //         status: 'placed',
        //         note: 'New Order placed',
        //         active: true,
        //         createdAt: new Date(),
        //     },
        //     {
        //         title: 'Accepted delivery boy',
        //         status: 'accepted_delivery_boy',
        //         note: 'Accepted delivery boy',
        //         active: false,
        //         createdAt: null,
        //     },
        //     {
        //         title: 'Order on the way',
        //         status: 'order_on_the_way',
        //         note: 'Order on the way',
        //         active: false,
        //         createdAt: null,
        //     },
        //     {
        //         title: 'Delivered',
        //         status: 'delivered',
        //         note: 'Delivered',
        //         active: false,
        //         createdAt: null,
        //     },
        // ];

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
                    sender: {
                        type: String,
                        enum: {
                            values: ['user', 'deliveryBoy'],
                            message: '{VALUE} is not a valid sender type',
                        },
                    },
                },
                { _id: true, timestamps: true }
            ),
        ],
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
                        enum: ['deliveryBoy'],
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
        receivedAddressToDeliveryAddressDistance: {
            type: Object,
        },
        deliveryBoyReceivedAddressDistance: {
            type: Object,
        },
        delivered_time: {
            type: Date,
            default: Date.now,
        },
        isButler: {
            type: Boolean,
            default: true,
        },
        // Reward System
        rewardPoints: { type: Number },
        // For store bring change amount
        bringChangeAmount: {
            type: Number,
        },
        // For exchange rate
        adminExchangeRate: { type: Number },
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
                    enum: ['rider', 'user'],
                },
                order: [
                    {
                        type: ObjectId,
                        ref: 'butlers',
                    },
                ],
                user: {
                    type: ObjectId,
                    ref: 'users',
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
        // Payout system
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
        isCustomerServiceAccepted: {
            type: Boolean,
        },
        // Store card info for taking money after delivered
        cardId: {
            type: ObjectId,
            ref: 'cards',
        },
        cardTypeString: {
            type: String,
        },
        // Payment on feature
        paymentOn: {
            type: String,
            enum: {
                values: ['sender', 'receiver'],
                message: '{VALUE} is not a valid error order type',
            },
            default: 'sender',
        },
        // Replacement order feature
        isReplacementOrder: {
            type: Boolean,
            default: false,
        },
        // For getting not rated delivered order
        isNotRatedDeliveredOrderShowed: {
            type: Boolean,
            default: false,
        },
        // Subscription feature for frontend developer request
        baseCurrency_pendingSubscriptionFee: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_pendingSubscriptionFee: {
            type: Number,
            default: 0,
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
        resendRiderRequestCount: { type: Number, default: 0, },
        // Areeba payment gateway integration
        areebaCard: {
            orderId: {
                type: String,
            },
            transactionId: {
                type: String,
            },
        },
        isSendNotificationUserWhenRiderBeClosest: { type: Boolean, default: false }

    },
    {
        timestamps: true,
    }
);

butlerSchema.index({ location: '2dsphere' });
butlerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('butlers', butlerSchema);
