const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;
const shortid = require('shortid');
const transactionSchema = new Schema(
    {
        autoGenId: {
            type: String,
            default: shortid.generate,
        },

        trxId: {
            type: String,
        },
        autoTrxId: {
            type: String,
        },
        order: {
            type: ObjectId,
            ref: 'orders',
        },
        butler: {
            type: ObjectId,
            ref: 'butlers',
        },
        account: {
            type: String,
            default: 'user',
            enum: ['user', 'seller', 'admin', 'deliveryBoy', 'shop'],
        },
        type: {
            type: String,
            enum: {
                values: [
                    'userPayForOrder',
                    'userBalanceAddAdmin',
                    'userCancelOrderGetWallet',
                    'userTopUpBalance',
                    'userBalanceWithdrawAdmin',
                    'userPayBeforeReceivedOrderByWallet',

                    'userPayForSubscriptionByWallet',
                    'userPayForSubscription',

                    'userGetRewardPoints',
                    'userRedeemRewardPoints',
                    'userCancelOrderGetRewardPoints',
                    'expiredRewardPoints',

                    'deliveryBoyOrderDelivered',
                    'deliveryBoyOrderDeliveredCash',
                    'deliveryBoyAdminAmountReceivedCash',
                    'deliveryBoyAmountSettle',
                    'deliveryBoyOrderDeliveredCashRefused',
                    'adminAddBalanceRider',
                    'adminRemoveBalanceRider',
                    'riderGetWeeklyReward',

                    'salesManagerGetMonthlyReward',

                    'adminWillGetPaymentFromShop',
                    'DropGetFromOrder',
                    'DropGetFromRefund',

                    'dropGetPercentage',

                    'VatAmountSettleByAdmin',
                    'VatAmountSettleByShop',

                    'sellerGetPaymentFromOrder',
                    'sellerGetPaymentFromOrderCash',
                    'adminAddBalanceShop',
                    'adminRemoveBalanceShop',
                    'adminSettlebalanceShop',
                    'shopCashInHand',
                    'sellerCashInHandAdjust',
                    'cashInHandRemoveCancel',
                    'sellerGetPaymentFromOrderRefused',
                    'sellerGetDeliveryFeeFromCancelOrder',

                    'refundedAfterDeliveredOrderShopCut',
                    'refundedAfterDeliveredOrderAdminCut',

                    'replacementOrderShopCut',
                    'replacementOrderAdminCut',
                    'shopGetForCancelReplacementOrder',
                    'adminGetForCancelReplacementOrder',

                    'shopEndorseLoss',
                    'adminEndorseLoss',

                    'shopPayForFeatured',

                    'topUpAdminWallet',
                ],
                message: '{VALUE} is not a valid cancel type',
            },
        },
        pos: {
            type: Boolean,
            default: false,
        },
        paymentMethod: {
            type: String,
            // comment:"cash,card,wallet"
        },
        paymentType: {
            type: String,
        },
        cardId: {
            type: ObjectId,
            ref: 'cards',
        },
        user: {
            type: ObjectId,
            ref: 'users',
        },
        admin: {
            type: ObjectId,
            ref: 'admins',
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        seller: {
            type: ObjectId,
            ref: 'sellers',
        },
        deliveryBoy: {
            type: ObjectId,
            ref: 'deliveryBoy',
        },
        amount: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_amount: {
            type: Number,
            default: 0,
        },
        shopGet: {
            type: Number,
            default: 0,
        },
        deliveryBoyGet: {
            type: Number,
            default: 0,
        },
        dropGet: {
            type: Number,
            default: 0,
        },
        unSettleAmount: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: {
                values: ['pending', 'success', 'failed', 'return'],
                message: '{VALUE} is not a valid cancel type',
            },
            default: 'success',
        },
        deliveryBoyHand: {
            type: Boolean,
        },
        adminNote: {
            type: String,
        },
        userNote: {
            type: String,
        },
        isRefund: {
            type: Boolean,
            default: false,
        },
        orderId: {
            type: ObjectId,
            ref: 'orders',
        },
        butlerId: {
            type: ObjectId,
            ref: 'butlers',
        },
        remark: {
            type: String,
        },
        receivedAmount: {
            type: Number,
        },
        secondaryCurrency_receivedAmount: {
            type: Number,
        },
        sendToDropAmount: {
            type: Number,
        },
        adminBy: {
            type: ObjectId,
            ref: 'admins',
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
            baseCurrency_discount: {
                type: Number,
            },
            secondaryCurrency_discount: {
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
            reward: {
                points: { type: Number },
                baseCurrency_amount: { type: Number },
                secondaryCurrency_amount: { type: Number },
            },
            baseCurrency_doubleMenuItemPrice: {
                type: Number,
            },
            secondaryCurrency_doubleMenuItemPrice: {
                type: Number,
            },
            baseCurrency_riderTip: {
                type: Number,
            },
            secondaryCurrency_riderTip: {
                type: Number,
            },
            baseCurrency_couponDiscountAmount: {
                type: Number,
            },
            secondaryCurrency_couponDiscountAmount: {
                type: Number,
            },
            // For store free delivery charge also
            baseCurrency_riderFeeWithFreeDelivery: {
                type: Number,
            },
            secondaryCurrency_riderFeeWithFreeDelivery: {
                type: Number,
            },
        },
        dropGetFromShop: {
            type: Number,
        },
        dropGetFromDeliveryBoy: {
            type: Number,
        },
        isCashCollected: {
            type: Boolean,
            default: false,
        },
        isUserWalletRelated: {
            type: Boolean,
            default: false,
        },
        VatPaidDate: {
            From: {
                Type: Date,
            },
            To: {
                Type: Date,
            },
        },
        isButler: {
            type: Boolean,
            default: false,
        },
        /***  Separate refund data for partial refund ***/
        isPartialRefund: {
            type: Boolean,
            default: false,
        },
        baseCurrency_adminCut: {
            type: Number,
        },
        secondaryCurrency_adminCut: {
            type: Number,
        },
        baseCurrency_adminVatCut: {
            type: Number,
        },
        secondaryCurrency_adminVatCut: {
            type: Number,
        },
        baseCurrency_deliveryBoyCut: {
            type: Number,
        },
        secondaryCurrency_deliveryBoyCut: {
            type: Number,
        },
        baseCurrency_shopCut: {
            type: Number,
        },
        secondaryCurrency_shopCut: {
            type: Number,
        },
        baseCurrency_adminDeliveryRefund: {
            type: Number,
        },
        secondaryCurrency_adminDeliveryRefund: {
            type: Number,
        },
        /***  Reward System ***/
        rewardPoints: {
            type: Number,
        },
        // desc field for shop amount add remove
        desc: {
            type: String,
        },
        /*** Featured System ***/
        marketing: {
            type: ObjectId,
            ref: 'marketing',
        },
        /** Store vat for add vat when DropGetFromRefund type ***/
        vat: {
            type: Number,
        },
        secondaryCurrency_vat: {
            type: Number,
        },
        // Payout system
        payout: {
            type: ObjectId,
            ref: 'payouts',
        },
        riderTip: {
            type: Number,
        },
        secondaryCurrency_riderTip: {
            type: Number,
        },
        // For handel coupon order refund problem
        baseCurrency_couponDiscountAmount: {
            type: Number,
        },
        secondaryCurrency_couponDiscountAmount: {
            type: Number,
        },
        // For track which currency pay
        paidCurrency: {
            type: String,
            enum: ['baseCurrency', 'secondaryCurrency', 'mixedCurrency'],
            default: 'baseCurrency',
        },
        // For calculate financial breakdown
        orderType: {
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
        // Payout system
        isShopPayoutCreated: {
            type: Boolean,
            default: false,
        },
        isRiderPayoutCreated: {
            type: Boolean,
            default: false,
        },
        // BOB finance
        bobFinance: {
            type: ObjectId,
            ref: 'bobFinance',
        },
        // Rider weekly and Sales manager monthly reward feature
        riderWeeklyOrder: {
            type: Number,
        },
        riderWeeklyTarget: {
            type: Number,
        },
        salesManagerMonthlyCreatedShop: {
            type: Number,
        },
        salesManagerMonthlyTarget: {
            type: Number,
        },
        // Collect Mixed currency feature
        baseCurrency_collectCash: {
            type: Number,
            default: 0,
        },
        baseCurrency_collectCash_sc: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_collectCash: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_collectCash_bc: {
            type: Number,
            default: 0,
        },
        baseCurrency_receivedCash: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_receivedCash: {
            type: Number,
            default: 0,
        },
        baseCurrency_returnedCash: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_returnedCash: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('transactions', transactionSchema);
