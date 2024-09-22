const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const moment = require('moment');
const ShopModel = require('../models/ShopModel');
const OrderModel = require('../models/OrderModel');
const TransactionModel = require('../models/TransactionModel');
const ButlerModel = require('../models/ButlerModel');
const {
    pagination,
    paginationMultipleModel,
} = require('../helpers/pagination');
const {
    getOrderShopProfitBreakdownInBaseCurrency,
    getOrderShopProfitBreakdownInSecondaryCurrency,
} = require('../helpers/getOrderFinancialBreakdown');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const SellerModel = require('../models/SellerModel');
const AppSetting = require('../models/AppSetting');
const PayoutSettingModel = require('../models/PayoutSettingModel');
const { getDatesInRange } = require('../helpers/getDatesInRange');
const SubscriptionModel = require('../models/SubscriptionModel');
const { getIncreasePercentage } = require('../helpers/utility');
const ObjectId = require('mongoose').Types.ObjectId;

// exports.getAdminFinancialSummary = async (req, res) => {
//     try {
//         const { startDate, endDate } = req.query;

//         //*** Calc total order profit start ***/
//         const { adminFees: orderProfitFromRestaurant } =
//             await this.getAdminEarning({
//                 startDate,
//                 endDate,
//                 orderType: 'food',
//             });
//         const { adminFees: orderProfitFromGrocery } =
//             await this.getAdminEarning({
//                 startDate,
//                 endDate,
//                 orderType: 'grocery',
//             });
//         const { adminFees: orderProfitFromPharmacy } =
//             await this.getAdminEarning({
//                 startDate,
//                 endDate,
//                 orderType: 'pharmacy',
//             });

//         const { adminFees: baseCurrency_orderProfit } =
//             await this.getAdminEarning({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'baseCurrency',
//             });
//         const { secondaryCurrency_adminFees: secondaryCurrency_orderProfit } =
//             await this.getAdminEarning({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'secondaryCurrency',
//             });

//         const totalOrderProfit =
//             orderProfitFromRestaurant +
//             orderProfitFromGrocery +
//             orderProfitFromPharmacy;
//         //*** Calc total order profit end ***/

//         //*** Calc total delivery profit start ***/
//         const { adminDeliveryProfit: deliveryProfitFromRestaurant } =
//             await this.getDeliveryFinancial({
//                 startDate,
//                 endDate,
//                 orderType: 'food',
//             });

//         const { adminDeliveryProfit: deliveryProfitFromGrocery } =
//             await this.getDeliveryFinancial({
//                 startDate,
//                 endDate,
//                 orderType: 'grocery',
//             });
//         const { adminDeliveryProfit: deliveryProfitFromPharmacy } =
//             await this.getDeliveryFinancial({
//                 startDate,
//                 endDate,
//                 orderType: 'pharmacy',
//             });

//         const { adminDeliveryProfit: baseCurrency_deliveryProfitFromOrder } =
//             await this.getDeliveryFinancial({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'baseCurrency',
//             });
//         const {
//             secondaryCurrency_adminDeliveryProfit:
//                 secondaryCurrency_deliveryProfitFromOrder,
//         } = await this.getDeliveryFinancial({
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });

//         const { adminButlerProfit: deliveryProfitFromButler } =
//             await this.getButlerFinancial({
//                 startDate,
//                 endDate,
//             });

//         const { adminButlerProfit: baseCurrency_deliveryProfitFromButler } =
//             await this.getButlerFinancial({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'baseCurrency',
//             });
//         const {
//             secondaryCurrency_adminButlerProfit:
//                 secondaryCurrency_deliveryProfitFromButler,
//         } = await this.getButlerFinancial({
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });

//         const totalDeliveryProfit =
//             deliveryProfitFromRestaurant +
//             deliveryProfitFromGrocery +
//             deliveryProfitFromPharmacy +
//             deliveryProfitFromButler;
//         const baseCurrency_deliveryProfit =
//             baseCurrency_deliveryProfitFromOrder +
//             baseCurrency_deliveryProfitFromButler;
//         const secondaryCurrency_deliveryProfit =
//             secondaryCurrency_deliveryProfitFromOrder +
//             secondaryCurrency_deliveryProfitFromButler;
//         //*** Calc total delivery profit end ***/

//         //*** Calc total refund start ***/
//         const {
//             refundAmount: refundFromRestaurant,
//             baseCurrency_adminDeliveryRefund: deliveryRefundFromRestaurant,
//         } = await this.getTotalRefundAmount({
//             startDate,
//             endDate,
//             account: 'admin',
//             orderType: 'food',
//         });
//         const {
//             refundAmount: refundFromGrocery,
//             baseCurrency_adminDeliveryRefund: deliveryRefundFromGrocery,
//         } = await this.getTotalRefundAmount({
//             startDate,
//             endDate,
//             account: 'admin',
//             orderType: 'grocery',
//         });
//         const {
//             refundAmount: refundFromPharmacy,
//             baseCurrency_adminDeliveryRefund: deliveryRefundFromPharmacy,
//         } = await this.getTotalRefundAmount({
//             startDate,
//             endDate,
//             account: 'admin',
//             orderType: 'pharmacy',
//         });

//         const {
//             refundAmount: baseCurrency_adminOrderRefund,
//             baseCurrency_adminDeliveryRefund,
//         } = await this.getTotalRefundAmount({
//             startDate,
//             endDate,
//             account: 'admin',
//             paidCurrency: 'baseCurrency',
//         });
//         const {
//             secondaryCurrency_refundAmount: secondaryCurrency_adminOrderRefund,
//             secondaryCurrency_adminDeliveryRefund,
//         } = await this.getTotalRefundAmount({
//             startDate,
//             endDate,
//             account: 'admin',
//             paidCurrency: 'secondaryCurrency',
//         });

//         const refundFromDelivery =
//             deliveryRefundFromRestaurant +
//             deliveryRefundFromGrocery +
//             deliveryRefundFromPharmacy;
//         const totalRefund =
//             refundFromRestaurant +
//             refundFromGrocery +
//             refundFromPharmacy +
//             refundFromDelivery;
//         const baseCurrency_refund =
//             baseCurrency_adminOrderRefund + baseCurrency_adminDeliveryRefund;
//         const secondaryCurrency_refund =
//             secondaryCurrency_adminOrderRefund +
//             secondaryCurrency_adminDeliveryRefund;
//         //*** Calc total refund end ***/

//         //*** Calc marketing spent start ***/
//         const { totalValue: marketingSpentFromRestaurantObj } =
//             await this.getOrderStatistics({
//                 startDate,
//                 endDate,
//                 orderType: 'food',
//             });
//         const { totalValue: marketingSpentFromGroceryObj } =
//             await this.getOrderStatistics({
//                 startDate,
//                 endDate,
//                 orderType: 'grocery',
//             });
//         const { totalValue: marketingSpentFromPharmacyObj } =
//             await this.getOrderStatistics({
//                 startDate,
//                 endDate,
//                 orderType: 'pharmacy',
//             });

//         const discountFromRestaurant =
//             marketingSpentFromRestaurantObj.totalAdminDiscount;
//         const discountFromRestaurantForSubscription =
//             marketingSpentFromRestaurantObj.totalAdminDiscountForSubscription;
//         const loyaltyPointFromRestaurant =
//             marketingSpentFromRestaurantObj.totalAdminRewardAmount;
//         const buy1Get1FromRestaurant =
//             marketingSpentFromRestaurantObj.totalAdminDoubleMenuItemPrice;
//         const buy1Get1FromRestaurantForSubscription =
//             marketingSpentFromRestaurantObj.totalAdminDoubleMenuCutForSubscription;
//         const couponDiscountFromRestaurant =
//             marketingSpentFromRestaurantObj.totalCouponAdminCut;
//         const marketingSpentFromRestaurant =
//             discountFromRestaurant +
//             loyaltyPointFromRestaurant +
//             buy1Get1FromRestaurant +
//             couponDiscountFromRestaurant;

//         const discountFromGrocery =
//             marketingSpentFromGroceryObj.totalAdminDiscount;
//         const discountFromGroceryForSubscription =
//             marketingSpentFromGroceryObj.totalAdminDiscountForSubscription;
//         const loyaltyPointFromGrocery =
//             marketingSpentFromGroceryObj.totalAdminRewardAmount;
//         const buy1Get1FromGrocery =
//             marketingSpentFromGroceryObj.totalAdminDoubleMenuItemPrice;
//         const buy1Get1FromGroceryForSubscription =
//             marketingSpentFromGroceryObj.totalAdminDoubleMenuCutForSubscription;
//         const couponDiscountFromGrocery =
//             marketingSpentFromGroceryObj.totalCouponAdminCut;
//         const marketingSpentFromGrocery =
//             discountFromGrocery +
//             loyaltyPointFromGrocery +
//             buy1Get1FromGrocery +
//             couponDiscountFromGrocery;

//         const discountFromPharmacy =
//             marketingSpentFromPharmacyObj.totalAdminDiscount;
//         const discountFromPharmacyForSubscription =
//             marketingSpentFromPharmacyObj.totalAdminDiscountForSubscription;
//         const loyaltyPointFromPharmacy =
//             marketingSpentFromPharmacyObj.totalAdminRewardAmount;
//         const buy1Get1FromPharmacy =
//             marketingSpentFromPharmacyObj.totalAdminDoubleMenuItemPrice;
//         const buy1Get1FromPharmacyForSubscription =
//             marketingSpentFromPharmacyObj.totalAdminDoubleMenuCutForSubscription;
//         const couponDiscountFromPharmacy =
//             marketingSpentFromPharmacyObj.totalCouponAdminCut;
//         const marketingSpentFromPharmacy =
//             discountFromPharmacy +
//             loyaltyPointFromPharmacy +
//             buy1Get1FromPharmacy +
//             couponDiscountFromPharmacy;

//         const freeDelivery =
//             marketingSpentFromRestaurantObj.freeDeliveryAdminCut +
//             marketingSpentFromGroceryObj.freeDeliveryAdminCut +
//             marketingSpentFromPharmacyObj.freeDeliveryAdminCut;
//         const freeDeliveryForSubscription =
//             marketingSpentFromRestaurantObj.freeDeliveryAdminCutForSubscription +
//             marketingSpentFromGroceryObj.freeDeliveryAdminCutForSubscription +
//             marketingSpentFromPharmacyObj.freeDeliveryAdminCutForSubscription;
//         const marketingSpentFromDelivery = freeDelivery;

//         const totalMarketingSpent =
//             marketingSpentFromRestaurant +
//             marketingSpentFromGrocery +
//             marketingSpentFromPharmacy +
//             marketingSpentFromDelivery;

//         const { totalValue: baseCurrency_marketingSpentObj } =
//             await this.getOrderStatistics({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'baseCurrency',
//             });
//         const { totalValue: secondaryCurrency_marketingSpentObj } =
//             await this.getOrderStatistics({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'secondaryCurrency',
//             });

//         const baseCurrency_marketingSpent =
//             baseCurrency_marketingSpentObj.totalAdminDiscount +
//             baseCurrency_marketingSpentObj.totalAdminRewardAmount +
//             baseCurrency_marketingSpentObj.totalAdminDoubleMenuItemPrice +
//             baseCurrency_marketingSpentObj.totalCouponAdminCut +
//             baseCurrency_marketingSpentObj.freeDeliveryAdminCut;
//         const secondaryCurrency_marketingSpent =
//             secondaryCurrency_marketingSpentObj.secondaryCurrency_totalAdminDiscount +
//             secondaryCurrency_marketingSpentObj.secondaryCurrency_totalAdminRewardAmount +
//             secondaryCurrency_marketingSpentObj.secondaryCurrency_totalAdminDoubleMenuItemPrice +
//             secondaryCurrency_marketingSpentObj.secondaryCurrency_totalCouponAdminCut +
//             secondaryCurrency_marketingSpentObj.secondaryCurrency_freeDeliveryAdminCut;
//         //*** Calc marketing spent end ***/

//         //*** Calc marketing cashback start ***/
//         // const discount_amc =
//         //     marketingSpentFromRestaurantObj.totalAdminDiscount +
//         //     marketingSpentFromGroceryObj.totalAdminDiscount +
//         //     marketingSpentFromPharmacyObj.totalAdminDiscount;
//         // const buy1Get1_amc =
//         //     marketingSpentFromRestaurantObj.totalAdminDoubleMenuItemPrice +
//         //     marketingSpentFromGroceryObj.totalAdminDoubleMenuItemPrice +
//         //     marketingSpentFromPharmacyObj.totalAdminDoubleMenuItemPrice;
//         // const couponDiscount_amc =
//         //     marketingSpentFromRestaurantObj.totalCouponAdminCut +
//         //     marketingSpentFromGroceryObj.totalCouponAdminCut +
//         //     marketingSpentFromPharmacyObj.totalCouponAdminCut;
//         // const adminMarketingCashback =
//         //     discount_amc + buy1Get1_amc + couponDiscount_amc;
//         //*** Calc marketing cashback end ***/

//         //*** Calc featured amount end ***/
//         const { featuredAmount: featuredAmountFromRestaurant } =
//             await this.getFeaturedAmount({
//                 startDate,
//                 endDate,
//                 orderType: 'food',
//             });
//         const { featuredAmount: featuredAmountFromGrocery } =
//             await this.getFeaturedAmount({
//                 startDate,
//                 endDate,
//                 orderType: 'grocery',
//             });
//         const { featuredAmount: featuredAmountFromPharmacy } =
//             await this.getFeaturedAmount({
//                 startDate,
//                 endDate,
//                 orderType: 'pharmacy',
//             });

//         const { featuredAmount: baseCurrency_featuredAmount } =
//             await this.getFeaturedAmount({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'baseCurrency',
//             });
//         const {
//             secondaryCurrency_featuredAmount: secondaryCurrency_featuredAmount,
//         } = await this.getFeaturedAmount({
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });

//         const totalFeaturedAmount =
//             featuredAmountFromRestaurant +
//             featuredAmountFromGrocery +
//             featuredAmountFromPharmacy;

//         //*** Calc featured amount end ***/

//         //*** Calc other amount start ***/
//         const replacementOrderByAdmin = 0;
//         const errorOrderByAdmin = 0;

//         const otherAmount = replacementOrderByAdmin + errorOrderByAdmin;
//         const baseCurrency_otherAmount =
//             replacementOrderByAdmin + errorOrderByAdmin;
//         const secondaryCurrency_otherAmount =
//             replacementOrderByAdmin + errorOrderByAdmin;
//         //*** Calc other amount end ***/

//         //*** Calc free delivery shop cut when admin rider start ***/
//         const freeDeliveryShopCut =
//             marketingSpentFromRestaurantObj.freeDeliveryShopCut +
//             marketingSpentFromGroceryObj.freeDeliveryShopCut +
//             marketingSpentFromPharmacyObj.freeDeliveryShopCut;
//         const baseCurrency_freeDeliveryShopCut =
//             baseCurrency_marketingSpentObj.freeDeliveryShopCut;
//         const secondaryCurrency_freeDeliveryShopCut =
//             secondaryCurrency_marketingSpentObj.freeDeliveryShopCut;
//         //*** Calc free delivery shop cut when admin rider end ***/

//         //*** Calc admin pay start ***/
//         const { totalAdminPay: adminPay } = await this.getAdminPay({
//             startDate,
//             endDate,
//         });
//         const { totalAdminPay: baseCurrency_adminPay } = await this.getAdminPay(
//             {
//                 startDate,
//                 endDate,
//                 paidCurrency: 'baseCurrency',
//             }
//         );
//         const { secondaryCurrency_totalAdminPay: secondaryCurrency_adminPay } =
//             await this.getAdminPay({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'secondaryCurrency',
//             });
//         //*** Calc admin pay end ***/

//         //*** Calc add remove credit start ***/
//         const { totalAddRemoveCredit: addRemoveCreditFromRestaurant } =
//             await this.getShopAddRemoveCredit({
//                 startDate,
//                 endDate,
//                 orderType: 'food',
//             });
//         const { totalAddRemoveCredit: addRemoveCreditFromGrocery } =
//             await this.getShopAddRemoveCredit({
//                 startDate,
//                 endDate,
//                 orderType: 'grocery',
//             });
//         const { totalAddRemoveCredit: addRemoveCreditFromPharmacy } =
//             await this.getShopAddRemoveCredit({
//                 startDate,
//                 endDate,
//                 orderType: 'pharmacy',
//             });

//         const { totalAddRemoveCredit: baseCurrency_addRemoveCreditFromOrder } =
//             await this.getShopAddRemoveCredit({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'baseCurrency',
//             });
//         const {
//             secondaryCurrency_totalAddRemoveCredit:
//                 secondaryCurrency_addRemoveCreditFromOrder,
//         } = await this.getShopAddRemoveCredit({
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });

//         const { totalAddRemoveCredit: addRemoveCreditFromRider } =
//             await this.getRiderAddRemoveCredit({
//                 startDate,
//                 endDate,
//             });
//         const { totalAddRemoveCredit: baseCurrency_addRemoveCreditFromRider } =
//             await this.getRiderAddRemoveCredit({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'baseCurrency',
//             });
//         const {
//             secondaryCurrency_totalAddRemoveCredit:
//                 secondaryCurrency_addRemoveCreditFromRider,
//         } = await this.getRiderAddRemoveCredit({
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });

//         const totalAddRemoveCredit =
//             addRemoveCreditFromRestaurant +
//             addRemoveCreditFromGrocery +
//             addRemoveCreditFromPharmacy +
//             addRemoveCreditFromRider;
//         const baseCurrency_addRemoveCredit =
//             baseCurrency_addRemoveCreditFromOrder +
//             baseCurrency_addRemoveCreditFromRider;
//         const secondaryCurrency_addRemoveCredit =
//             secondaryCurrency_addRemoveCreditFromOrder +
//             secondaryCurrency_addRemoveCreditFromRider;
//         //*** Calc add remove credit end ***/

//         //*** Calc error charge start ***/
//         const { totalErrorCharge: errorChargeFromRestaurant } =
//             await this.getTotalErrorCharge({
//                 startDate,
//                 endDate,
//                 account: 'admin',
//                 orderType: 'food',
//             });
//         const { totalErrorCharge: errorChargeFromGrocery } =
//             await this.getTotalErrorCharge({
//                 startDate,
//                 endDate,
//                 account: 'admin',
//                 orderType: 'grocery',
//             });
//         const { totalErrorCharge: errorChargeFromPharmacy } =
//             await this.getTotalErrorCharge({
//                 startDate,
//                 endDate,
//                 account: 'admin',
//                 orderType: 'pharmacy',
//             });

//         const { totalErrorCharge: baseCurrency_errorCharge } =
//             await this.getTotalErrorCharge({
//                 startDate,
//                 endDate,
//                 account: 'admin',
//                 paidCurrency: 'baseCurrency',
//             });
//         const {
//             secondaryCurrency_totalErrorCharge: secondaryCurrency_errorCharge,
//         } = await this.getTotalErrorCharge({
//             startDate,
//             endDate,
//             account: 'admin',
//             paidCurrency: 'secondaryCurrency',
//         });

//         const totalErrorCharge =
//             errorChargeFromRestaurant +
//             errorChargeFromGrocery +
//             errorChargeFromPharmacy;
//         //*** Calc error charge end ***/

//         //*** Calc subscription earning start ***/
//         const { baseCurrency_subscriptionFee: totalSubscriptionEarning } =
//             await this.getSubscriptionEarning({ startDate, endDate });

//         const {
//             baseCurrency_subscriptionFee: baseCurrency_subscriptionEarning,
//         } = await this.getSubscriptionEarning({
//             startDate,
//             endDate,
//             paidCurrency: 'baseCurrency',
//         });

//         const {
//             secondaryCurrency_subscriptionFee:
//                 secondaryCurrency_subscriptionEarning,
//         } = await this.getSubscriptionEarning({
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });

//         //*** Calc subscription earning end ***/

//         //*** Calc subscription spent start ***/
//         const {
//             baseCurrency_discount: totalSubscriptionDiscount,
//             baseCurrency_doubleMenuLoss: totalSubscriptionDoubleMenuLoss,
//             baseCurrency_freeDelivery: totalSubscriptionFreeDelivery,
//         } = await this.getSubscriptionSpent({ startDate, endDate });

//         const {
//             baseCurrency_discount: baseCurrency_subscriptionDiscount,
//             baseCurrency_doubleMenuLoss:
//                 baseCurrency_subscriptionDoubleMenuLoss,
//             baseCurrency_freeDelivery: baseCurrency_subscriptionFreeDelivery,
//         } = await this.getSubscriptionSpent({
//             startDate,
//             endDate,
//             paidCurrency: 'baseCurrency',
//         });

//         const {
//             secondaryCurrency_discount: secondaryCurrency_subscriptionDiscount,
//             secondaryCurrency_doubleMenuLoss:
//                 secondaryCurrency_subscriptionDoubleMenuLoss,
//             secondaryCurrency_freeDelivery:
//                 secondaryCurrency_subscriptionFreeDelivery,
//         } = await this.getSubscriptionSpent({
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });

//         const totalSubscriptionSpent =
//             totalSubscriptionDiscount +
//             totalSubscriptionDoubleMenuLoss +
//             totalSubscriptionFreeDelivery;

//         const baseCurrency_subscriptionSpent =
//             baseCurrency_subscriptionDiscount +
//             baseCurrency_subscriptionDoubleMenuLoss +
//             baseCurrency_subscriptionFreeDelivery;

//         const secondaryCurrency_subscriptionSpent =
//             secondaryCurrency_subscriptionDiscount +
//             secondaryCurrency_subscriptionDoubleMenuLoss +
//             secondaryCurrency_subscriptionFreeDelivery;

//         //*** Calc subscription spent end ***/

//         //*** Calc rider weekly and sales monthly reward start ***/
//         const { riderWeeklyReward } = await this.getRiderWeeklyReward({
//             startDate,
//             endDate,
//         });
//         const { riderWeeklyReward: baseCurrency_riderWeeklyReward } =
//             await this.getRiderWeeklyReward({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'baseCurrency',
//             });
//         const {
//             secondaryCurrency_riderWeeklyReward:
//                 secondaryCurrency_riderWeeklyReward,
//         } = await this.getRiderWeeklyReward({
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });

//         // const { salesManagerMonthlyReward } =
//         //     await this.getSalesManagerMonthlyReward({
//         //         startDate,
//         //         endDate,
//         //     });
//         // const {
//         //     salesManagerMonthlyReward: baseCurrency_salesManagerMonthlyReward,
//         // } = await this.getSalesManagerMonthlyReward({
//         //     startDate,
//         //     endDate,
//         //     paidCurrency: 'baseCurrency',
//         // });
//         // const {
//         //     secondaryCurrency_salesManagerMonthlyReward:
//         //         secondaryCurrency_salesManagerMonthlyReward,
//         // } = await this.getSalesManagerMonthlyReward({
//         //     startDate,
//         //     endDate,
//         //     paidCurrency: 'secondaryCurrency',
//         // });

//         // const totalReward = riderWeeklyReward + salesManagerMonthlyReward;
//         // const baseCurrency_totalReward =
//         //     baseCurrency_riderWeeklyReward +
//         //     baseCurrency_salesManagerMonthlyReward;
//         // const secondaryCurrency_totalReward =
//         //     secondaryCurrency_riderWeeklyReward +
//         //     secondaryCurrency_salesManagerMonthlyReward;
//         //*** Calc rider weekly and sales monthly reward end ***/

//         successResponse(res, {
//             message: 'Successfully fetched',
//             data: {
//                 profit: {
//                     profitFromRestaurant:
//                         orderProfitFromRestaurant +
//                         featuredAmountFromRestaurant -
//                         refundFromRestaurant -
//                         addRemoveCreditFromRestaurant -
//                         errorChargeFromRestaurant,
//                     profitFromGrocery:
//                         orderProfitFromGrocery +
//                         featuredAmountFromGrocery -
//                         refundFromGrocery -
//                         addRemoveCreditFromGrocery -
//                         errorChargeFromGrocery,
//                     profitFromPharmacy:
//                         orderProfitFromPharmacy +
//                         featuredAmountFromPharmacy -
//                         refundFromPharmacy -
//                         addRemoveCreditFromPharmacy -
//                         errorChargeFromPharmacy,
//                     profitFromButler: deliveryProfitFromButler,
//                     profitFromDelivery:
//                         deliveryProfitFromRestaurant +
//                         deliveryProfitFromGrocery +
//                         deliveryProfitFromPharmacy -
//                         addRemoveCreditFromRider -
//                         riderWeeklyReward -
//                         deliveryRefundFromRestaurant -
//                         deliveryRefundFromGrocery -
//                         deliveryRefundFromPharmacy,
//                     totalProfit:
//                         totalOrderProfit +
//                         totalDeliveryProfit +
//                         totalFeaturedAmount +
//                         totalSubscriptionEarning -
//                         adminPay -
//                         totalRefund -
//                         totalAddRemoveCredit -
//                         totalErrorCharge -
//                         riderWeeklyReward,
//                     baseCurrency_profit:
//                         baseCurrency_orderProfit +
//                         baseCurrency_deliveryProfit +
//                         baseCurrency_featuredAmount +
//                         baseCurrency_subscriptionEarning -
//                         baseCurrency_adminPay -
//                         baseCurrency_refund -
//                         baseCurrency_addRemoveCredit -
//                         baseCurrency_errorCharge -
//                         baseCurrency_riderWeeklyReward,
//                     secondaryCurrency_profit:
//                         secondaryCurrency_orderProfit +
//                         secondaryCurrency_deliveryProfit +
//                         secondaryCurrency_featuredAmount +
//                         secondaryCurrency_subscriptionEarning -
//                         secondaryCurrency_adminPay -
//                         secondaryCurrency_refund -
//                         secondaryCurrency_addRemoveCredit -
//                         secondaryCurrency_errorCharge -
//                         secondaryCurrency_riderWeeklyReward,
//                 },
//                 orderProfit: {
//                     orderProfitFromRestaurant:
//                         orderProfitFromRestaurant +
//                         featuredAmountFromRestaurant -
//                         refundFromRestaurant -
//                         addRemoveCreditFromRestaurant -
//                         errorChargeFromRestaurant,
//                     orderProfitFromGrocery:
//                         orderProfitFromGrocery +
//                         featuredAmountFromGrocery -
//                         refundFromGrocery -
//                         addRemoveCreditFromGrocery -
//                         errorChargeFromGrocery,
//                     orderProfitFromPharmacy:
//                         orderProfitFromPharmacy +
//                         featuredAmountFromPharmacy -
//                         refundFromPharmacy -
//                         addRemoveCreditFromPharmacy -
//                         errorChargeFromPharmacy,
//                     totalOrderProfit:
//                         totalOrderProfit +
//                         totalFeaturedAmount -
//                         refundFromRestaurant -
//                         refundFromGrocery -
//                         refundFromPharmacy -
//                         addRemoveCreditFromRestaurant -
//                         addRemoveCreditFromGrocery -
//                         addRemoveCreditFromPharmacy -
//                         totalErrorCharge,
//                     baseCurrency_orderProfit:
//                         baseCurrency_orderProfit +
//                         baseCurrency_featuredAmount -
//                         baseCurrency_adminOrderRefund -
//                         baseCurrency_addRemoveCreditFromOrder -
//                         baseCurrency_errorCharge,
//                     secondaryCurrency_orderProfit:
//                         secondaryCurrency_orderProfit +
//                         secondaryCurrency_featuredAmount -
//                         secondaryCurrency_adminOrderRefund -
//                         secondaryCurrency_addRemoveCreditFromOrder -
//                         secondaryCurrency_errorCharge,
//                 },
//                 deliveryProfit: {
//                     deliveryProfitFromRestaurant:
//                         deliveryProfitFromRestaurant -
//                         deliveryRefundFromRestaurant,
//                     deliveryProfitFromGrocery:
//                         deliveryProfitFromGrocery - deliveryRefundFromGrocery,
//                     deliveryProfitFromPharmacy:
//                         deliveryProfitFromPharmacy - deliveryRefundFromPharmacy,
//                     deliveryProfitFromButler,
//                     addRemoveCreditFromRider,
//                     riderWeeklyReward,
//                     totalDeliveryProfit:
//                         totalDeliveryProfit -
//                         refundFromDelivery -
//                         addRemoveCreditFromRider -
//                         riderWeeklyReward,
//                     baseCurrency_deliveryProfit:
//                         baseCurrency_deliveryProfit -
//                         baseCurrency_adminDeliveryRefund -
//                         baseCurrency_addRemoveCreditFromRider -
//                         baseCurrency_riderWeeklyReward,
//                     secondaryCurrency_deliveryProfit:
//                         secondaryCurrency_deliveryProfit -
//                         secondaryCurrency_adminDeliveryRefund -
//                         secondaryCurrency_addRemoveCreditFromRider -
//                         secondaryCurrency_riderWeeklyReward,
//                 },
//                 refund: {
//                     refundFromRestaurant,
//                     refundFromGrocery,
//                     refundFromPharmacy,
//                     refundFromDelivery,
//                     totalRefund,
//                     baseCurrency_refund,
//                     secondaryCurrency_refund,
//                 },
//                 marketingSpent: {
//                     restaurant: {
//                         discountFromRestaurant:
//                             discountFromRestaurant -
//                             discountFromRestaurantForSubscription,
//                         discountFromRestaurantForSubscription,
//                         loyaltyPointFromRestaurant,
//                         buy1Get1FromRestaurant:
//                             buy1Get1FromRestaurant -
//                             buy1Get1FromRestaurantForSubscription,
//                         buy1Get1FromRestaurantForSubscription,
//                         couponDiscountFromRestaurant,
//                         marketingSpentFromRestaurant,
//                     },
//                     grocery: {
//                         discountFromGrocery:
//                             discountFromGrocery -
//                             discountFromGroceryForSubscription,
//                         discountFromGroceryForSubscription,
//                         loyaltyPointFromGrocery,
//                         buy1Get1FromGrocery:
//                             buy1Get1FromGrocery -
//                             buy1Get1FromGroceryForSubscription,
//                         buy1Get1FromGroceryForSubscription,
//                         couponDiscountFromGrocery,
//                         marketingSpentFromGrocery,
//                     },
//                     pharmacy: {
//                         discountFromPharmacy:
//                             discountFromPharmacy -
//                             discountFromPharmacyForSubscription,
//                         discountFromPharmacyForSubscription,
//                         loyaltyPointFromPharmacy,
//                         buy1Get1FromPharmacy:
//                             buy1Get1FromPharmacy -
//                             buy1Get1FromPharmacyForSubscription,
//                         buy1Get1FromPharmacyForSubscription,
//                         couponDiscountFromPharmacy,
//                         marketingSpentFromPharmacy,
//                     },
//                     delivery: {
//                         freeDelivery:
//                             freeDelivery - freeDeliveryForSubscription,
//                         freeDeliveryForSubscription,
//                         marketingSpentFromDelivery,
//                     },
//                     totalMarketingSpent,
//                     baseCurrency_marketingSpent,
//                     secondaryCurrency_marketingSpent,
//                 },
//                 // adminMarketingCashBack: {
//                 //     discount_amc,
//                 //     buy1Get1_amc,
//                 //     couponDiscount_amc,
//                 //     adminMarketingCashback,
//                 // },
//                 featured: {
//                     featuredAmountFromRestaurant,
//                     featuredAmountFromGrocery,
//                     featuredAmountFromPharmacy,
//                     totalFeaturedAmount,
//                     baseCurrency_featuredAmount,
//                     secondaryCurrency_featuredAmount,
//                 },
//                 errorCharge: {
//                     totalErrorCharge,
//                     baseCurrency_errorCharge,
//                     secondaryCurrency_errorCharge,
//                 },
//                 freeDeliveryShopCut,
//                 baseCurrency_freeDeliveryShopCut,
//                 secondaryCurrency_freeDeliveryShopCut,
//                 adminPay,
//                 baseCurrency_adminPay,
//                 secondaryCurrency_adminPay,
//                 addRemoveCredit: {
//                     addRemoveCreditFromRestaurant,
//                     addRemoveCreditFromGrocery,
//                     addRemoveCreditFromPharmacy,
//                     addRemoveCreditFromRider,
//                     totalAddRemoveCredit,
//                     baseCurrency_addRemoveCredit,
//                     secondaryCurrency_addRemoveCredit,
//                 },
//                 subscriptionEarning: {
//                     totalSubscriptionEarning,
//                     baseCurrency_subscriptionEarning,
//                     secondaryCurrency_subscriptionEarning,
//                 },
//                 subscriptionSpent: {
//                     totalSubscriptionDiscount,
//                     totalSubscriptionDoubleMenuLoss,
//                     totalSubscriptionFreeDelivery,
//                     totalSubscriptionSpent,
//                     baseCurrency_subscriptionSpent,
//                     secondaryCurrency_subscriptionSpent,
//                 },
//                 // reward: {
//                 //     riderWeeklyReward,
//                 //     salesManagerMonthlyReward,
//                 //     totalReward,
//                 //     baseCurrency_totalReward,
//                 //     secondaryCurrency_totalReward,
//                 // },
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
exports.getAdminFinancialSummary = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        // Cashflow
        const {
            baseCurrency_cashflowIn,
            secondaryCurrency_cashflowIn,
            baseCurrency_cashflowOut,
            secondaryCurrency_cashflowOut,
        } = await getCashflowFunc();

        //*** Calc total order profit start ***/
        const {
            adminFees: orderProfitFromRestaurant,
            secondaryCurrency_adminFees:
                secondaryCurrency_orderProfitFromRestaurant,
        } = await this.getAdminEarning({
            startDate,
            endDate,
            orderType: 'food',
        });
        const {
            adminFees: orderProfitFromGrocery,
            secondaryCurrency_adminFees:
                secondaryCurrency_orderProfitFromGrocery,
        } = await this.getAdminEarning({
            startDate,
            endDate,
            orderType: 'grocery',
        });
        const {
            adminFees: orderProfitFromPharmacy,
            secondaryCurrency_adminFees:
                secondaryCurrency_orderProfitFromPharmacy,
        } = await this.getAdminEarning({
            startDate,
            endDate,
            orderType: 'pharmacy',
        });

        const totalOrderProfit =
            orderProfitFromRestaurant +
            orderProfitFromGrocery +
            orderProfitFromPharmacy;
        const secondaryCurrency_totalOrderProfit =
            secondaryCurrency_orderProfitFromRestaurant +
            secondaryCurrency_orderProfitFromGrocery +
            secondaryCurrency_orderProfitFromPharmacy;
        //*** Calc total order profit end ***/

        //*** Calc total delivery profit start ***/
        const {
            adminDeliveryProfit: deliveryProfitFromRestaurant,
            secondaryCurrency_adminDeliveryProfit:
                secondaryCurrency_deliveryProfitFromRestaurant,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
            orderType: 'food',
        });

        const {
            adminDeliveryProfit: deliveryProfitFromGrocery,
            secondaryCurrency_adminDeliveryProfit:
                secondaryCurrency_deliveryProfitFromGrocery,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
            orderType: 'grocery',
        });
        const {
            adminDeliveryProfit: deliveryProfitFromPharmacy,
            secondaryCurrency_adminDeliveryProfit:
                secondaryCurrency_deliveryProfitFromPharmacy,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
            orderType: 'pharmacy',
        });

        const {
            adminButlerProfit: deliveryProfitFromButler,
            secondaryCurrency_adminButlerProfit:
                secondaryCurrency_deliveryProfitFromButler,
        } = await this.getButlerFinancial({
            startDate,
            endDate,
        });

        const totalDeliveryProfit =
            deliveryProfitFromRestaurant +
            deliveryProfitFromGrocery +
            deliveryProfitFromPharmacy +
            deliveryProfitFromButler;
        const secondaryCurrency_totalDeliveryProfit =
            secondaryCurrency_deliveryProfitFromRestaurant +
            secondaryCurrency_deliveryProfitFromGrocery +
            secondaryCurrency_deliveryProfitFromPharmacy +
            secondaryCurrency_deliveryProfitFromButler;
        //*** Calc total delivery profit end ***/

        //*** Calc total refund start ***/
        const {
            refundAmount: refundFromRestaurant,
            baseCurrency_adminDeliveryRefund: deliveryRefundFromRestaurant,
            secondaryCurrency_refundAmount:
                secondaryCurrency_refundFromRestaurant,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_deliveryRefundFromRestaurant,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'food',
        });
        const {
            refundAmount: refundFromGrocery,
            baseCurrency_adminDeliveryRefund: deliveryRefundFromGrocery,
            secondaryCurrency_refundAmount: secondaryCurrency_refundFromGrocery,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_deliveryRefundFromGrocery,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'grocery',
        });
        const {
            refundAmount: refundFromPharmacy,
            baseCurrency_adminDeliveryRefund: deliveryRefundFromPharmacy,
            secondaryCurrency_refundAmount:
                secondaryCurrency_refundFromPharmacy,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_deliveryRefundFromPharmacy,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'pharmacy',
        });

        const refundFromDelivery =
            deliveryRefundFromRestaurant +
            deliveryRefundFromGrocery +
            deliveryRefundFromPharmacy;
        const secondaryCurrency_refundFromDelivery =
            secondaryCurrency_deliveryRefundFromRestaurant +
            secondaryCurrency_deliveryRefundFromGrocery +
            secondaryCurrency_deliveryRefundFromPharmacy;
        const totalRefund =
            refundFromRestaurant +
            refundFromGrocery +
            refundFromPharmacy +
            refundFromDelivery;
        const secondaryCurrency_totalRefund =
            secondaryCurrency_refundFromRestaurant +
            secondaryCurrency_refundFromGrocery +
            secondaryCurrency_refundFromPharmacy +
            secondaryCurrency_refundFromDelivery;
        //*** Calc total refund end ***/

        //*** Calc marketing spent start ***/
        const { totalValue: marketingSpentFromRestaurantObj } =
            await this.getOrderStatistics({
                startDate,
                endDate,
                orderType: 'food',
            });
        const { totalValue: marketingSpentFromGroceryObj } =
            await this.getOrderStatistics({
                startDate,
                endDate,
                orderType: 'grocery',
            });
        const { totalValue: marketingSpentFromPharmacyObj } =
            await this.getOrderStatistics({
                startDate,
                endDate,
                orderType: 'pharmacy',
            });

        const discountFromRestaurant =
            marketingSpentFromRestaurantObj.totalAdminDiscount;
        const discountFromRestaurantForSubscription =
            marketingSpentFromRestaurantObj.totalAdminDiscountForSubscription;
        const loyaltyPointFromRestaurant =
            marketingSpentFromRestaurantObj.totalAdminRewardAmount;
        const buy1Get1FromRestaurant =
            marketingSpentFromRestaurantObj.totalAdminDoubleMenuItemPrice;
        const buy1Get1FromRestaurantForSubscription =
            marketingSpentFromRestaurantObj.totalAdminDoubleMenuCutForSubscription;
        const couponDiscountFromRestaurant =
            marketingSpentFromRestaurantObj.totalCouponAdminCut;
        const marketingSpentFromRestaurant =
            discountFromRestaurant +
            loyaltyPointFromRestaurant +
            buy1Get1FromRestaurant +
            couponDiscountFromRestaurant;
        const secondaryCurrency_discountFromRestaurant =
            marketingSpentFromRestaurantObj.secondaryCurrency_totalAdminDiscount;
        const secondaryCurrency_discountFromRestaurantForSubscription =
            marketingSpentFromRestaurantObj.secondaryCurrency_totalAdminDiscountForSubscription;
        const secondaryCurrency_loyaltyPointFromRestaurant =
            marketingSpentFromRestaurantObj.secondaryCurrency_totalAdminRewardAmount;
        const secondaryCurrency_buy1Get1FromRestaurant =
            marketingSpentFromRestaurantObj.secondaryCurrency_totalAdminDoubleMenuItemPrice;
        const secondaryCurrency_buy1Get1FromRestaurantForSubscription =
            marketingSpentFromRestaurantObj.secondaryCurrency_totalAdminDoubleMenuCutForSubscription;
        const secondaryCurrency_couponDiscountFromRestaurant =
            marketingSpentFromRestaurantObj.secondaryCurrency_totalCouponAdminCut;
        const secondaryCurrency_marketingSpentFromRestaurant =
            secondaryCurrency_discountFromRestaurant +
            secondaryCurrency_loyaltyPointFromRestaurant +
            secondaryCurrency_buy1Get1FromRestaurant +
            secondaryCurrency_couponDiscountFromRestaurant;

        const discountFromGrocery =
            marketingSpentFromGroceryObj.totalAdminDiscount;
        const discountFromGroceryForSubscription =
            marketingSpentFromGroceryObj.totalAdminDiscountForSubscription;
        const loyaltyPointFromGrocery =
            marketingSpentFromGroceryObj.totalAdminRewardAmount;
        const buy1Get1FromGrocery =
            marketingSpentFromGroceryObj.totalAdminDoubleMenuItemPrice;
        const buy1Get1FromGroceryForSubscription =
            marketingSpentFromGroceryObj.totalAdminDoubleMenuCutForSubscription;
        const couponDiscountFromGrocery =
            marketingSpentFromGroceryObj.totalCouponAdminCut;
        const marketingSpentFromGrocery =
            discountFromGrocery +
            loyaltyPointFromGrocery +
            buy1Get1FromGrocery +
            couponDiscountFromGrocery;
        const secondaryCurrency_discountFromGrocery =
            marketingSpentFromGroceryObj.secondaryCurrency_totalAdminDiscount;
        const secondaryCurrency_discountFromGroceryForSubscription =
            marketingSpentFromGroceryObj.secondaryCurrency_totalAdminDiscountForSubscription;
        const secondaryCurrency_loyaltyPointFromGrocery =
            marketingSpentFromGroceryObj.secondaryCurrency_totalAdminRewardAmount;
        const secondaryCurrency_buy1Get1FromGrocery =
            marketingSpentFromGroceryObj.secondaryCurrency_totalAdminDoubleMenuItemPrice;
        const secondaryCurrency_buy1Get1FromGroceryForSubscription =
            marketingSpentFromGroceryObj.secondaryCurrency_totalAdminDoubleMenuCutForSubscription;
        const secondaryCurrency_couponDiscountFromGrocery =
            marketingSpentFromGroceryObj.secondaryCurrency_totalCouponAdminCut;
        const secondaryCurrency_marketingSpentFromGrocery =
            secondaryCurrency_discountFromGrocery +
            secondaryCurrency_loyaltyPointFromGrocery +
            secondaryCurrency_buy1Get1FromGrocery +
            secondaryCurrency_couponDiscountFromGrocery;

        const discountFromPharmacy =
            marketingSpentFromPharmacyObj.totalAdminDiscount;
        const discountFromPharmacyForSubscription =
            marketingSpentFromPharmacyObj.totalAdminDiscountForSubscription;
        const loyaltyPointFromPharmacy =
            marketingSpentFromPharmacyObj.totalAdminRewardAmount;
        const buy1Get1FromPharmacy =
            marketingSpentFromPharmacyObj.totalAdminDoubleMenuItemPrice;
        const buy1Get1FromPharmacyForSubscription =
            marketingSpentFromPharmacyObj.totalAdminDoubleMenuCutForSubscription;
        const couponDiscountFromPharmacy =
            marketingSpentFromPharmacyObj.totalCouponAdminCut;
        const marketingSpentFromPharmacy =
            discountFromPharmacy +
            loyaltyPointFromPharmacy +
            buy1Get1FromPharmacy +
            couponDiscountFromPharmacy;
        const secondaryCurrency_discountFromPharmacy =
            marketingSpentFromPharmacyObj.secondaryCurrency_totalAdminDiscount;
        const secondaryCurrency_discountFromPharmacyForSubscription =
            marketingSpentFromPharmacyObj.secondaryCurrency_totalAdminDiscountForSubscription;
        const secondaryCurrency_loyaltyPointFromPharmacy =
            marketingSpentFromPharmacyObj.secondaryCurrency_totalAdminRewardAmount;
        const secondaryCurrency_buy1Get1FromPharmacy =
            marketingSpentFromPharmacyObj.secondaryCurrency_totalAdminDoubleMenuItemPrice;
        const secondaryCurrency_buy1Get1FromPharmacyForSubscription =
            marketingSpentFromPharmacyObj.secondaryCurrency_totalAdminDoubleMenuCutForSubscription;
        const secondaryCurrency_couponDiscountFromPharmacy =
            marketingSpentFromPharmacyObj.secondaryCurrency_totalCouponAdminCut;
        const secondaryCurrency_marketingSpentFromPharmacy =
            secondaryCurrency_discountFromPharmacy +
            secondaryCurrency_loyaltyPointFromPharmacy +
            secondaryCurrency_buy1Get1FromPharmacy +
            secondaryCurrency_couponDiscountFromPharmacy;

        const freeDelivery =
            marketingSpentFromRestaurantObj.freeDeliveryAdminCut +
            marketingSpentFromGroceryObj.freeDeliveryAdminCut +
            marketingSpentFromPharmacyObj.freeDeliveryAdminCut;
        const freeDeliveryForSubscription =
            marketingSpentFromRestaurantObj.freeDeliveryAdminCutForSubscription +
            marketingSpentFromGroceryObj.freeDeliveryAdminCutForSubscription +
            marketingSpentFromPharmacyObj.freeDeliveryAdminCutForSubscription;
        const marketingSpentFromDelivery = freeDelivery;
        const secondaryCurrency_freeDelivery =
            marketingSpentFromRestaurantObj.secondaryCurrency_freeDeliveryAdminCut +
            marketingSpentFromGroceryObj.secondaryCurrency_freeDeliveryAdminCut +
            marketingSpentFromPharmacyObj.secondaryCurrency_freeDeliveryAdminCut;
        const secondaryCurrency_freeDeliveryForSubscription =
            marketingSpentFromRestaurantObj.secondaryCurrency_freeDeliveryAdminCutForSubscription +
            marketingSpentFromGroceryObj.secondaryCurrency_freeDeliveryAdminCutForSubscription +
            marketingSpentFromPharmacyObj.secondaryCurrency_freeDeliveryAdminCutForSubscription;
        const secondaryCurrency_marketingSpentFromDelivery =
            secondaryCurrency_freeDelivery;

        const totalMarketingSpent =
            marketingSpentFromRestaurant +
            marketingSpentFromGrocery +
            marketingSpentFromPharmacy +
            marketingSpentFromDelivery;
        const secondaryCurrency_totalMarketingSpent =
            secondaryCurrency_marketingSpentFromRestaurant +
            secondaryCurrency_marketingSpentFromGrocery +
            secondaryCurrency_marketingSpentFromPharmacy +
            secondaryCurrency_marketingSpentFromDelivery;
        //*** Calc marketing spent end ***/

        //*** Calc featured amount end ***/
        const {
            featuredAmount: featuredAmountFromRestaurant,
            secondaryCurrency_featuredAmount:
                secondaryCurrency_featuredAmountFromRestaurant,
        } = await this.getFeaturedAmount({
            startDate,
            endDate,
            orderType: 'food',
        });
        const {
            featuredAmount: featuredAmountFromGrocery,
            secondaryCurrency_featuredAmount:
                secondaryCurrency_featuredAmountFromGrocery,
        } = await this.getFeaturedAmount({
            startDate,
            endDate,
            orderType: 'grocery',
        });
        const {
            featuredAmount: featuredAmountFromPharmacy,
            secondaryCurrency_featuredAmount:
                secondaryCurrency_featuredAmountFromPharmacy,
        } = await this.getFeaturedAmount({
            startDate,
            endDate,
            orderType: 'pharmacy',
        });

        const totalFeaturedAmount =
            featuredAmountFromRestaurant +
            featuredAmountFromGrocery +
            featuredAmountFromPharmacy;
        const secondaryCurrency_totalFeaturedAmount =
            secondaryCurrency_featuredAmountFromRestaurant +
            secondaryCurrency_featuredAmountFromGrocery +
            secondaryCurrency_featuredAmountFromPharmacy;

        //*** Calc featured amount end ***/

        //*** Calc free delivery shop cut when admin rider start ***/
        const freeDeliveryShopCut =
            marketingSpentFromRestaurantObj.freeDeliveryShopCut +
            marketingSpentFromGroceryObj.freeDeliveryShopCut +
            marketingSpentFromPharmacyObj.freeDeliveryShopCut;
        const secondaryCurrency_freeDeliveryShopCut =
            marketingSpentFromRestaurantObj.secondaryCurrency_freeDeliveryShopCut +
            marketingSpentFromGroceryObj.secondaryCurrency_freeDeliveryShopCut +
            marketingSpentFromPharmacyObj.secondaryCurrency_freeDeliveryShopCut;

        //*** Calc free delivery shop cut when admin rider end ***/

        //*** Calc admin pay start ***/
        const {
            totalAdminPay: adminPay,
            secondaryCurrency_totalAdminPay: secondaryCurrency_adminPay,
        } = await this.getAdminPay({
            startDate,
            endDate,
        });
        //*** Calc admin pay end ***/

        //*** Calc add remove credit start ***/
        const {
            totalAddRemoveCredit: addRemoveCreditFromRestaurant,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_addRemoveCreditFromRestaurant,
        } = await this.getShopAddRemoveCredit({
            startDate,
            endDate,
            orderType: 'food',
        });
        const {
            totalAddRemoveCredit: addRemoveCreditFromGrocery,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_addRemoveCreditFromGrocery,
        } = await this.getShopAddRemoveCredit({
            startDate,
            endDate,
            orderType: 'grocery',
        });
        const {
            totalAddRemoveCredit: addRemoveCreditFromPharmacy,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_addRemoveCreditFromPharmacy,
        } = await this.getShopAddRemoveCredit({
            startDate,
            endDate,
            orderType: 'pharmacy',
        });

        const {
            totalAddRemoveCredit: addRemoveCreditFromRider,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_addRemoveCreditFromRider,
        } = await this.getRiderAddRemoveCredit({
            startDate,
            endDate,
        });

        const totalAddRemoveCredit =
            addRemoveCreditFromRestaurant +
            addRemoveCreditFromGrocery +
            addRemoveCreditFromPharmacy +
            addRemoveCreditFromRider;
        const secondaryCurrency_totalAddRemoveCredit =
            secondaryCurrency_addRemoveCreditFromRestaurant +
            secondaryCurrency_addRemoveCreditFromGrocery +
            secondaryCurrency_addRemoveCreditFromPharmacy +
            secondaryCurrency_addRemoveCreditFromRider;
        //*** Calc add remove credit end ***/

        //*** Calc error charge start ***/
        const {
            totalErrorCharge: errorChargeFromRestaurant,
            secondaryCurrency_totalErrorCharge:
                secondaryCurrency_errorChargeFromRestaurant,
        } = await this.getTotalErrorCharge({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'food',
        });
        const {
            totalErrorCharge: errorChargeFromGrocery,
            secondaryCurrency_totalErrorCharge:
                secondaryCurrency_errorChargeFromGrocery,
        } = await this.getTotalErrorCharge({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'grocery',
        });
        const {
            totalErrorCharge: errorChargeFromPharmacy,
            secondaryCurrency_totalErrorCharge:
                secondaryCurrency_errorChargeFromPharmacy,
        } = await this.getTotalErrorCharge({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'pharmacy',
        });

        const totalErrorCharge =
            errorChargeFromRestaurant +
            errorChargeFromGrocery +
            errorChargeFromPharmacy;
        const secondaryCurrency_totalErrorCharge =
            secondaryCurrency_errorChargeFromRestaurant +
            secondaryCurrency_errorChargeFromGrocery +
            secondaryCurrency_errorChargeFromPharmacy;
        //*** Calc error charge end ***/

        //*** Calc subscription earning start ***/
        const {
            baseCurrency_subscriptionFee: totalSubscriptionEarning,
            secondaryCurrency_subscriptionFee:
                secondaryCurrency_totalSubscriptionEarning,
        } = await this.getSubscriptionEarning({ startDate, endDate });
        //*** Calc subscription earning end ***/

        //*** Calc subscription spent start ***/
        const {
            baseCurrency_discount: totalSubscriptionDiscount,
            baseCurrency_doubleMenuLoss: totalSubscriptionDoubleMenuLoss,
            baseCurrency_freeDelivery: totalSubscriptionFreeDelivery,
            secondaryCurrency_discount:
                secondaryCurrency_totalSubscriptionDiscount,
            secondaryCurrency_doubleMenuLoss:
                secondaryCurrency_totalSubscriptionDoubleMenuLoss,
            secondaryCurrency_freeDelivery:
                secondaryCurrency_totalSubscriptionFreeDelivery,
        } = await this.getSubscriptionSpent({ startDate, endDate });

        const totalSubscriptionSpent =
            totalSubscriptionDiscount +
            totalSubscriptionDoubleMenuLoss +
            totalSubscriptionFreeDelivery;
        const secondaryCurrency_totalSubscriptionSpent =
            secondaryCurrency_totalSubscriptionDiscount +
            secondaryCurrency_totalSubscriptionDoubleMenuLoss +
            secondaryCurrency_totalSubscriptionFreeDelivery;
        //*** Calc subscription spent end ***/

        //*** Calc rider weekly and sales monthly reward start ***/
        const { riderWeeklyReward, secondaryCurrency_riderWeeklyReward } =
            await this.getRiderWeeklyReward({
                startDate,
                endDate,
            });
        //*** Calc rider weekly and sales monthly reward end ***/

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                profit: {
                    profitFromRestaurant:
                        orderProfitFromRestaurant +
                        featuredAmountFromRestaurant -
                        refundFromRestaurant -
                        addRemoveCreditFromRestaurant -
                        errorChargeFromRestaurant,
                    profitFromGrocery:
                        orderProfitFromGrocery +
                        featuredAmountFromGrocery -
                        refundFromGrocery -
                        addRemoveCreditFromGrocery -
                        errorChargeFromGrocery,
                    profitFromPharmacy:
                        orderProfitFromPharmacy +
                        featuredAmountFromPharmacy -
                        refundFromPharmacy -
                        addRemoveCreditFromPharmacy -
                        errorChargeFromPharmacy,
                    profitFromButler: deliveryProfitFromButler,
                    profitFromDelivery:
                        deliveryProfitFromRestaurant +
                        deliveryProfitFromGrocery +
                        deliveryProfitFromPharmacy -
                        addRemoveCreditFromRider -
                        riderWeeklyReward -
                        deliveryRefundFromRestaurant -
                        deliveryRefundFromGrocery -
                        deliveryRefundFromPharmacy,
                    totalProfit:
                        totalOrderProfit +
                        totalDeliveryProfit +
                        totalFeaturedAmount +
                        totalSubscriptionEarning -
                        adminPay -
                        totalRefund -
                        totalAddRemoveCredit -
                        totalErrorCharge -
                        riderWeeklyReward,
                },
                orderProfit: {
                    orderProfitFromRestaurant:
                        orderProfitFromRestaurant +
                        featuredAmountFromRestaurant -
                        refundFromRestaurant -
                        addRemoveCreditFromRestaurant -
                        errorChargeFromRestaurant,
                    orderProfitFromGrocery:
                        orderProfitFromGrocery +
                        featuredAmountFromGrocery -
                        refundFromGrocery -
                        addRemoveCreditFromGrocery -
                        errorChargeFromGrocery,
                    orderProfitFromPharmacy:
                        orderProfitFromPharmacy +
                        featuredAmountFromPharmacy -
                        refundFromPharmacy -
                        addRemoveCreditFromPharmacy -
                        errorChargeFromPharmacy,
                    totalOrderProfit:
                        totalOrderProfit +
                        totalFeaturedAmount -
                        refundFromRestaurant -
                        refundFromGrocery -
                        refundFromPharmacy -
                        addRemoveCreditFromRestaurant -
                        addRemoveCreditFromGrocery -
                        addRemoveCreditFromPharmacy -
                        totalErrorCharge,
                },
                deliveryProfit: {
                    deliveryProfitFromRestaurant:
                        deliveryProfitFromRestaurant -
                        deliveryRefundFromRestaurant,
                    deliveryProfitFromGrocery:
                        deliveryProfitFromGrocery - deliveryRefundFromGrocery,
                    deliveryProfitFromPharmacy:
                        deliveryProfitFromPharmacy - deliveryRefundFromPharmacy,
                    deliveryProfitFromButler,
                    addRemoveCreditFromRider,
                    riderWeeklyReward,
                    totalDeliveryProfit:
                        totalDeliveryProfit -
                        refundFromDelivery -
                        addRemoveCreditFromRider -
                        riderWeeklyReward,
                },
                refund: {
                    refundFromRestaurant,
                    refundFromGrocery,
                    refundFromPharmacy,
                    refundFromDelivery,
                    totalRefund,
                },
                marketingSpent: {
                    restaurant: {
                        discountFromRestaurant:
                            discountFromRestaurant -
                            discountFromRestaurantForSubscription,
                        discountFromRestaurantForSubscription,
                        loyaltyPointFromRestaurant,
                        buy1Get1FromRestaurant:
                            buy1Get1FromRestaurant -
                            buy1Get1FromRestaurantForSubscription,
                        buy1Get1FromRestaurantForSubscription,
                        couponDiscountFromRestaurant,
                        marketingSpentFromRestaurant,
                    },
                    grocery: {
                        discountFromGrocery:
                            discountFromGrocery -
                            discountFromGroceryForSubscription,
                        discountFromGroceryForSubscription,
                        loyaltyPointFromGrocery,
                        buy1Get1FromGrocery:
                            buy1Get1FromGrocery -
                            buy1Get1FromGroceryForSubscription,
                        buy1Get1FromGroceryForSubscription,
                        couponDiscountFromGrocery,
                        marketingSpentFromGrocery,
                    },
                    pharmacy: {
                        discountFromPharmacy:
                            discountFromPharmacy -
                            discountFromPharmacyForSubscription,
                        discountFromPharmacyForSubscription,
                        loyaltyPointFromPharmacy,
                        buy1Get1FromPharmacy:
                            buy1Get1FromPharmacy -
                            buy1Get1FromPharmacyForSubscription,
                        buy1Get1FromPharmacyForSubscription,
                        couponDiscountFromPharmacy,
                        marketingSpentFromPharmacy,
                    },
                    delivery: {
                        freeDelivery:
                            freeDelivery - freeDeliveryForSubscription,
                        freeDeliveryForSubscription,
                        marketingSpentFromDelivery,
                    },
                    totalMarketingSpent,
                },
                featured: {
                    featuredAmountFromRestaurant,
                    featuredAmountFromGrocery,
                    featuredAmountFromPharmacy,
                    totalFeaturedAmount,
                },
                errorCharge: {
                    totalErrorCharge,
                },
                freeDeliveryShopCut,
                adminPay,
                addRemoveCredit: {
                    addRemoveCreditFromRestaurant,
                    addRemoveCreditFromGrocery,
                    addRemoveCreditFromPharmacy,
                    addRemoveCreditFromRider,
                    totalAddRemoveCredit,
                },
                subscriptionEarning: {
                    totalSubscriptionEarning,
                },
                subscriptionSpent: {
                    totalSubscriptionDiscount,
                    totalSubscriptionDoubleMenuLoss,
                    totalSubscriptionFreeDelivery,
                    totalSubscriptionSpent,
                },
                cashflow: {
                    cashflowIn: baseCurrency_cashflowIn,

                    cashflowOut: baseCurrency_cashflowOut,
                },
            };
        } else {
            result = {
                profit: {
                    profitFromRestaurant:
                        secondaryCurrency_orderProfitFromRestaurant +
                        secondaryCurrency_featuredAmountFromRestaurant -
                        secondaryCurrency_refundFromRestaurant -
                        secondaryCurrency_addRemoveCreditFromRestaurant -
                        secondaryCurrency_errorChargeFromRestaurant,
                    profitFromGrocery:
                        secondaryCurrency_orderProfitFromGrocery +
                        secondaryCurrency_featuredAmountFromGrocery -
                        secondaryCurrency_refundFromGrocery -
                        secondaryCurrency_addRemoveCreditFromGrocery -
                        secondaryCurrency_errorChargeFromGrocery,
                    profitFromPharmacy:
                        secondaryCurrency_orderProfitFromPharmacy +
                        secondaryCurrency_featuredAmountFromPharmacy -
                        secondaryCurrency_refundFromPharmacy -
                        secondaryCurrency_addRemoveCreditFromPharmacy -
                        secondaryCurrency_errorChargeFromPharmacy,
                    profitFromButler:
                        secondaryCurrency_deliveryProfitFromButler,
                    profitFromDelivery:
                        secondaryCurrency_deliveryProfitFromRestaurant +
                        secondaryCurrency_deliveryProfitFromGrocery +
                        secondaryCurrency_deliveryProfitFromPharmacy -
                        secondaryCurrency_addRemoveCreditFromRider -
                        secondaryCurrency_riderWeeklyReward -
                        secondaryCurrency_deliveryRefundFromRestaurant -
                        secondaryCurrency_deliveryRefundFromGrocery -
                        secondaryCurrency_deliveryRefundFromPharmacy,
                    totalProfit:
                        secondaryCurrency_totalOrderProfit +
                        secondaryCurrency_totalDeliveryProfit +
                        secondaryCurrency_totalFeaturedAmount +
                        secondaryCurrency_totalSubscriptionEarning -
                        secondaryCurrency_adminPay -
                        secondaryCurrency_totalRefund -
                        secondaryCurrency_totalAddRemoveCredit -
                        secondaryCurrency_totalErrorCharge -
                        secondaryCurrency_riderWeeklyReward,
                },
                orderProfit: {
                    orderProfitFromRestaurant:
                        secondaryCurrency_orderProfitFromRestaurant +
                        secondaryCurrency_featuredAmountFromRestaurant -
                        secondaryCurrency_refundFromRestaurant -
                        secondaryCurrency_addRemoveCreditFromRestaurant -
                        secondaryCurrency_errorChargeFromRestaurant,
                    orderProfitFromGrocery:
                        secondaryCurrency_orderProfitFromGrocery +
                        secondaryCurrency_featuredAmountFromGrocery -
                        secondaryCurrency_refundFromGrocery -
                        secondaryCurrency_addRemoveCreditFromGrocery -
                        secondaryCurrency_errorChargeFromGrocery,
                    orderProfitFromPharmacy:
                        secondaryCurrency_orderProfitFromPharmacy +
                        secondaryCurrency_featuredAmountFromPharmacy -
                        secondaryCurrency_refundFromPharmacy -
                        secondaryCurrency_addRemoveCreditFromPharmacy -
                        secondaryCurrency_errorChargeFromPharmacy,
                    totalOrderProfit:
                        secondaryCurrency_totalOrderProfit +
                        secondaryCurrency_totalFeaturedAmount -
                        secondaryCurrency_refundFromRestaurant -
                        secondaryCurrency_refundFromGrocery -
                        secondaryCurrency_refundFromPharmacy -
                        secondaryCurrency_addRemoveCreditFromRestaurant -
                        secondaryCurrency_addRemoveCreditFromGrocery -
                        secondaryCurrency_addRemoveCreditFromPharmacy -
                        secondaryCurrency_totalErrorCharge,
                },
                deliveryProfit: {
                    deliveryProfitFromRestaurant:
                        secondaryCurrency_deliveryProfitFromRestaurant -
                        secondaryCurrency_deliveryRefundFromRestaurant,
                    deliveryProfitFromGrocery:
                        secondaryCurrency_deliveryProfitFromGrocery -
                        secondaryCurrency_deliveryRefundFromGrocery,
                    deliveryProfitFromPharmacy:
                        secondaryCurrency_deliveryProfitFromPharmacy -
                        secondaryCurrency_deliveryRefundFromPharmacy,
                    deliveryProfitFromButler:
                        secondaryCurrency_deliveryProfitFromButler,
                    addRemoveCreditFromRider:
                        secondaryCurrency_addRemoveCreditFromRider,
                    riderWeeklyReward: secondaryCurrency_riderWeeklyReward,
                    totalDeliveryProfit:
                        secondaryCurrency_totalDeliveryProfit -
                        secondaryCurrency_refundFromDelivery -
                        secondaryCurrency_addRemoveCreditFromRider -
                        secondaryCurrency_riderWeeklyReward,
                },
                refund: {
                    refundFromRestaurant:
                        secondaryCurrency_refundFromRestaurant,
                    refundFromGrocery: secondaryCurrency_refundFromGrocery,
                    refundFromPharmacy: secondaryCurrency_refundFromPharmacy,
                    refundFromDelivery: secondaryCurrency_refundFromDelivery,
                    totalRefund: secondaryCurrency_totalRefund,
                },
                marketingSpent: {
                    restaurant: {
                        discountFromRestaurant:
                            secondaryCurrency_discountFromRestaurant -
                            secondaryCurrency_discountFromRestaurantForSubscription,
                        discountFromRestaurantForSubscription:
                            secondaryCurrency_discountFromRestaurantForSubscription,
                        loyaltyPointFromRestaurant:
                            secondaryCurrency_loyaltyPointFromRestaurant,
                        buy1Get1FromRestaurant:
                            secondaryCurrency_buy1Get1FromRestaurant -
                            secondaryCurrency_buy1Get1FromRestaurantForSubscription,
                        buy1Get1FromRestaurantForSubscription:
                            secondaryCurrency_buy1Get1FromRestaurantForSubscription,
                        couponDiscountFromRestaurant:
                            secondaryCurrency_couponDiscountFromRestaurant,
                        marketingSpentFromRestaurant:
                            secondaryCurrency_marketingSpentFromRestaurant,
                    },
                    grocery: {
                        discountFromGrocery:
                            secondaryCurrency_discountFromGrocery -
                            secondaryCurrency_discountFromGroceryForSubscription,
                        discountFromGroceryForSubscription:
                            secondaryCurrency_discountFromGroceryForSubscription,
                        loyaltyPointFromGrocery:
                            secondaryCurrency_loyaltyPointFromGrocery,
                        buy1Get1FromGrocery:
                            secondaryCurrency_buy1Get1FromGrocery -
                            secondaryCurrency_buy1Get1FromGroceryForSubscription,
                        buy1Get1FromGroceryForSubscription:
                            secondaryCurrency_buy1Get1FromGroceryForSubscription,
                        couponDiscountFromGrocery:
                            secondaryCurrency_couponDiscountFromGrocery,
                        marketingSpentFromGrocery:
                            secondaryCurrency_marketingSpentFromGrocery,
                    },
                    pharmacy: {
                        discountFromPharmacy:
                            secondaryCurrency_discountFromPharmacy -
                            secondaryCurrency_discountFromPharmacyForSubscription,
                        discountFromPharmacyForSubscription:
                            secondaryCurrency_discountFromPharmacyForSubscription,
                        loyaltyPointFromPharmacy:
                            secondaryCurrency_loyaltyPointFromPharmacy,
                        buy1Get1FromPharmacy:
                            secondaryCurrency_buy1Get1FromPharmacy -
                            secondaryCurrency_buy1Get1FromPharmacyForSubscription,
                        buy1Get1FromPharmacyForSubscription:
                            secondaryCurrency_buy1Get1FromPharmacyForSubscription,
                        couponDiscountFromPharmacy:
                            secondaryCurrency_couponDiscountFromPharmacy,
                        marketingSpentFromPharmacy:
                            secondaryCurrency_marketingSpentFromPharmacy,
                    },
                    delivery: {
                        freeDelivery:
                            secondaryCurrency_freeDelivery -
                            secondaryCurrency_freeDeliveryForSubscription,
                        freeDeliveryForSubscription:
                            secondaryCurrency_freeDeliveryForSubscription,
                        marketingSpentFromDelivery:
                            secondaryCurrency_marketingSpentFromDelivery,
                    },
                    totalMarketingSpent: secondaryCurrency_totalMarketingSpent,
                },
                featured: {
                    featuredAmountFromRestaurant:
                        secondaryCurrency_featuredAmountFromRestaurant,
                    featuredAmountFromGrocery:
                        secondaryCurrency_featuredAmountFromGrocery,
                    featuredAmountFromPharmacy:
                        secondaryCurrency_featuredAmountFromPharmacy,
                    totalFeaturedAmount: secondaryCurrency_totalFeaturedAmount,
                },
                errorCharge: {
                    totalErrorCharge: secondaryCurrency_totalErrorCharge,
                },
                freeDeliveryShopCut: secondaryCurrency_freeDeliveryShopCut,
                adminPay: secondaryCurrency_adminPay,
                addRemoveCredit: {
                    addRemoveCreditFromRestaurant:
                        secondaryCurrency_addRemoveCreditFromRestaurant,
                    addRemoveCreditFromGrocery:
                        secondaryCurrency_addRemoveCreditFromGrocery,
                    addRemoveCreditFromPharmacy:
                        secondaryCurrency_addRemoveCreditFromPharmacy,
                    addRemoveCreditFromRider:
                        secondaryCurrency_addRemoveCreditFromRider,
                    totalAddRemoveCredit:
                        secondaryCurrency_totalAddRemoveCredit,
                },
                subscriptionEarning: {
                    totalSubscriptionEarning:
                        secondaryCurrency_totalSubscriptionEarning,
                },
                subscriptionSpent: {
                    totalSubscriptionDiscount:
                        secondaryCurrency_totalSubscriptionDiscount,
                    totalSubscriptionDoubleMenuLoss:
                        secondaryCurrency_totalSubscriptionDoubleMenuLoss,
                    totalSubscriptionFreeDelivery:
                        secondaryCurrency_totalSubscriptionFreeDelivery,
                    totalSubscriptionSpent:
                        secondaryCurrency_totalSubscriptionSpent,
                },
                cashflow: {
                    cashflowIn: secondaryCurrency_cashflowIn,

                    cashflowOut: secondaryCurrency_cashflowOut,
                },
            };
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: { ...result },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const getCashflowFunc = async () => {
    try {
        const orderAggregateQ = await OrderModel.aggregate([
            {
                $match: {
                    orderStatus: 'delivered',
                },
            },
            {
                $group: {
                    _id: '',
                    baseCurrency_wallet: {
                        $sum: '$summary.baseCurrency_wallet',
                    },
                    secondaryCurrency_wallet: {
                        $sum: '$summary.secondaryCurrency_wallet',
                    },
                    baseCurrency_card: {
                        $sum: '$summary.baseCurrency_card',
                    },
                    secondaryCurrency_card: {
                        $sum: '$summary.secondaryCurrency_card',
                    },
                    baseCurrency_cash: {
                        $sum: '$summary.baseCurrency_cash',
                    },
                    secondaryCurrency_cash: {
                        $sum: '$summary.secondaryCurrency_cash',
                    },
                },
            },
        ]);

        const {
            baseCurrency_wallet = 0,
            secondaryCurrency_wallet = 0,
            baseCurrency_card = 0,
            secondaryCurrency_card = 0,
            baseCurrency_cash = 0,
            secondaryCurrency_cash = 0,
        } = orderAggregateQ[0] || {};

        const baseCurrency_cashflowIn =
            baseCurrency_wallet + baseCurrency_card + baseCurrency_cash;
        const secondaryCurrency_cashflowIn =
            secondaryCurrency_wallet +
            secondaryCurrency_card +
            secondaryCurrency_cash;

        const transactionAggregateQ = await TransactionModel.aggregate([
            {
                $match: {
                    type: {
                        $in: [
                            'deliveryBoyAmountSettle',
                            'adminSettlebalanceShop',
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: '',
                    baseCurrency_cashflowOut: {
                        $sum: '$amount',
                    },
                    secondaryCurrency_cashflowOut: {
                        $sum: '$secondaryCurrency_amount',
                    },
                },
            },
        ]);

        const {
            baseCurrency_cashflowOut = 0,
            secondaryCurrency_cashflowOut = 0,
        } = transactionAggregateQ[0] || {};

        return {
            baseCurrency_cashflowIn,
            secondaryCurrency_cashflowIn,
            baseCurrency_cashflowOut,
            secondaryCurrency_cashflowOut,
        };
    } catch (error) {
        console.log(error);
    }
};

// exports.getAdminOrderFinancial = async (req, res) => {
//     try {
//         const { startDate, endDate, orderType } = req.query;

//         const timeDiff =
//             new Date(endDate).getTime() - new Date(startDate).getTime();
//         const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

//         const oldEndDate = new Date(startDate);
//         oldEndDate.setDate(oldEndDate.getDate() - 1);
//         const oldStartDate = new Date(oldEndDate);
//         oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

//         const orderStatistics = await this.getOrderStatistics({
//             orderType,
//         });
//         const orderStatisticsByDate = await this.getOrderStatistics({
//             startDate,
//             endDate,
//             orderType,
//         });
//         const orderStatisticsByOldDate = await this.getOrderStatistics({
//             startDate: oldStartDate,
//             endDate: oldEndDate,
//             orderType,
//         });

//         // Calculate delivered order start
//         const totalDeliveredOrder = orderStatistics.totalDeliveredOrder;
//         const totalDeliveredOrderByDate =
//             orderStatisticsByDate.totalDeliveredOrder;
//         const totalDeliveredOrderByOldDate =
//             orderStatisticsByOldDate.totalDeliveredOrder;
//         const totalDeliveredOrderByDateAvg =
//             (totalDeliveredOrderByDate / totalDeliveredOrder) * 100;
//         const totalDeliveredOrderByOldDateAvg =
//             (totalDeliveredOrderByOldDate / totalDeliveredOrder) * 100;
//         const totalDeliveredOrderAvgInPercentage =
//             totalDeliveredOrderByDateAvg - totalDeliveredOrderByOldDateAvg || 0;
//         // Calculate delivered order end

//         //** Create summary Start **/
//         const orderStatistics_cash = await this.getOrderStatistics({
//             startDate,
//             endDate,
//             paymentMethod: 'cash',
//             orderType,
//         });
//         const orderStatistics_online = await this.getOrderStatistics({
//             startDate,
//             endDate,
//             paymentMethod: 'online',
//             orderType,
//         });
//         const originalOrderAmount_cash =
//             orderStatistics_cash.totalValue.productAmount +
//             orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
//         const discount_cash = orderStatistics_cash.totalValue.totalDiscount;
//         const loyaltyPoints_cash =
//             orderStatistics_cash.totalValue.totalRewardAmount;
//         const buy1Get1_cash =
//             orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
//         const couponDiscount_cash =
//             orderStatistics_cash.totalValue.totalCouponAdminCut +
//             orderStatistics_cash.totalValue.totalCouponShopCut;
//         const totalCash =
//             originalOrderAmount_cash -
//             discount_cash -
//             loyaltyPoints_cash -
//             buy1Get1_cash -
//             couponDiscount_cash;
//         const wallet_cash = orderStatistics_cash.totalValue.wallet;

//         const originalOrderAmount_online =
//             orderStatistics_online.totalValue.productAmount +
//             orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
//         const discount_online = orderStatistics_online.totalValue.totalDiscount;
//         const loyaltyPoints_online =
//             orderStatistics_online.totalValue.totalRewardAmount;
//         const buy1Get1_online =
//             orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
//         const couponDiscount_online =
//             orderStatistics_online.totalValue.totalCouponAdminCut +
//             orderStatistics_online.totalValue.totalCouponShopCut;
//         const totalOnline =
//             originalOrderAmount_online -
//             discount_online -
//             loyaltyPoints_online -
//             buy1Get1_online -
//             couponDiscount_online;
//         const wallet_online = orderStatistics_online.totalValue.wallet;

//         const discount_amc =
//             orderStatisticsByDate.totalValue.totalAdminDiscount;
//         const buy1Get1_amc =
//             orderStatisticsByDate.totalValue.totalAdminDoubleMenuItemPrice;
//         const couponDiscount_amc =
//             orderStatisticsByDate.totalValue.totalCouponAdminCut;
//         const pointsCashback = orderStatisticsByDate.totalValue.pointsCashback;
//         const adminMarketingCashback =
//             discount_amc + buy1Get1_amc + couponDiscount_amc + pointsCashback;

//         const orderAmount = totalCash + totalOnline + adminMarketingCashback;

//         const { featuredAmount, secondaryCurrency_featuredAmount } =
//             await this.getFeaturedAmount({
//                 startDate,
//                 endDate,
//                 orderType,
//             });

//         const {
//             refundAmount: totalCustomerRefund,
//             secondaryCurrency_refundAmount:
//                 secondaryCurrency_totalCustomerRefund,
//         } = await this.getTotalRefundAmount({
//             startDate,
//             endDate,
//             account: 'admin',
//             orderType,
//         });
//         const { refundAmount: baseCurrency_customerRefund } =
//             await this.getTotalRefundAmount({
//                 startDate,
//                 endDate,
//                 account: 'admin',
//                 orderType,
//                 paidCurrency: 'baseCurrency',
//             });
//         const {
//             secondaryCurrency_refundAmount: secondaryCurrency_customerRefund,
//         } = await this.getTotalRefundAmount({
//             startDate,
//             endDate,
//             account: 'admin',
//             orderType,
//             paidCurrency: 'secondaryCurrency',
//         });

//         const { totalErrorCharge, secondaryCurrency_totalErrorCharge } =
//             await this.getTotalErrorCharge({
//                 startDate,
//                 endDate,
//                 account: 'admin',
//                 orderType,
//             });
//         const { totalReplacementOrder } = await this.getTotalReplacementOrder({
//             startDate,
//             endDate,
//             account: 'admin',
//             orderType,
//         });
//         const { totalEndureLoss } = await this.getTotalEndureLoss({
//             startDate,
//             endDate,
//             account: 'admin',
//             orderType,
//         });
//         const { totalErrorCharge: baseCurrency_errorCharge } =
//             await this.getTotalErrorCharge({
//                 startDate,
//                 endDate,
//                 account: 'admin',
//                 orderType,
//                 paidCurrency: 'baseCurrency',
//             });
//         const {
//             secondaryCurrency_totalErrorCharge: secondaryCurrency_errorCharge,
//         } = await this.getTotalErrorCharge({
//             startDate,
//             endDate,
//             account: 'admin',
//             orderType,
//             paidCurrency: 'secondaryCurrency',
//         });

//         const freeDeliveryByShop =
//             orderStatisticsByDate.totalValue.freeDeliveryShopCut;

//         let { adminFees: totalAdminProfit } = await this.getAdminEarning({
//             orderType,
//         });
//         let {
//             adminFees: totalAdminProfitByDate,
//             secondaryCurrency_adminFees:
//                 secondaryCurrency_totalAdminProfitByDate,
//         } = await this.getAdminEarning({
//             startDate,
//             endDate,
//             orderType,
//         });
//         let { adminFees: baseCurrency_adminProfit } =
//             await this.getAdminEarning({
//                 startDate,
//                 endDate,
//                 orderType,
//                 paidCurrency: 'baseCurrency',
//             });
//         let { secondaryCurrency_adminFees: secondaryCurrency_adminProfit } =
//             await this.getAdminEarning({
//                 startDate,
//                 endDate,
//                 orderType,
//                 paidCurrency: 'secondaryCurrency',
//             });

//         let { adminFees: totalAdminProfitByOldDate } =
//             await this.getAdminEarning({
//                 startDate: oldStartDate,
//                 endDate: oldEndDate,
//                 orderType,
//             });

//         const totalAdminProfitByDateAvg =
//             (totalAdminProfitByDate / totalAdminProfit) * 100;
//         const totalAdminProfitByOldDateAvg =
//             (totalAdminProfitByOldDate / totalAdminProfit) * 100;
//         const totalAdminProfitAvgInPercentage =
//             totalAdminProfitByDateAvg - totalAdminProfitByOldDateAvg || 0;

//         //** Create summary End **/

//         //*** Calculate payout start ***/
//         const { refundAmount: shopCustomerRefund } =
//             await this.getTotalRefundAmount({
//                 startDate,
//                 endDate,
//                 account: 'shop',
//                 orderType,
//             });

//         const { totalErrorCharge: totalShopErrorCharge } =
//             await this.getTotalErrorCharge({
//                 startDate,
//                 endDate,
//                 account: 'shop',
//                 orderType,
//             });
//         const { totalReplacementOrder: totalShopReplacementOrder } =
//             await this.getTotalReplacementOrder({
//                 startDate,
//                 endDate,
//                 account: 'shop',
//                 orderType,
//             });
//         const { totalEndureLoss: totalShopEndureLoss } =
//             await this.getTotalEndureLoss({
//                 startDate,
//                 endDate,
//                 account: 'shop',
//                 orderType,
//             });

//         const { deliveryFee: shopDeliveryFee, riderTip: shopRiderTip } =
//             await this.getShopDeliveryFee({
//                 startDate,
//                 endDate,
//                 orderType,
//             });

//         const {
//             totalAddRemoveCredit: totalShopAddRemoveCredit,
//             secondaryCurrency_totalAddRemoveCredit:
//                 secondaryCurrency_totalShopAddRemoveCredit,
//         } = await this.getShopAddRemoveCredit({
//             startDate,
//             endDate,
//             orderType,
//         });
//         const { totalAddRemoveCredit: baseCurrency_shopAddRemoveCredit } =
//             await this.getShopAddRemoveCredit({
//                 startDate,
//                 endDate,
//                 orderType,
//                 paidCurrency: 'baseCurrency',
//             });
//         const {
//             secondaryCurrency_totalAddRemoveCredit:
//                 secondaryCurrency_shopAddRemoveCredit,
//         } = await this.getShopAddRemoveCredit({
//             startDate,
//             endDate,
//             orderType,
//             paidCurrency: 'secondaryCurrency',
//         });

//         const totalShopEarningFunc = await this.getShopEarning({
//             orderType,
//         });
//         const totalShopEarning = totalShopEarningFunc.totalShopEarning;

//         const totalShopEarningByDateFunc = await this.getShopEarning({
//             startDate,
//             endDate,
//             orderType,
//         });
//         const totalShopEarningByDate =
//             totalShopEarningByDateFunc.totalShopEarning;
//         // const secondaryCurrency_totalShopEarningByDate =
//         //     totalShopEarningByDateFunc.secondaryCurrency_totalShopEarning;

//         // const baseCurrency_shopEarningFunc = await this.getShopEarning({
//         //     startDate,
//         //     endDate,
//         //     paidCurrency: 'baseCurrency',
//         //     orderType,
//         // });
//         // const baseCurrency_shopEarning =
//         //     baseCurrency_shopEarningFunc.totalShopEarning;

//         // const secondaryCurrency_shopEarningFunc = await this.getShopEarning({
//         //     startDate,
//         //     endDate,
//         //     paidCurrency: 'secondaryCurrency',
//         //     orderType,
//         // });
//         // const secondaryCurrency_shopEarning =
//         //     secondaryCurrency_shopEarningFunc.secondaryCurrency_totalShopEarning;

//         const totalShopEarningByOldDateFunc = await this.getShopEarning({
//             startDate: oldStartDate,
//             endDate: oldEndDate,
//             orderType,
//         });
//         const totalShopEarningByOldDate =
//             totalShopEarningByOldDateFunc.totalShopEarning;

//         const totalShopUnsettleFunc = await this.getShopUnSettleAmount({
//             orderType,
//         });
//         const totalShopUnsettle = totalShopUnsettleFunc.totalSellerUnsettle;

//         const totalShopUnsettleByDateFunc = await this.getShopUnSettleAmount({
//             startDate,
//             endDate,
//             orderType,
//         });
//         const totalShopUnsettleByDate =
//             totalShopUnsettleByDateFunc.totalSellerUnsettle;
//         // const secondaryCurrency_totalShopUnsettleByDate =
//         //     totalShopUnsettleByDateFunc.secondaryCurrency_totalSellerUnsettle;

//         // const baseCurrency_shopUnsettleFunc = await this.getShopUnSettleAmount({
//         //     startDate,
//         //     endDate,
//         //     paidCurrency: 'baseCurrency',
//         //     orderType,
//         // });
//         // const baseCurrency_shopUnsettle =
//         //     baseCurrency_shopUnsettleFunc.totalSellerUnsettle;

//         // const secondaryCurrency_shopUnsettleFunc = await this.getShopUnSettleAmount(
//         //     {
//         //         startDate,
//         //         endDate,
//         //         paidCurrency: 'secondaryCurrency',
//         //         orderType,
//         //     }
//         // );
//         // const secondaryCurrency_shopUnsettle =
//         //     secondaryCurrency_shopUnsettleFunc.secondaryCurrency_totalSellerUnsettle;

//         const totalShopUnsettleByOldDateFunc = await this.getShopUnSettleAmount(
//             {
//                 startDate: oldStartDate,
//                 endDate: oldEndDate,
//                 orderType,
//             }
//         );
//         const totalShopUnsettleByOldDate =
//             totalShopUnsettleByOldDateFunc.totalSellerUnsettle;

//         const totalShopProfit = totalShopUnsettle + totalShopEarning;
//         const totalShopProfitByDate =
//             totalShopUnsettleByDate + totalShopEarningByDate;
//         // const secondaryCurrency_totalShopProfitByDate =
//         //     secondaryCurrency_totalShopUnsettleByDate +
//         //     secondaryCurrency_totalShopEarningByDate;
//         const totalShopProfitByOldDate =
//             totalShopUnsettleByOldDate + totalShopEarningByOldDate;

//         // const baseCurrency_shopProfit =
//         //     baseCurrency_shopUnsettle + baseCurrency_shopEarning;
//         // const secondaryCurrency_shopProfit =
//         //     secondaryCurrency_shopUnsettle + secondaryCurrency_shopEarning;

//         const totalShopProfitByDateAvg =
//             (totalShopProfitByDate / totalShopProfit) * 100;
//         const totalShopProfitByOldDateAvg =
//             (totalShopProfitByOldDate / totalShopProfit) * 100;
//         const totalShopProfitAvgInPercentage =
//             totalShopProfitByDateAvg - totalShopProfitByOldDateAvg || 0;

//         //*** Calculate payout end ***/

//         successResponse(res, {
//             message: 'Successfully fetched',
//             data: {
//                 totalDeliveredOrder: totalDeliveredOrderByDate,
//                 totalDeliveredOrderAvgInPercentage,
//                 totalPayoutAvgInPercentage: totalShopProfitAvgInPercentage,
//                 totalAdminProfitAvgInPercentage,
//                 profitBreakdown: {
//                     cash: {
//                         originalOrderAmount_cash,
//                         discount_cash,
//                         loyaltyPoints_cash,
//                         buy1Get1_cash,
//                         couponDiscount_cash,
//                         totalCash,
//                         wallet_cash,
//                     },
//                     online: {
//                         originalOrderAmount_online,
//                         discount_online,
//                         loyaltyPoints_online,
//                         buy1Get1_online,
//                         couponDiscount_online,
//                         totalOnline,
//                         wallet_online,
//                     },
//                     AdminMarketingCashback: {
//                         discount_amc,
//                         buy1Get1_amc,
//                         couponDiscount_amc,
//                         pointsCashback,
//                         adminMarketingCashback,
//                     },
//                     orderAmount,
//                     payout: {
//                         freeDeliveryByShop,
//                         shopCustomerRefund,
//                         shopErrorCharge: totalShopErrorCharge,
//                         // pointsCashback,
//                         shopDeliveryFee,
//                         shopRiderTip,
//                         shopVat: orderStatisticsByDate.totalValue.totalVat,
//                         totalShopAddRemoveCredit,
//                         featuredAmount,
//                         payout:
//                             totalShopProfitByDate -
//                             shopDeliveryFee -
//                             shopRiderTip -
//                             orderStatisticsByDate.totalValue.totalVat +
//                             // pointsCashback +
//                             featuredAmount -
//                             freeDeliveryByShop -
//                             shopCustomerRefund -
//                             totalShopErrorCharge -
//                             totalShopAddRemoveCredit,
//                         totalPayout: totalShopProfitByDate,
//                     },
//                     featuredAmount,
//                     otherPayments: {
//                         adminMarketingCashback,
//                         customerRefund: totalCustomerRefund,
//                         shopCustomerRefund,
//                         freeDeliveryByShop,
//                         shopDeliveryFee: shopDeliveryFee + shopRiderTip,
//                         shopVat: orderStatisticsByDate.totalValue.totalVat,
//                         errorCharge: totalErrorCharge + totalCustomerRefund,
//                         shopErrorCharge:
//                             totalShopErrorCharge + shopCustomerRefund,
//                         totalReplacementOrder,
//                         totalShopReplacementOrder,
//                         totalEndureLoss,
//                         totalShopEndureLoss,
//                         totalOtherPayments:
//                             adminMarketingCashback +
//                             totalCustomerRefund +
//                             shopCustomerRefund +
//                             freeDeliveryByShop +
//                             totalErrorCharge +
//                             totalShopErrorCharge -
//                             shopDeliveryFee -
//                             shopRiderTip -
//                             orderStatisticsByDate.totalValue.totalVat,
//                     },
//                     baseCurrency_adminProfit:
//                         baseCurrency_adminProfit +
//                         featuredAmount -
//                         baseCurrency_customerRefund -
//                         baseCurrency_shopAddRemoveCredit -
//                         baseCurrency_errorCharge,
//                     secondaryCurrency_adminProfit:
//                         secondaryCurrency_adminProfit -
//                         secondaryCurrency_customerRefund -
//                         secondaryCurrency_shopAddRemoveCredit -
//                         secondaryCurrency_errorCharge,
//                     totalAdminProfit:
//                         totalAdminProfitByDate +
//                         featuredAmount -
//                         totalCustomerRefund -
//                         totalShopAddRemoveCredit -
//                         totalErrorCharge,
//                     secondaryCurrency_totalAdminProfit:
//                         secondaryCurrency_totalAdminProfitByDate +
//                         secondaryCurrency_featuredAmount -
//                         secondaryCurrency_totalCustomerRefund -
//                         secondaryCurrency_totalShopAddRemoveCredit -
//                         secondaryCurrency_totalErrorCharge,
//                 },
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
exports.getAdminOrderFinancial = async (req, res) => {
    try {
        const { startDate, endDate, orderType, paidCurrency } = req.query;

        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        const orderStatistics = await this.getOrderStatistics({
            orderType,
        });
        const orderStatisticsByDate = await this.getOrderStatistics({
            startDate,
            endDate,
            orderType,
        });
        const orderStatisticsByOldDate = await this.getOrderStatistics({
            startDate: oldStartDate,
            endDate: oldEndDate,
            orderType,
        });

        // Calculate delivered order start
        const totalDeliveredOrder = orderStatistics.totalDeliveredOrder;
        const totalDeliveredOrderByDate =
            orderStatisticsByDate.totalDeliveredOrder;
        const totalDeliveredOrderByOldDate =
            orderStatisticsByOldDate.totalDeliveredOrder;
        const totalDeliveredOrderByDateAvg =
            (totalDeliveredOrderByDate / totalDeliveredOrder) * 100;
        const totalDeliveredOrderByOldDateAvg =
            (totalDeliveredOrderByOldDate / totalDeliveredOrder) * 100;
        const totalDeliveredOrderAvgInPercentage =
            // totalDeliveredOrderByDateAvg - totalDeliveredOrderByOldDateAvg || 0;
            getIncreasePercentage(
                totalDeliveredOrderByOldDate,
                totalDeliveredOrderByDate
            );
        // Calculate delivered order end

        //** Create summary Start **/
        const orderStatistics_cash = await this.getOrderStatistics({
            startDate,
            endDate,
            paymentMethod: 'cash',
            orderType,
        });
        const orderStatistics_online = await this.getOrderStatistics({
            startDate,
            endDate,
            paymentMethod: 'online',
            orderType,
        });
        const originalOrderAmount_cash =
            orderStatistics_cash.totalValue.productAmount +
            orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
        const discount_cash = orderStatistics_cash.totalValue.totalDiscount;
        const loyaltyPoints_cash =
            orderStatistics_cash.totalValue.totalRewardAmount;
        const buy1Get1_cash =
            orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
        const couponDiscount_cash =
            orderStatistics_cash.totalValue.totalCouponAdminCut +
            orderStatistics_cash.totalValue.totalCouponShopCut;
        const totalCash =
            originalOrderAmount_cash -
            discount_cash -
            loyaltyPoints_cash -
            buy1Get1_cash -
            couponDiscount_cash;
        const wallet_cash = orderStatistics_cash.totalValue.wallet;
        const secondaryCurrency_originalOrderAmount_cash =
            orderStatistics_cash.totalValue.secondaryCurrency_productAmount +
            orderStatistics_cash.totalValue
                .secondaryCurrency_totalDoubleMenuItemPrice;
        const secondaryCurrency_discount_cash =
            orderStatistics_cash.totalValue.secondaryCurrency_totalDiscount;
        const secondaryCurrency_loyaltyPoints_cash =
            orderStatistics_cash.totalValue.secondaryCurrency_totalRewardAmount;
        const secondaryCurrency_buy1Get1_cash =
            orderStatistics_cash.totalValue
                .secondaryCurrency_totalDoubleMenuItemPrice;
        const secondaryCurrency_couponDiscount_cash =
            orderStatistics_cash.totalValue
                .secondaryCurrency_totalCouponAdminCut +
            orderStatistics_cash.totalValue
                .secondaryCurrency_totalCouponShopCut;
        const secondaryCurrency_totalCash =
            secondaryCurrency_originalOrderAmount_cash -
            secondaryCurrency_discount_cash -
            secondaryCurrency_loyaltyPoints_cash -
            secondaryCurrency_buy1Get1_cash -
            secondaryCurrency_couponDiscount_cash;
        const secondaryCurrency_wallet_cash =
            orderStatistics_cash.totalValue.secondaryCurrency_wallet;

        const originalOrderAmount_online =
            orderStatistics_online.totalValue.productAmount +
            orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
        const discount_online = orderStatistics_online.totalValue.totalDiscount;
        const loyaltyPoints_online =
            orderStatistics_online.totalValue.totalRewardAmount;
        const buy1Get1_online =
            orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
        const couponDiscount_online =
            orderStatistics_online.totalValue.totalCouponAdminCut +
            orderStatistics_online.totalValue.totalCouponShopCut;
        const totalOnline =
            originalOrderAmount_online -
            discount_online -
            loyaltyPoints_online -
            buy1Get1_online -
            couponDiscount_online;
        const wallet_online = orderStatistics_online.totalValue.wallet;
        const secondaryCurrency_originalOrderAmount_online =
            orderStatistics_online.totalValue.secondaryCurrency_productAmount +
            orderStatistics_online.totalValue
                .secondaryCurrency_totalDoubleMenuItemPrice;
        const secondaryCurrency_discount_online =
            orderStatistics_online.totalValue.secondaryCurrency_totalDiscount;
        const secondaryCurrency_loyaltyPoints_online =
            orderStatistics_online.totalValue
                .secondaryCurrency_totalRewardAmount;
        const secondaryCurrency_buy1Get1_online =
            orderStatistics_online.totalValue
                .secondaryCurrency_totalDoubleMenuItemPrice;
        const secondaryCurrency_couponDiscount_online =
            orderStatistics_online.totalValue
                .secondaryCurrency_totalCouponAdminCut +
            orderStatistics_online.totalValue
                .secondaryCurrency_totalCouponShopCut;
        const secondaryCurrency_totalOnline =
            secondaryCurrency_originalOrderAmount_online -
            secondaryCurrency_discount_online -
            secondaryCurrency_loyaltyPoints_online -
            secondaryCurrency_buy1Get1_online -
            secondaryCurrency_couponDiscount_online;
        const secondaryCurrency_wallet_online =
            orderStatistics_online.totalValue.secondaryCurrency_wallet;

        const discount_amc =
            orderStatisticsByDate.totalValue.totalAdminDiscount;
        const buy1Get1_amc =
            orderStatisticsByDate.totalValue.totalAdminDoubleMenuItemPrice;
        const couponDiscount_amc =
            orderStatisticsByDate.totalValue.totalCouponAdminCut;
        const pointsCashback = orderStatisticsByDate.totalValue.pointsCashback;
        const adminMarketingCashback =
            discount_amc + buy1Get1_amc + couponDiscount_amc + pointsCashback;
        const secondaryCurrency_discount_amc =
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalAdminDiscount;
        const secondaryCurrency_buy1Get1_amc =
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalAdminDoubleMenuItemPrice;
        const secondaryCurrency_couponDiscount_amc =
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalCouponAdminCut;
        const secondaryCurrency_pointsCashback =
            orderStatisticsByDate.totalValue.secondaryCurrency_pointsCashback;
        const secondaryCurrency_adminMarketingCashback =
            secondaryCurrency_discount_amc +
            secondaryCurrency_buy1Get1_amc +
            secondaryCurrency_couponDiscount_amc +
            secondaryCurrency_pointsCashback;

        const orderAmount = totalCash + totalOnline + adminMarketingCashback;
        const secondaryCurrency_orderAmount =
            secondaryCurrency_totalCash +
            secondaryCurrency_totalOnline +
            secondaryCurrency_adminMarketingCashback;

        const { featuredAmount, secondaryCurrency_featuredAmount } =
            await this.getFeaturedAmount({
                startDate,
                endDate,
                orderType,
            });

        const {
            featuredAmount: featuredAmountByOldDate,
            secondaryCurrency_featuredAmount:
                secondaryCurrency_featuredAmountByOldDate,
        } = await this.getFeaturedAmount({
            startDate: oldStartDate,
            endDate: oldEndDate,
            orderType,
        });

        const {
            refundAmount: totalCustomerRefund,
            secondaryCurrency_refundAmount:
                secondaryCurrency_totalCustomerRefund,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType,
        });

        const {
            refundAmount: totalCustomerRefundByOldDate,
            secondaryCurrency_refundAmount:
                secondaryCurrency_totalCustomerRefundByOldDate,
        } = await this.getTotalRefundAmount({
            startDate: oldStartDate,
            endDate: oldEndDate,
            account: 'admin',
            orderType,
        });

        const { totalErrorCharge, secondaryCurrency_totalErrorCharge } =
            await this.getTotalErrorCharge({
                startDate,
                endDate,
                account: 'admin',
                orderType,
            });

        const {
            totalErrorCharge: totalErrorChargeByOldDate,
            secondaryCurrency_totalErrorCharge:
                secondaryCurrency_totalErrorChargeByOldDate,
        } = await this.getTotalErrorCharge({
            startDate: oldStartDate,
            endDate: oldEndDate,
            account: 'admin',
            orderType,
        });

        const {
            totalReplacementOrder,
            secondaryCurrency_totalReplacementOrder,
        } = await this.getTotalReplacementOrder({
            startDate,
            endDate,
            account: 'admin',
            orderType,
        });
        const { totalEndureLoss, secondaryCurrency_totalEndureLoss } =
            await this.getTotalEndureLoss({
                startDate,
                endDate,
                account: 'admin',
                orderType,
            });

        const freeDeliveryByShop =
            orderStatisticsByDate.totalValue.freeDeliveryShopCut;
        const secondaryCurrency_freeDeliveryByShop =
            orderStatisticsByDate.totalValue
                .secondaryCurrency_freeDeliveryShopCut;

        const { adminFees: totalAdminProfit } = await this.getAdminEarning({
            orderType,
        });
        const {
            adminFees: totalAdminProfitByDate,
            secondaryCurrency_adminFees:
                secondaryCurrency_totalAdminProfitByDate,
        } = await this.getAdminEarning({
            startDate,
            endDate,
            orderType,
        });
        const { adminFees: totalAdminProfitByOldDate } =
            await this.getAdminEarning({
                startDate: oldStartDate,
                endDate: oldEndDate,
                orderType,
            });

        const totalAdminProfitByDateAvg =
            (totalAdminProfitByDate / totalAdminProfit) * 100;
        const totalAdminProfitByOldDateAvg =
            (totalAdminProfitByOldDate / totalAdminProfit) * 100;
        // const totalAdminProfitAvgInPercentage =
        //     totalAdminProfitByDateAvg - totalAdminProfitByOldDateAvg || 0;

        //** Create summary End **/

        //*** Calculate payout start ***/
        const {
            refundAmount: shopCustomerRefund,
            secondaryCurrency_refundAmount:
                secondaryCurrency_shopCustomerRefund,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'shop',
            orderType,
        });

        const {
            totalErrorCharge: totalShopErrorCharge,
            secondaryCurrency_totalErrorCharge:
                secondaryCurrency_totalShopErrorCharge,
        } = await this.getTotalErrorCharge({
            startDate,
            endDate,
            account: 'shop',
            orderType,
        });
        const {
            totalReplacementOrder: totalShopReplacementOrder,
            secondaryCurrency_totalReplacementOrder:
                secondaryCurrency_totalShopReplacementOrder,
        } = await this.getTotalReplacementOrder({
            startDate,
            endDate,
            account: 'shop',
            orderType,
        });
        const {
            totalEndureLoss: totalShopEndureLoss,
            secondaryCurrency_totalEndureLoss:
                secondaryCurrency_totalShopEndureLoss,
        } = await this.getTotalEndureLoss({
            startDate,
            endDate,
            account: 'shop',
            orderType,
        });

        const {
            deliveryFee: shopDeliveryFee,
            riderTip: shopRiderTip,
            secondaryCurrency_deliveryFee: secondaryCurrency_shopDeliveryFee,
            secondaryCurrency_riderTip: secondaryCurrency_shopRiderTip,
        } = await this.getShopDeliveryFee({
            startDate,
            endDate,
            orderType,
        });

        const {
            totalAddRemoveCredit: totalShopAddRemoveCredit,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_totalShopAddRemoveCredit,
        } = await this.getShopAddRemoveCredit({
            startDate,
            endDate,
            orderType,
        });

        const {
            totalAddRemoveCredit: totalShopAddRemoveCreditByOldDate,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_totalShopAddRemoveCreditByOldDate,
        } = await this.getShopAddRemoveCredit({
            startDate: oldStartDate,
            endDate: oldEndDate,
            orderType,
        });
        const { totalShopEarning } = await this.getShopEarning({
            orderType,
        });

        const {
            totalShopEarning: totalShopEarningByDate,
            secondaryCurrency_totalShopEarning:
                secondaryCurrency_totalShopEarningByDate,
        } = await this.getShopEarning({
            startDate,
            endDate,
            orderType,
        });

        const { totalShopEarning: totalShopEarningByOldDate } =
            await this.getShopEarning({
                startDate: oldStartDate,
                endDate: oldEndDate,
                orderType,
            });

        const { totalSellerUnsettle: totalShopUnsettle } =
            await this.getShopUnSettleAmount({
                orderType,
            });

        const {
            totalSellerUnsettle: totalShopUnsettleByDate,
            secondaryCurrency_totalSellerUnsettle:
                secondaryCurrency_totalShopUnsettleByDate,
        } = await this.getShopUnSettleAmount({
            startDate,
            endDate,
            orderType,
        });

        const { totalSellerUnsettle: totalShopUnsettleByOldDate } =
            await this.getShopUnSettleAmount({
                startDate: oldStartDate,
                endDate: oldEndDate,
                orderType,
            });

        const totalShopProfit = totalShopUnsettle + totalShopEarning;
        const totalShopProfitByDate =
            totalShopUnsettleByDate + totalShopEarningByDate;
        const secondaryCurrency_totalShopProfitByDate =
            secondaryCurrency_totalShopUnsettleByDate +
            secondaryCurrency_totalShopEarningByDate;
        const totalShopProfitByOldDate =
            totalShopUnsettleByOldDate + totalShopEarningByOldDate;

        const totalShopProfitByDateAvg =
            (totalShopProfitByDate / totalShopProfit) * 100;
        const totalShopProfitByOldDateAvg =
            (totalShopProfitByOldDate / totalShopProfit) * 100;
        const totalShopProfitAvgInPercentage =
            // totalShopProfitByDateAvg - totalShopProfitByOldDateAvg || 0;
            getIncreasePercentage(
                totalShopProfitByOldDate,
                totalShopProfitByDate
            );
        //*** Calculate payout end ***/

        const totalAdminProfitAvgInPercentage = getIncreasePercentage(
            totalAdminProfitByOldDate +
                featuredAmountByOldDate -
                totalCustomerRefundByOldDate -
                totalShopAddRemoveCreditByOldDate -
                totalErrorChargeByOldDate,

            totalAdminProfitByDate +
                featuredAmount -
                totalCustomerRefund -
                totalShopAddRemoveCredit -
                totalErrorCharge
        );

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                totalDeliveredOrder: totalDeliveredOrderByDate,
                totalDeliveredOrderAvgInPercentage,
                totalPayoutAvgInPercentage: totalShopProfitAvgInPercentage,
                totalAdminProfitAvgInPercentage,
                profitBreakdown: {
                    cash: {
                        originalOrderAmount_cash,
                        discount_cash,
                        loyaltyPoints_cash,
                        buy1Get1_cash,
                        couponDiscount_cash,
                        totalCash,
                        wallet_cash,
                    },
                    online: {
                        originalOrderAmount_online,
                        discount_online,
                        loyaltyPoints_online,
                        buy1Get1_online,
                        couponDiscount_online,
                        totalOnline,
                        wallet_online,
                    },
                    AdminMarketingCashback: {
                        discount_amc,
                        buy1Get1_amc,
                        couponDiscount_amc,
                        pointsCashback,
                        adminMarketingCashback,
                    },
                    orderAmount,
                    payout: {
                        freeDeliveryByShop,
                        shopCustomerRefund,
                        shopErrorCharge: totalShopErrorCharge,
                        shopDeliveryFee,
                        shopRiderTip,
                        // shopVat: orderStatisticsByDate.totalValue.totalVat,
                        totalShopAddRemoveCredit,
                        featuredAmount,
                        // payout:
                        //     totalShopProfitByDate -
                        //     shopDeliveryFee -
                        //     shopRiderTip -
                        //     orderStatisticsByDate.totalValue.totalVat +
                        //     featuredAmount -
                        //     freeDeliveryByShop -
                        //     shopCustomerRefund -
                        //     totalShopErrorCharge -
                        //     totalShopAddRemoveCredit,
                        payout:
                            totalShopProfitByDate -
                            shopDeliveryFee -
                            shopRiderTip +
                            featuredAmount -
                            freeDeliveryByShop -
                            shopCustomerRefund -
                            totalShopErrorCharge -
                            totalShopAddRemoveCredit,
                        totalPayout: totalShopProfitByDate,
                    },
                    featuredAmount,
                    otherPayments: {
                        adminMarketingCashback,
                        customerRefund: totalCustomerRefund,
                        shopCustomerRefund,
                        freeDeliveryByShop,
                        shopDeliveryFee: shopDeliveryFee + shopRiderTip,
                        // shopVat: orderStatisticsByDate.totalValue.totalVat,
                        errorCharge: totalErrorCharge + totalCustomerRefund,
                        shopErrorCharge:
                            totalShopErrorCharge + shopCustomerRefund,
                        totalReplacementOrder,
                        totalShopReplacementOrder,
                        totalEndureLoss,
                        totalShopEndureLoss,
                        // totalOtherPayments:
                        //     adminMarketingCashback +
                        //     totalCustomerRefund +
                        //     shopCustomerRefund +
                        //     freeDeliveryByShop +
                        //     totalErrorCharge +
                        //     totalShopErrorCharge -
                        //     shopDeliveryFee -
                        //     shopRiderTip -
                        //     orderStatisticsByDate.totalValue.totalVat,
                        totalOtherPayments:
                            adminMarketingCashback +
                            totalCustomerRefund +
                            shopCustomerRefund +
                            freeDeliveryByShop +
                            totalErrorCharge +
                            totalShopErrorCharge -
                            shopDeliveryFee -
                            shopRiderTip,
                    },
                    adminVat: orderStatisticsByDate.totalValue.totalVat,
                    totalAdminProfit:
                        totalAdminProfitByDate +
                        featuredAmount -
                        totalCustomerRefund -
                        totalShopAddRemoveCredit -
                        totalErrorCharge,
                },
            };
        } else {
            result = {
                totalDeliveredOrder: totalDeliveredOrderByDate,
                totalDeliveredOrderAvgInPercentage,
                totalPayoutAvgInPercentage: totalShopProfitAvgInPercentage,
                totalAdminProfitAvgInPercentage,
                profitBreakdown: {
                    cash: {
                        originalOrderAmount_cash:
                            secondaryCurrency_originalOrderAmount_cash,
                        discount_cash: secondaryCurrency_discount_cash,
                        loyaltyPoints_cash:
                            secondaryCurrency_loyaltyPoints_cash,
                        buy1Get1_cash: secondaryCurrency_buy1Get1_cash,
                        couponDiscount_cash:
                            secondaryCurrency_couponDiscount_cash,
                        totalCash: secondaryCurrency_totalCash,
                        wallet_cash: secondaryCurrency_wallet_cash,
                    },
                    online: {
                        originalOrderAmount_online:
                            secondaryCurrency_originalOrderAmount_online,
                        discount_online: secondaryCurrency_discount_online,
                        loyaltyPoints_online:
                            secondaryCurrency_loyaltyPoints_online,
                        buy1Get1_online: secondaryCurrency_buy1Get1_online,
                        couponDiscount_online:
                            secondaryCurrency_couponDiscount_online,
                        totalOnline: secondaryCurrency_totalOnline,
                        wallet_online: secondaryCurrency_wallet_online,
                    },
                    AdminMarketingCashback: {
                        discount_amc: secondaryCurrency_discount_amc,
                        buy1Get1_amc: secondaryCurrency_buy1Get1_amc,
                        couponDiscount_amc:
                            secondaryCurrency_couponDiscount_amc,
                        pointsCashback: secondaryCurrency_pointsCashback,
                        adminMarketingCashback:
                            secondaryCurrency_adminMarketingCashback,
                    },
                    orderAmount: secondaryCurrency_orderAmount,
                    payout: {
                        freeDeliveryByShop:
                            secondaryCurrency_freeDeliveryByShop,
                        shopCustomerRefund:
                            secondaryCurrency_shopCustomerRefund,
                        shopErrorCharge: secondaryCurrency_totalShopErrorCharge,
                        shopDeliveryFee: secondaryCurrency_shopDeliveryFee,
                        shopRiderTip: secondaryCurrency_shopRiderTip,
                        totalShopAddRemoveCredit:
                            secondaryCurrency_totalShopAddRemoveCredit,
                        featuredAmount: secondaryCurrency_featuredAmount,
                        payout:
                            secondaryCurrency_totalShopProfitByDate -
                            secondaryCurrency_shopDeliveryFee -
                            secondaryCurrency_shopRiderTip +
                            secondaryCurrency_featuredAmount -
                            secondaryCurrency_freeDeliveryByShop -
                            secondaryCurrency_shopCustomerRefund -
                            secondaryCurrency_totalShopErrorCharge -
                            secondaryCurrency_totalShopAddRemoveCredit,
                        totalPayout: secondaryCurrency_totalShopProfitByDate,
                    },
                    featuredAmount: secondaryCurrency_featuredAmount,
                    otherPayments: {
                        adminMarketingCashback:
                            secondaryCurrency_adminMarketingCashback,
                        customerRefund: secondaryCurrency_totalCustomerRefund,
                        shopCustomerRefund:
                            secondaryCurrency_shopCustomerRefund,
                        freeDeliveryByShop:
                            secondaryCurrency_freeDeliveryByShop,
                        shopDeliveryFee:
                            secondaryCurrency_shopDeliveryFee +
                            secondaryCurrency_shopRiderTip,
                        errorCharge:
                            secondaryCurrency_totalErrorCharge +
                            secondaryCurrency_totalCustomerRefund,
                        shopErrorCharge:
                            secondaryCurrency_totalShopErrorCharge +
                            secondaryCurrency_shopCustomerRefund,
                        totalReplacementOrder:
                            secondaryCurrency_totalReplacementOrder,
                        totalShopReplacementOrder:
                            secondaryCurrency_totalShopReplacementOrder,
                        totalEndureLoss: secondaryCurrency_totalEndureLoss,
                        totalShopEndureLoss:
                            secondaryCurrency_totalShopEndureLoss,
                        totalOtherPayments:
                            secondaryCurrency_adminMarketingCashback +
                            secondaryCurrency_totalCustomerRefund +
                            secondaryCurrency_shopCustomerRefund +
                            secondaryCurrency_freeDeliveryByShop +
                            secondaryCurrency_totalErrorCharge +
                            secondaryCurrency_totalShopErrorCharge -
                            secondaryCurrency_shopDeliveryFee -
                            secondaryCurrency_shopRiderTip,
                    },
                    adminVat:
                        orderStatisticsByDate.totalValue
                            .secondaryCurrency_totalVat,
                    totalAdminProfit:
                        secondaryCurrency_totalAdminProfitByDate +
                        secondaryCurrency_featuredAmount -
                        secondaryCurrency_totalCustomerRefund -
                        secondaryCurrency_totalShopAddRemoveCredit -
                        secondaryCurrency_totalErrorCharge,
                },
            };
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: { ...result },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getShopAdminProfitBreakdown = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            paidCurrency,
            liveStatus,
            sellerId,
            shopType,
            shopStatus,
        } = req.query;

        let config = { deletedAt: null, parentShop: null };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                shopName: RegExp(str, 'i'),
            }));

            const phone_numberQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const emailQ = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: autoGenIdQ },
                            { $and: phone_numberQuery },
                            { $and: emailQ },
                        ],
                    },
                ],
            };
        }

        if (liveStatus && ['online', 'offline', 'busy'].includes(liveStatus)) {
            config.liveStatus = liveStatus;
        }

        if (sellerId) {
            config.seller = sellerId;
        }

        if (
            shopType &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                shopType
            )
        ) {
            config.shopType = shopType;
        }

        if (
            shopStatus &&
            ['active', 'inactive', 'blocked'].includes(shopStatus)
        ) {
            config.shopStatus = shopStatus;
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: ShopModel,
            condition: config,
            pagingRange,
        });

        let shopList = await ShopModel.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        for (const shop of shopList) {
            if (paidCurrency === 'baseCurrency') {
                const { profitBreakdown } =
                    await getShopAdminProfitBreakdownInBaseCurrency(
                        shop._id,
                        startDate,
                        endDate
                    );

                shop._doc.profitBreakdown = profitBreakdown;
            } else {
                const { profitBreakdown } =
                    await getShopAdminProfitBreakdownInSecondaryCurrency(
                        shop._id,
                        startDate,
                        endDate
                    );

                shop._doc.profitBreakdown = profitBreakdown;
            }
        }

        successResponse(res, {
            message: 'Successfully get shops',
            data: {
                shops: shopList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.getAdminDeliveryFinancial = async (req, res) => {
//     try {
//         const { startDate, endDate, orderType } = req.query;

//         const timeDiff =
//             new Date(endDate).getTime() - new Date(startDate).getTime();
//         const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

//         const oldEndDate = new Date(startDate);
//         oldEndDate.setDate(oldEndDate.getDate() - 1);
//         const oldStartDate = new Date(oldEndDate);
//         oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

//         const {
//             totalDeliveredOrder,
//             riderPayout,
//             userPayRiderTip,
//             adminDeliveryProfit,
//         } = await this.getDeliveryFinancial({
//             orderType,
//         });
//         const {
//             totalDeliveredOrder: totalDeliveredOrderByDate,
//             deliveryFee: totalDeliveryFee,
//             userPayDeliveryFee: users,
//             freeDeliveryShopCut: freeDeliveryByShop,
//             freeDeliveryAdminCut: freeDeliveryByAdmin,
//             freeDeliveryAdminCutForSubscription:
//                 freeDeliveryByAdminForSubscription,
//             riderPayout: riderPayoutByDate,
//             userPayRiderTip: userPayRiderTipByDate,
//             adminDeliveryProfit: adminDeliveryProfitByDate,
//             shopRiderSubscriptionLoss: totalShopRiderSubscriptionLoss,
//         } = await this.getDeliveryFinancial({
//             startDate,
//             endDate,
//             orderType,
//         });
//         const {
//             totalDeliveredOrder: totalDeliveredOrderByOldDate,
//             riderPayout: riderPayoutByOldDate,
//             userPayRiderTip: userPayRiderTipByOldDate,
//             adminDeliveryProfit: adminDeliveryProfitByOldDate,
//         } = await this.getDeliveryFinancial({
//             startDate: oldStartDate,
//             endDate: oldEndDate,
//             orderType,
//         });

//         // Calculate admin delivery profit avg start
//         const adminDeliveryProfitByDateAvg =
//             (adminDeliveryProfitByDate / adminDeliveryProfit) * 100;
//         const adminDeliveryProfitByOldDateAvg =
//             (adminDeliveryProfitByOldDate / adminDeliveryProfit) * 100;
//         const adminDeliveryProfitAvgInPercentage =
//             adminDeliveryProfitByDateAvg - adminDeliveryProfitByOldDateAvg || 0;
//         // Calculate admin delivery profit avg end

//         // Calculate delivered order avg start
//         const totalDeliveredOrderByDateAvg =
//             (totalDeliveredOrderByDate / totalDeliveredOrder) * 100;
//         const totalDeliveredOrderByOldDateAvg =
//             (totalDeliveredOrderByOldDate / totalDeliveredOrder) * 100;
//         const totalDeliveredOrderAvgInPercentage =
//             totalDeliveredOrderByDateAvg - totalDeliveredOrderByOldDateAvg || 0;
//         // Calculate delivered order avg end

//         // Calculate rider payout avg start
//         const riderPayoutByDateAvg =
//             ((riderPayoutByDate - userPayRiderTipByDate) /
//                 (riderPayout - userPayRiderTip)) *
//             100;
//         const riderPayoutByOldDateAvg =
//             ((riderPayoutByOldDate - userPayRiderTipByOldDate) /
//                 (riderPayout - userPayRiderTip)) *
//             100;
//         const riderPayoutAvgInPercentage =
//             riderPayoutByDateAvg - riderPayoutByOldDateAvg || 0;
//         // Calculate rider payout avg end

//         const { adminDeliveryProfit: baseCurrency_adminDeliveryProfit } =
//             await this.getDeliveryFinancial({
//                 startDate,
//                 endDate,
//                 orderType,
//                 paidCurrency: 'baseCurrency',
//             });

//         const { secondaryCurrency_adminDeliveryProfit } =
//             await this.getDeliveryFinancial({
//                 startDate,
//                 endDate,
//                 orderType,
//                 paidCurrency: 'secondaryCurrency',
//             });

//         // Calc Admin delivery refund start
//         const { baseCurrency_adminDeliveryRefund: totalCustomerRefund } =
//             await this.getTotalRefundAmount({
//                 startDate,
//                 endDate,
//                 account: 'admin',
//                 orderType,
//             });
//         const {
//             baseCurrency_adminDeliveryRefund: baseCurrency_customerRefund,
//         } = await this.getTotalRefundAmount({
//             startDate,
//             endDate,
//             account: 'admin',
//             orderType,
//             paidCurrency: 'baseCurrency',
//         });
//         const {
//             secondaryCurrency_adminDeliveryRefund:
//                 secondaryCurrency_customerRefund,
//         } = await this.getTotalRefundAmount({
//             startDate,
//             endDate,
//             account: 'admin',
//             orderType,
//             paidCurrency: 'secondaryCurrency',
//         });
//         // Calc Admin delivery refund end

//         successResponse(res, {
//             message: 'Successfully fetched',
//             data: {
//                 totalDeliveredOrder: totalDeliveredOrderByDate,
//                 totalDeliveredOrderAvgInPercentage,
//                 adminDeliveryProfitAvgInPercentage,
//                 riderPayoutAvgInPercentage,
//                 profitBreakdown: {
//                     users,
//                     freeDeliveryByShop,
//                     freeDeliveryByAdmin:
//                         freeDeliveryByAdmin -
//                         freeDeliveryByAdminForSubscription,
//                     freeDeliveryByAdminForSubscription,
//                     totalShopRiderSubscriptionLoss,
//                     totalDeliveryFee,
//                     riderPayout: riderPayoutByDate - userPayRiderTipByDate,
//                     deliveryRefund: totalCustomerRefund,
//                     adminDeliveryProfit:
//                         adminDeliveryProfitByDate - totalCustomerRefund,
//                     baseCurrency_adminDeliveryProfit:
//                         baseCurrency_adminDeliveryProfit -
//                         baseCurrency_customerRefund,
//                     secondaryCurrency_adminDeliveryProfit:
//                         secondaryCurrency_adminDeliveryProfit -
//                         secondaryCurrency_customerRefund,
//                 },
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };

exports.getAdminDeliveryFinancial = async (req, res) => {
    try {
        const { startDate, endDate, orderType, paidCurrency } = req.query;

        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        const {
            totalDeliveredOrder,
            riderPayout,
            userPayRiderTip,
            adminDeliveryProfit,
        } = await this.getDeliveryFinancial({
            orderType,
        });
        const {
            totalDeliveredOrder: totalDeliveredOrderByDate,
            deliveryFee: totalDeliveryFee,
            userPayDeliveryFee: users,
            userPayDeliveryFeeCash: usersCash,
            userPayDeliveryFeeOnline: usersOnline,
            freeDeliveryShopCut: freeDeliveryByShop,
            freeDeliveryAdminCut: freeDeliveryByAdmin,
            freeDeliveryAdminCutForSubscription:
                freeDeliveryByAdminForSubscription,
            riderPayout: riderPayoutByDate,
            userPayRiderTip: userPayRiderTipByDate,
            adminDeliveryProfit: adminDeliveryProfitByDate,
            shopRiderSubscriptionLoss: totalShopRiderSubscriptionLoss,
            secondaryCurrency_deliveryFee: secondaryCurrency_totalDeliveryFee,
            secondaryCurrency_userPayDeliveryFee: secondaryCurrency_users,
            secondaryCurrency_userPayDeliveryFeeCash:
                secondaryCurrency_usersCash,
            secondaryCurrency_userPayDeliveryFeeOnline:
                secondaryCurrency_usersOnline,
            secondaryCurrency_freeDeliveryShopCut:
                secondaryCurrency_freeDeliveryByShop,
            secondaryCurrency_freeDeliveryAdminCut:
                secondaryCurrency_freeDeliveryByAdmin,
            secondaryCurrency_freeDeliveryAdminCutForSubscription:
                secondaryCurrency_freeDeliveryByAdminForSubscription,
            secondaryCurrency_riderPayout: secondaryCurrency_riderPayoutByDate,
            secondaryCurrency_userPayRiderTip:
                secondaryCurrency_userPayRiderTipByDate,
            secondaryCurrency_adminDeliveryProfit:
                secondaryCurrency_adminDeliveryProfitByDate,
            secondaryCurrency_shopRiderSubscriptionLoss:
                secondaryCurrency_totalShopRiderSubscriptionLoss,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
            orderType,
        });
        const {
            totalDeliveredOrder: totalDeliveredOrderByOldDate,
            riderPayout: riderPayoutByOldDate,
            userPayRiderTip: userPayRiderTipByOldDate,
            adminDeliveryProfit: adminDeliveryProfitByOldDate,
        } = await this.getDeliveryFinancial({
            startDate: oldStartDate,
            endDate: oldEndDate,
            orderType,
        });

        // Calculate admin delivery profit avg start
        const adminDeliveryProfitByDateAvg =
            (adminDeliveryProfitByDate / adminDeliveryProfit) * 100;
        const adminDeliveryProfitByOldDateAvg =
            (adminDeliveryProfitByOldDate / adminDeliveryProfit) * 100;
        const adminDeliveryProfitAvgInPercentage =
            adminDeliveryProfitByDateAvg - adminDeliveryProfitByOldDateAvg || 0;
        // Calculate admin delivery profit avg end

        // Calculate delivered order avg start
        const totalDeliveredOrderByDateAvg =
            (totalDeliveredOrderByDate / totalDeliveredOrder) * 100;
        const totalDeliveredOrderByOldDateAvg =
            (totalDeliveredOrderByOldDate / totalDeliveredOrder) * 100;
        const totalDeliveredOrderAvgInPercentage =
            totalDeliveredOrderByDateAvg - totalDeliveredOrderByOldDateAvg || 0;
        // Calculate delivered order avg end

        // Calculate rider payout avg start
        const riderPayoutByDateAvg =
            ((riderPayoutByDate - userPayRiderTipByDate) /
                (riderPayout - userPayRiderTip)) *
            100;
        const riderPayoutByOldDateAvg =
            ((riderPayoutByOldDate - userPayRiderTipByOldDate) /
                (riderPayout - userPayRiderTip)) *
            100;
        const riderPayoutAvgInPercentage =
            riderPayoutByDateAvg - riderPayoutByOldDateAvg || 0;
        // Calculate rider payout avg end

        // Calc Admin delivery refund start
        const {
            baseCurrency_adminDeliveryRefund: totalCustomerRefund,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_totalCustomerRefund,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType,
        });
        // Calc Admin delivery refund end

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                totalDeliveredOrder: totalDeliveredOrderByDate,
                totalDeliveredOrderAvgInPercentage,
                adminDeliveryProfitAvgInPercentage,
                riderPayoutAvgInPercentage,
                profitBreakdown: {
                    users,
                    usersCash,
                    usersOnline,
                    freeDeliveryByShop,
                    freeDeliveryByAdmin:
                        freeDeliveryByAdmin -
                        freeDeliveryByAdminForSubscription,
                    freeDeliveryByAdminForSubscription,
                    totalShopRiderSubscriptionLoss,
                    totalDeliveryFee,
                    riderPayout: riderPayoutByDate - userPayRiderTipByDate,
                    deliveryRefund: totalCustomerRefund,
                    adminDeliveryProfit:
                        adminDeliveryProfitByDate - totalCustomerRefund,
                },
            };
        } else {
            result = {
                totalDeliveredOrder: totalDeliveredOrderByDate,
                totalDeliveredOrderAvgInPercentage,
                adminDeliveryProfitAvgInPercentage,
                riderPayoutAvgInPercentage,
                profitBreakdown: {
                    users: secondaryCurrency_users,
                    usersCash: secondaryCurrency_usersCash,
                    usersOnline: secondaryCurrency_usersOnline,
                    freeDeliveryByShop: secondaryCurrency_freeDeliveryByShop,
                    freeDeliveryByAdmin:
                        secondaryCurrency_freeDeliveryByAdmin -
                        secondaryCurrency_freeDeliveryByAdminForSubscription,
                    freeDeliveryByAdminForSubscription:
                        secondaryCurrency_freeDeliveryByAdminForSubscription,
                    totalShopRiderSubscriptionLoss:
                        secondaryCurrency_totalShopRiderSubscriptionLoss,
                    totalDeliveryFee: secondaryCurrency_totalDeliveryFee,
                    riderPayout:
                        secondaryCurrency_riderPayoutByDate -
                        secondaryCurrency_userPayRiderTipByDate,
                    deliveryRefund: secondaryCurrency_totalCustomerRefund,
                    adminDeliveryProfit:
                        secondaryCurrency_adminDeliveryProfitByDate -
                        secondaryCurrency_totalCustomerRefund,
                },
            };
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: { ...result },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.getAdminGlobalDeliveryFinancial = async (req, res) => {
//     try {
//         const { startDate, endDate } = req.query;

//         const timeDiff =
//             new Date(endDate).getTime() - new Date(startDate).getTime();
//         const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

//         const oldEndDate = new Date(startDate);
//         oldEndDate.setDate(oldEndDate.getDate() - 1);
//         const oldStartDate = new Date(oldEndDate);
//         oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

//         const {
//             totalDeliveredOrder: totalDeliveredNormalOrder,
//             riderPayout: riderPayoutFromOrder,
//             userPayRiderTip,
//             adminDeliveryProfit: adminDeliveryProfitFromOrder,
//         } = await this.getDeliveryFinancial({});
//         const {
//             totalDeliveredOrder: totalDeliveredButlerOrder,
//             riderPayout: riderPayoutFromButler,
//             adminButlerProfit: adminDeliveryProfitFromButler,
//         } = await this.getButlerFinancial({});

//         const totalDeliveredOrder =
//             totalDeliveredNormalOrder + totalDeliveredButlerOrder;
//         const riderPayout = riderPayoutFromOrder + riderPayoutFromButler;
//         const adminDeliveryProfit =
//             adminDeliveryProfitFromOrder + adminDeliveryProfitFromButler;

//         const {
//             totalDeliveredOrder: totalDeliveredNormalOrderByDate,
//             deliveryFee: totalDeliveryFeeFromOrder,
//             userPayDeliveryFee: usersFromDelivery,
//             freeDeliveryShopCut: freeDeliveryByShop,
//             freeDeliveryAdminCut: freeDeliveryByAdmin,
//             freeDeliveryAdminCutForSubscription:
//                 freeDeliveryByAdminForSubscription,
//             riderPayout: riderPayoutByDateFromOrder,
//             userPayRiderTip: userPayRiderTipByDate,
//             adminDeliveryProfit: adminDeliveryProfitByDateFromOrder,
//             shopRiderSubscriptionLoss: totalShopRiderSubscriptionLoss,
//         } = await this.getDeliveryFinancial({
//             startDate,
//             endDate,
//         });
//         const {
//             totalDeliveredOrder: totalDeliveredButlerOrderByDate,
//             orderAmount: totalDeliveryFeeFromButler,
//             riderPayout: riderPayoutByDateFromButler,
//             adminButlerProfit: adminDeliveryProfitByDateFromButler,
//         } = await this.getButlerFinancial({
//             startDate,
//             endDate,
//         });

//         const totalDeliveredOrderByDate =
//             totalDeliveredNormalOrderByDate + totalDeliveredButlerOrderByDate;
//         const totalDeliveryFee =
//             totalDeliveryFeeFromOrder + totalDeliveryFeeFromButler;
//         const users = usersFromDelivery + totalDeliveryFeeFromButler;
//         const riderPayoutByDate =
//             riderPayoutByDateFromOrder + riderPayoutByDateFromButler;
//         const adminDeliveryProfitByDate =
//             adminDeliveryProfitByDateFromOrder +
//             adminDeliveryProfitByDateFromButler;

//         const {
//             totalDeliveredOrder: totalDeliveredNormalOrderByOldDate,
//             riderPayout: riderPayoutByOldDateFromOrder,
//             userPayRiderTip: userPayRiderTipByOldDate,
//             adminDeliveryProfit: adminDeliveryProfitByOldDateFromOrder,
//         } = await this.getDeliveryFinancial({
//             startDate: oldStartDate,
//             endDate: oldEndDate,
//         });
//         const {
//             totalDeliveredOrder: totalDeliveredButlerOrderByOldDate,
//             riderPayout: riderPayoutByOldDateFromButler,
//             adminButlerProfit: adminDeliveryProfitByOldDateFromButler,
//         } = await this.getButlerFinancial({
//             startDate: oldStartDate,
//             endDate: oldEndDate,
//         });
//         const totalDeliveredOrderByOldDate =
//             totalDeliveredNormalOrderByOldDate +
//             totalDeliveredButlerOrderByOldDate;
//         const riderPayoutByOldDate =
//             riderPayoutByOldDateFromOrder + riderPayoutByOldDateFromButler;
//         const adminDeliveryProfitByOldDate =
//             adminDeliveryProfitByOldDateFromOrder +
//             adminDeliveryProfitByOldDateFromButler;

//         // Calculate admin delivery profit avg start
//         const adminDeliveryProfitByDateAvg =
//             (adminDeliveryProfitByDate / adminDeliveryProfit) * 100;
//         const adminDeliveryProfitByOldDateAvg =
//             (adminDeliveryProfitByOldDate / adminDeliveryProfit) * 100;
//         const adminDeliveryProfitAvgInPercentage =
//             adminDeliveryProfitByDateAvg - adminDeliveryProfitByOldDateAvg || 0;
//         // Calculate admin delivery profit avg end

//         // Calculate delivered order avg start
//         const totalDeliveredOrderByDateAvg =
//             (totalDeliveredOrderByDate / totalDeliveredOrder) * 100;
//         const totalDeliveredOrderByOldDateAvg =
//             (totalDeliveredOrderByOldDate / totalDeliveredOrder) * 100;
//         const totalDeliveredOrderAvgInPercentage =
//             totalDeliveredOrderByDateAvg - totalDeliveredOrderByOldDateAvg || 0;
//         // Calculate delivered order avg end

//         // Calculate rider payout avg start
//         const riderPayoutByDateAvg =
//             ((riderPayoutByDate - userPayRiderTipByDate) /
//                 (riderPayout - userPayRiderTip)) *
//             100;
//         const riderPayoutByOldDateAvg =
//             ((riderPayoutByOldDate - userPayRiderTipByOldDate) /
//                 (riderPayout - userPayRiderTip)) *
//             100;
//         const riderPayoutAvgInPercentage =
//             riderPayoutByDateAvg - riderPayoutByOldDateAvg || 0;
//         // Calculate rider payout avg end

//         const {
//             adminDeliveryProfit: baseCurrency_adminDeliveryProfitFromOrder,
//         } = await this.getDeliveryFinancial({
//             startDate,
//             endDate,
//             paidCurrency: 'baseCurrency',
//         });
//         const {
//             adminButlerProfit: baseCurrency_adminDeliveryProfitFromButler,
//         } = await this.getButlerFinancial({
//             startDate,
//             endDate,
//             paidCurrency: 'baseCurrency',
//         });

//         const baseCurrency_adminDeliveryProfit =
//             baseCurrency_adminDeliveryProfitFromOrder +
//             baseCurrency_adminDeliveryProfitFromButler;

//         const {
//             secondaryCurrency_adminDeliveryProfit:
//                 secondaryCurrency_adminDeliveryProfitFromOrder,
//         } = await this.getDeliveryFinancial({
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });
//         const {
//             secondaryCurrency_adminButlerProfit:
//                 secondaryCurrency_adminDeliveryProfitFromButler,
//         } = await this.getButlerFinancial({
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });

//         const secondaryCurrency_adminDeliveryProfit =
//             secondaryCurrency_adminDeliveryProfitFromOrder +
//             secondaryCurrency_adminDeliveryProfitFromButler;

//         // Calc Admin delivery refund start
//         const { baseCurrency_adminDeliveryRefund: totalCustomerRefund } =
//             await this.getTotalRefundAmount({
//                 startDate,
//                 endDate,
//                 account: 'admin',
//             });
//         const {
//             baseCurrency_adminDeliveryRefund: baseCurrency_customerRefund,
//         } = await this.getTotalRefundAmount({
//             startDate,
//             endDate,
//             account: 'admin',
//             paidCurrency: 'baseCurrency',
//         });
//         const {
//             secondaryCurrency_adminDeliveryRefund:
//                 secondaryCurrency_customerRefund,
//         } = await this.getTotalRefundAmount({
//             startDate,
//             endDate,
//             account: 'admin',
//             paidCurrency: 'secondaryCurrency',
//         });
//         // Calc Admin delivery refund end

//         // Calc Rider add remove credit start
//         const { totalAddRemoveCredit: addRemoveCreditFromRider } =
//             await this.getRiderAddRemoveCredit({
//                 startDate,
//                 endDate,
//             });
//         const { totalAddRemoveCredit: baseCurrency_addRemoveCreditFromRider } =
//             await this.getRiderAddRemoveCredit({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'baseCurrency',
//             });
//         const {
//             secondaryCurrency_totalAddRemoveCredit:
//                 secondaryCurrency_addRemoveCreditFromRider,
//         } = await this.getRiderAddRemoveCredit({
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });
//         // Calc Rider add remove credit end

//         // Calc Rider weekly reward start
//         const { riderWeeklyReward } = await this.getRiderWeeklyReward({
//             startDate,
//             endDate,
//         });
//         const { riderWeeklyReward: baseCurrency_riderWeeklyReward } =
//             await this.getRiderWeeklyReward({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'baseCurrency',
//             });
//         const {
//             secondaryCurrency_riderWeeklyReward:
//                 secondaryCurrency_riderWeeklyReward,
//         } = await this.getRiderWeeklyReward({
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });
//         // Calc Rider weekly reward end

//         successResponse(res, {
//             message: 'Successfully fetched',
//             data: {
//                 totalDeliveredOrder: totalDeliveredOrderByDate,
//                 totalDeliveredOrderAvgInPercentage,
//                 adminDeliveryProfitAvgInPercentage,
//                 riderPayoutAvgInPercentage,
//                 profitBreakdown: {
//                     users,
//                     freeDeliveryByShop,
//                     freeDeliveryByAdmin:
//                         freeDeliveryByAdmin -
//                         freeDeliveryByAdminForSubscription,
//                     freeDeliveryByAdminForSubscription,
//                     totalShopRiderSubscriptionLoss,
//                     totalDeliveryFee,
//                     riderTips: userPayRiderTipByDate,
//                     riderPayout:
//                         riderPayoutByDate +
//                         addRemoveCreditFromRider +
//                         riderWeeklyReward,
//                     deliveryRefund: totalCustomerRefund,
//                     // addRemoveCreditFromRider,
//                     // riderWeeklyReward,
//                     adminDeliveryProfit:
//                         adminDeliveryProfitByDate -
//                         totalCustomerRefund -
//                         addRemoveCreditFromRider -
//                         riderWeeklyReward,
//                     baseCurrency_adminDeliveryProfit:
//                         baseCurrency_adminDeliveryProfit -
//                         baseCurrency_customerRefund -
//                         baseCurrency_addRemoveCreditFromRider -
//                         baseCurrency_riderWeeklyReward,
//                     secondaryCurrency_adminDeliveryProfit:
//                         secondaryCurrency_adminDeliveryProfit -
//                         secondaryCurrency_customerRefund -
//                         secondaryCurrency_addRemoveCreditFromRider -
//                         secondaryCurrency_riderWeeklyReward,
//                 },
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
exports.getAdminGlobalDeliveryFinancial = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        const {
            totalDeliveredOrder: totalDeliveredNormalOrder,
            riderPayout: riderPayoutFromOrder,
            userPayRiderTip,
            adminDeliveryProfit: adminDeliveryProfitFromOrder,
        } = await this.getDeliveryFinancial({});
        const {
            totalDeliveredOrder: totalDeliveredButlerOrder,
            riderPayout: riderPayoutFromButler,
            adminButlerProfit: adminDeliveryProfitFromButler,
        } = await this.getButlerFinancial({});

        const totalDeliveredOrder =
            totalDeliveredNormalOrder + totalDeliveredButlerOrder;
        const riderPayout = riderPayoutFromOrder + riderPayoutFromButler;
        const adminDeliveryProfit =
            adminDeliveryProfitFromOrder + adminDeliveryProfitFromButler;

        const {
            totalDeliveredOrder: totalDeliveredNormalOrderByDate,
            deliveryFee: totalDeliveryFeeFromOrder,
            userPayDeliveryFee: usersFromDelivery,
            freeDeliveryShopCut: freeDeliveryByShop,
            freeDeliveryAdminCut: freeDeliveryByAdmin,
            freeDeliveryAdminCutForSubscription:
                freeDeliveryByAdminForSubscription,
            riderPayout: riderPayoutByDateFromOrder,
            userPayRiderTip: userPayRiderTipByDate,
            adminDeliveryProfit: adminDeliveryProfitByDateFromOrder,
            shopRiderSubscriptionLoss: totalShopRiderSubscriptionLoss,
            secondaryCurrency_deliveryFee:
                secondaryCurrency_totalDeliveryFeeFromOrder,
            secondaryCurrency_userPayDeliveryFee:
                secondaryCurrency_usersFromDelivery,
            secondaryCurrency_freeDeliveryShopCut:
                secondaryCurrency_freeDeliveryByShop,
            secondaryCurrency_freeDeliveryAdminCut:
                secondaryCurrency_freeDeliveryByAdmin,
            secondaryCurrency_freeDeliveryAdminCutForSubscription:
                secondaryCurrency_freeDeliveryByAdminForSubscription,
            secondaryCurrency_riderPayout:
                secondaryCurrency_riderPayoutByDateFromOrder,
            secondaryCurrency_userPayRiderTip:
                secondaryCurrency_userPayRiderTipByDate,
            secondaryCurrency_adminDeliveryProfit:
                secondaryCurrency_adminDeliveryProfitByDateFromOrder,
            secondaryCurrency_shopRiderSubscriptionLoss:
                secondaryCurrency_totalShopRiderSubscriptionLoss,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
        });
        const {
            totalDeliveredOrder: totalDeliveredButlerOrderByDate,
            orderAmount: totalDeliveryFeeFromButler,
            riderPayout: riderPayoutByDateFromButler,
            adminButlerProfit: adminDeliveryProfitByDateFromButler,
            secondaryCurrency_orderAmount:
                secondaryCurrency_totalDeliveryFeeFromButler,
            secondaryCurrency_riderPayout:
                secondaryCurrency_riderPayoutByDateFromButler,
            secondaryCurrency_adminButlerProfit:
                secondaryCurrency_adminDeliveryProfitByDateFromButler,
        } = await this.getButlerFinancial({
            startDate,
            endDate,
        });

        const totalDeliveredOrderByDate =
            totalDeliveredNormalOrderByDate + totalDeliveredButlerOrderByDate;
        const totalDeliveryFee =
            totalDeliveryFeeFromOrder + totalDeliveryFeeFromButler;
        const users = usersFromDelivery + totalDeliveryFeeFromButler;
        const riderPayoutByDate =
            riderPayoutByDateFromOrder + riderPayoutByDateFromButler;
        const adminDeliveryProfitByDate =
            adminDeliveryProfitByDateFromOrder +
            adminDeliveryProfitByDateFromButler;
        const secondaryCurrency_totalDeliveryFee =
            secondaryCurrency_totalDeliveryFeeFromOrder +
            secondaryCurrency_totalDeliveryFeeFromButler;
        const secondaryCurrency_users =
            secondaryCurrency_usersFromDelivery +
            secondaryCurrency_totalDeliveryFeeFromButler;
        const secondaryCurrency_riderPayoutByDate =
            secondaryCurrency_riderPayoutByDateFromOrder +
            secondaryCurrency_riderPayoutByDateFromButler;
        const secondaryCurrency_adminDeliveryProfitByDate =
            secondaryCurrency_adminDeliveryProfitByDateFromOrder +
            secondaryCurrency_adminDeliveryProfitByDateFromButler;

        const {
            totalDeliveredOrder: totalDeliveredNormalOrderByOldDate,
            riderPayout: riderPayoutByOldDateFromOrder,
            userPayRiderTip: userPayRiderTipByOldDate,
            adminDeliveryProfit: adminDeliveryProfitByOldDateFromOrder,
        } = await this.getDeliveryFinancial({
            startDate: oldStartDate,
            endDate: oldEndDate,
        });
        const {
            totalDeliveredOrder: totalDeliveredButlerOrderByOldDate,
            riderPayout: riderPayoutByOldDateFromButler,
            adminButlerProfit: adminDeliveryProfitByOldDateFromButler,
        } = await this.getButlerFinancial({
            startDate: oldStartDate,
            endDate: oldEndDate,
        });
        const totalDeliveredOrderByOldDate =
            totalDeliveredNormalOrderByOldDate +
            totalDeliveredButlerOrderByOldDate;
        const riderPayoutByOldDate =
            riderPayoutByOldDateFromOrder + riderPayoutByOldDateFromButler;
        const adminDeliveryProfitByOldDate =
            adminDeliveryProfitByOldDateFromOrder +
            adminDeliveryProfitByOldDateFromButler;

        // Calculate admin delivery profit avg start
        const adminDeliveryProfitByDateAvg =
            (adminDeliveryProfitByDate / adminDeliveryProfit) * 100;
        const adminDeliveryProfitByOldDateAvg =
            (adminDeliveryProfitByOldDate / adminDeliveryProfit) * 100;
        const adminDeliveryProfitAvgInPercentage =
            adminDeliveryProfitByDateAvg - adminDeliveryProfitByOldDateAvg || 0;
        // Calculate admin delivery profit avg end

        // Calculate delivered order avg start
        const totalDeliveredOrderByDateAvg =
            (totalDeliveredOrderByDate / totalDeliveredOrder) * 100;
        const totalDeliveredOrderByOldDateAvg =
            (totalDeliveredOrderByOldDate / totalDeliveredOrder) * 100;
        const totalDeliveredOrderAvgInPercentage =
            totalDeliveredOrderByDateAvg - totalDeliveredOrderByOldDateAvg || 0;
        // Calculate delivered order avg end

        // Calculate rider payout avg start
        const riderPayoutByDateAvg =
            ((riderPayoutByDate - userPayRiderTipByDate) /
                (riderPayout - userPayRiderTip)) *
            100;
        const riderPayoutByOldDateAvg =
            ((riderPayoutByOldDate - userPayRiderTipByOldDate) /
                (riderPayout - userPayRiderTip)) *
            100;
        const riderPayoutAvgInPercentage =
            riderPayoutByDateAvg - riderPayoutByOldDateAvg || 0;
        // Calculate rider payout avg end

        // Calc Admin delivery refund start
        const {
            baseCurrency_adminDeliveryRefund: totalCustomerRefund,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_totalCustomerRefund,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
        });
        // Calc Admin delivery refund end

        // Calc Rider add remove credit start
        const {
            totalAddRemoveCredit: addRemoveCreditFromRider,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_addRemoveCreditFromRider,
        } = await this.getRiderAddRemoveCredit({
            startDate,
            endDate,
        });
        // Calc Rider add remove credit end

        // Calc Rider weekly reward start
        const { riderWeeklyReward, secondaryCurrency_riderWeeklyReward } =
            await this.getRiderWeeklyReward({
                startDate,
                endDate,
            });
        // Calc Rider weekly reward end

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                totalDeliveredOrder: totalDeliveredOrderByDate,
                totalDeliveredOrderAvgInPercentage,
                adminDeliveryProfitAvgInPercentage,
                riderPayoutAvgInPercentage,
                profitBreakdown: {
                    users,
                    freeDeliveryByShop,
                    freeDeliveryByAdmin:
                        freeDeliveryByAdmin -
                        freeDeliveryByAdminForSubscription,
                    freeDeliveryByAdminForSubscription,
                    totalShopRiderSubscriptionLoss,
                    totalDeliveryFee,
                    riderTips: userPayRiderTipByDate,
                    riderPayout:
                        riderPayoutByDate +
                        addRemoveCreditFromRider +
                        riderWeeklyReward,
                    deliveryRefund: totalCustomerRefund,
                    adminDeliveryProfit:
                        adminDeliveryProfitByDate -
                        totalCustomerRefund -
                        addRemoveCreditFromRider -
                        riderWeeklyReward,
                },
            };
        } else {
            result = {
                totalDeliveredOrder: totalDeliveredOrderByDate,
                totalDeliveredOrderAvgInPercentage,
                adminDeliveryProfitAvgInPercentage,
                riderPayoutAvgInPercentage,
                profitBreakdown: {
                    users: secondaryCurrency_users,
                    freeDeliveryByShop: secondaryCurrency_freeDeliveryByShop,
                    freeDeliveryByAdmin:
                        secondaryCurrency_freeDeliveryByAdmin -
                        secondaryCurrency_freeDeliveryByAdminForSubscription,
                    freeDeliveryByAdminForSubscription:
                        secondaryCurrency_freeDeliveryByAdminForSubscription,
                    totalShopRiderSubscriptionLoss:
                        secondaryCurrency_totalShopRiderSubscriptionLoss,
                    totalDeliveryFee: secondaryCurrency_totalDeliveryFee,
                    riderTips: secondaryCurrency_userPayRiderTipByDate,
                    riderPayout:
                        secondaryCurrency_riderPayoutByDate +
                        secondaryCurrency_addRemoveCreditFromRider +
                        secondaryCurrency_riderWeeklyReward,
                    deliveryRefund: secondaryCurrency_totalCustomerRefund,
                    adminDeliveryProfit:
                        secondaryCurrency_adminDeliveryProfitByDate -
                        secondaryCurrency_totalCustomerRefund -
                        secondaryCurrency_addRemoveCreditFromRider -
                        secondaryCurrency_riderWeeklyReward,
                },
            };
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: { ...result },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.getRiderAdminProfitBreakdown = async (req, res) => {
//     try {
//         const {
//             page = 1,
//             pageSize = 50,
//             pagingRange = 5,
//             sortBy = 'DESC',
//             startDate,
//             endDate,
//             searchKey,
//             liveStatus,
//             status,
//             orderType,
//             paidCurrency,
//         } = req.query;

//         let whereConfig = {
//             deletedAt: null,
//             deliveryBoyType: 'dropRider',
//         };

//         if (searchKey) {
//             const newQuery = searchKey.split(/[ ,]+/);
//             const nameSearchQuery = newQuery.map(str => ({
//                 name: RegExp(str, 'i'),
//             }));

//             const autoGenIdQ = newQuery.map(str => ({
//                 autoGenId: RegExp(str, 'i'),
//             }));

//             whereConfig = {
//                 ...whereConfig,
//                 $and: [
//                     {
//                         $or: [{ $and: nameSearchQuery }, { $and: autoGenIdQ }],
//                     },
//                 ],
//             };
//         }

//         if (status && ['active', 'deactive'].includes(status)) {
//             whereConfig = {
//                 ...whereConfig,
//                 status,
//             };
//         }

//         if (liveStatus && ['online', 'offline'].includes(liveStatus)) {
//             whereConfig = {
//                 ...whereConfig,
//                 liveStatus,
//             };
//         }

//         let paginate = await pagination({
//             page,
//             pageSize,
//             model: DeliveryBoyModel,
//             condition: whereConfig,
//             pagingRange,
//         });

//         const riderList = await DeliveryBoyModel.find(whereConfig)
//             .sort({ createdAt: sortBy })
//             .skip(paginate.offset)
//             .limit(paginate.limit);

//         for (const rider of riderList) {
//             if (paidCurrency === 'baseCurrency') {
//                 const {
//                     deliveryFee: totalDeliveryFee,
//                     userPayDeliveryFee: users,
//                     freeDeliveryShopCut: freeDeliveryByShop,
//                     freeDeliveryAdminCut: freeDeliveryByAdmin,
//                     riderPayout,
//                     userPayRiderTip,
//                     adminDeliveryProfit,
//                 } = await this.getDeliveryFinancial({
//                     riderId: rider._id,
//                     startDate,
//                     endDate,
//                     orderType,
//                     paidCurrency,
//                 });

//                 const profitBreakdown = {
//                     users,
//                     freeDeliveryByShop,
//                     freeDeliveryByAdmin,
//                     totalDeliveryFee,
//                     riderPayout: riderPayout - userPayRiderTip,
//                     adminDeliveryProfit,
//                 };

//                 rider._doc.profitBreakdown = profitBreakdown;
//             } else {
//                 const {
//                     secondaryCurrency_deliveryFee: totalDeliveryFee,
//                     secondaryCurrency_userPayDeliveryFee: users,
//                     secondaryCurrency_freeDeliveryShopCut: freeDeliveryByShop,
//                     secondaryCurrency_freeDeliveryAdminCut: freeDeliveryByAdmin,
//                     secondaryCurrency_riderPayout: riderPayout,
//                     secondaryCurrency_userPayRiderTip: userPayRiderTip,
//                     secondaryCurrency_adminDeliveryProfit: adminDeliveryProfit,
//                 } = await this.getDeliveryFinancial({
//                     riderId: rider._id,
//                     startDate,
//                     endDate,
//                     orderType,
//                     paidCurrency,
//                 });

//                 const profitBreakdown = {
//                     users,
//                     freeDeliveryByShop,
//                     freeDeliveryByAdmin,
//                     totalDeliveryFee,
//                     riderPayout: riderPayout - userPayRiderTip,
//                     adminDeliveryProfit,
//                 };

//                 rider._doc.profitBreakdown = profitBreakdown;
//             }
//         }

//         successResponse(res, {
//             message: 'Successfully get riders',
//             data: {
//                 riders: riderList,
//                 paginate,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
exports.getShopAdminDeliveryProfitBreakdown = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            paidCurrency,
            liveStatus,
            sellerId,
            shopType,
            shopStatus,
        } = req.query;

        let config = { deletedAt: null, parentShop: null };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                shopName: RegExp(str, 'i'),
            }));

            const phone_numberQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const emailQ = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: autoGenIdQ },
                            { $and: phone_numberQuery },
                            { $and: emailQ },
                        ],
                    },
                ],
            };
        }

        if (liveStatus && ['online', 'offline', 'busy'].includes(liveStatus)) {
            config.liveStatus = liveStatus;
        }

        if (sellerId) {
            config.seller = sellerId;
        }

        if (
            shopType &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                shopType
            )
        ) {
            config.shopType = shopType;
        }

        if (
            shopStatus &&
            ['active', 'inactive', 'blocked'].includes(shopStatus)
        ) {
            config.shopStatus = shopStatus;
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: ShopModel,
            condition: config,
            pagingRange,
        });

        let shopList = await ShopModel.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        for (const shop of shopList) {
            if (paidCurrency === 'baseCurrency') {
                const {
                    deliveryFee: totalDeliveryFee,
                    userPayDeliveryFee: users,
                    freeDeliveryShopCut: freeDeliveryByShop,
                    freeDeliveryAdminCut: freeDeliveryByAdmin,
                    freeDeliveryAdminCutForSubscription:
                        freeDeliveryByAdminForSubscription,
                    riderPayout,
                    userPayRiderTip,
                    adminDeliveryProfit,
                    shopRiderSubscriptionLoss: totalShopRiderSubscriptionLoss,
                } = await this.getDeliveryFinancial({
                    shopId: shop._id,
                    startDate,
                    endDate,
                    // paidCurrency,
                });

                // Calc Admin delivery refund start
                const { baseCurrency_adminDeliveryRefund: deliveryRefund } =
                    await this.getTotalRefundAmount({
                        type: 'shop',
                        id: shop._id,
                        startDate,
                        endDate,
                        account: 'admin',
                        // paidCurrency,
                    });
                // Calc Admin delivery refund end

                const profitBreakdown = {
                    users,
                    freeDeliveryByShop,
                    freeDeliveryByAdmin:
                        freeDeliveryByAdmin -
                        freeDeliveryByAdminForSubscription,
                    freeDeliveryByAdminForSubscription,
                    totalShopRiderSubscriptionLoss,
                    totalDeliveryFee,
                    riderPayout: riderPayout - userPayRiderTip,
                    deliveryRefund,
                    adminDeliveryProfit: adminDeliveryProfit - deliveryRefund,
                };

                shop._doc.profitBreakdown = profitBreakdown;
            } else {
                const {
                    secondaryCurrency_deliveryFee: totalDeliveryFee,
                    secondaryCurrency_userPayDeliveryFee: users,
                    secondaryCurrency_freeDeliveryShopCut: freeDeliveryByShop,
                    secondaryCurrency_freeDeliveryAdminCut: freeDeliveryByAdmin,
                    secondaryCurrency_freeDeliveryAdminCutForSubscription:
                        freeDeliveryByAdminForSubscription,
                    secondaryCurrency_riderPayout: riderPayout,
                    secondaryCurrency_userPayRiderTip: userPayRiderTip,
                    secondaryCurrency_adminDeliveryProfit: adminDeliveryProfit,
                    secondaryCurrency_shopRiderSubscriptionLoss:
                        totalShopRiderSubscriptionLoss,
                } = await this.getDeliveryFinancial({
                    shopId: shop._id,
                    startDate,
                    endDate,
                    // paidCurrency,
                });

                // Calc Admin delivery refund start
                const {
                    secondaryCurrency_adminDeliveryRefund: deliveryRefund,
                } = await this.getTotalRefundAmount({
                    type: 'shop',
                    id: shop._id,
                    startDate,
                    endDate,
                    account: 'admin',
                    // paidCurrency,
                });
                // Calc Admin delivery refund end

                const profitBreakdown = {
                    users,
                    freeDeliveryByShop,
                    freeDeliveryByAdmin:
                        freeDeliveryByAdmin -
                        freeDeliveryByAdminForSubscription,
                    freeDeliveryByAdminForSubscription,
                    totalShopRiderSubscriptionLoss,
                    totalDeliveryFee,
                    riderPayout: riderPayout - userPayRiderTip,
                    deliveryRefund,
                    adminDeliveryProfit: adminDeliveryProfit - deliveryRefund,
                };

                shop._doc.profitBreakdown = profitBreakdown;
            }
        }

        successResponse(res, {
            message: 'Successfully get shops',
            data: {
                shops: shopList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.getAdminButlerFinancial = async (req, res) => {
//     try {
//         const { startDate, endDate } = req.query;

//         const timeDiff =
//             new Date(endDate).getTime() - new Date(startDate).getTime();
//         const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

//         const oldEndDate = new Date(startDate);
//         oldEndDate.setDate(oldEndDate.getDate() - 1);
//         const oldStartDate = new Date(oldEndDate);
//         oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

//         const { totalDeliveredOrder, riderPayout, adminButlerProfit } =
//             await this.getButlerFinancial({});
//         const {
//             totalDeliveredOrder: totalDeliveredOrderByDate,
//             orderAmount: totalOrderAmount,
//             riderPayout: riderPayoutByDate,
//             adminButlerProfit: adminButlerProfitByDate,
//         } = await this.getButlerFinancial({
//             startDate,
//             endDate,
//         });
//         const {
//             totalDeliveredOrder: totalDeliveredOrderByOldDate,
//             riderPayout: riderPayoutByOldDate,
//             adminButlerProfit: adminButlerProfitByOldDate,
//         } = await this.getButlerFinancial({
//             startDate: oldStartDate,
//             endDate: oldEndDate,
//         });

//         // Calculate admin delivery profit avg start
//         const adminButlerProfitByDateAvg =
//             (adminButlerProfitByDate / adminButlerProfit) * 100;
//         const adminButlerProfitByOldDateAvg =
//             (adminButlerProfitByOldDate / adminButlerProfit) * 100;
//         const adminButlerProfitAvgInPercentage =
//             adminButlerProfitByDateAvg - adminButlerProfitByOldDateAvg || 0;
//         // Calculate admin delivery profit avg end

//         // Calculate delivered order avg start
//         const totalDeliveredOrderByDateAvg =
//             (totalDeliveredOrderByDate / totalDeliveredOrder) * 100;
//         const totalDeliveredOrderByOldDateAvg =
//             (totalDeliveredOrderByOldDate / totalDeliveredOrder) * 100;
//         const totalDeliveredOrderAvgInPercentage =
//             totalDeliveredOrderByDateAvg - totalDeliveredOrderByOldDateAvg || 0;
//         // Calculate delivered order avg end

//         // Calculate rider payout avg start
//         const riderPayoutByDateAvg = (riderPayoutByDate / riderPayout) * 100;
//         const riderPayoutByOldDateAvg =
//             (riderPayoutByOldDate / riderPayout) * 100;
//         const riderPayoutAvgInPercentage =
//             riderPayoutByDateAvg - riderPayoutByOldDateAvg || 0;
//         // Calculate rider payout avg end

//         const { adminButlerProfit: baseCurrency_adminButlerProfit } =
//             await this.getButlerFinancial({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'baseCurrency',
//             });

//         const { secondaryCurrency_adminButlerProfit } =
//             await this.getButlerFinancial({
//                 startDate,
//                 endDate,
//                 paidCurrency: 'secondaryCurrency',
//             });

//         successResponse(res, {
//             message: 'Successfully fetched',
//             data: {
//                 totalDeliveredOrder: totalDeliveredOrderByDate,
//                 totalDeliveredOrderAvgInPercentage,
//                 adminButlerProfitAvgInPercentage,
//                 riderPayoutAvgInPercentage,
//                 profitBreakdown: {
//                     totalOrderAmount,
//                     riderPayout: riderPayoutByDate,
//                     adminButlerProfit: adminButlerProfitByDate,
//                     baseCurrency_adminButlerProfit,
//                     secondaryCurrency_adminButlerProfit,
//                 },
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
exports.getAdminButlerFinancial = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        const { totalDeliveredOrder, riderPayout, adminButlerProfit } =
            await this.getButlerFinancial({});
        const {
            totalDeliveredOrder: totalDeliveredOrderByDate,
            orderAmount: totalOrderAmount,
            riderPayout: riderPayoutByDate,
            adminButlerProfit: adminButlerProfitByDate,
            secondaryCurrency_orderAmount: secondaryCurrency_totalOrderAmount,
            secondaryCurrency_riderPayout: secondaryCurrency_riderPayoutByDate,
            secondaryCurrency_adminButlerProfit:
                secondaryCurrency_adminButlerProfitByDate,
        } = await this.getButlerFinancial({
            startDate,
            endDate,
        });
        const {
            totalDeliveredOrder: totalDeliveredOrderByOldDate,
            riderPayout: riderPayoutByOldDate,
            adminButlerProfit: adminButlerProfitByOldDate,
        } = await this.getButlerFinancial({
            startDate: oldStartDate,
            endDate: oldEndDate,
        });

        // Calculate admin delivery profit avg start
        const adminButlerProfitByDateAvg =
            (adminButlerProfitByDate / adminButlerProfit) * 100;
        const adminButlerProfitByOldDateAvg =
            (adminButlerProfitByOldDate / adminButlerProfit) * 100;
        const adminButlerProfitAvgInPercentage =
            adminButlerProfitByDateAvg - adminButlerProfitByOldDateAvg || 0;
        // Calculate admin delivery profit avg end

        // Calculate delivered order avg start
        const totalDeliveredOrderByDateAvg =
            (totalDeliveredOrderByDate / totalDeliveredOrder) * 100;
        const totalDeliveredOrderByOldDateAvg =
            (totalDeliveredOrderByOldDate / totalDeliveredOrder) * 100;
        const totalDeliveredOrderAvgInPercentage =
            totalDeliveredOrderByDateAvg - totalDeliveredOrderByOldDateAvg || 0;
        // Calculate delivered order avg end

        // Calculate rider payout avg start
        const riderPayoutByDateAvg = (riderPayoutByDate / riderPayout) * 100;
        const riderPayoutByOldDateAvg =
            (riderPayoutByOldDate / riderPayout) * 100;
        const riderPayoutAvgInPercentage =
            riderPayoutByDateAvg - riderPayoutByOldDateAvg || 0;
        // Calculate rider payout avg end

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                totalDeliveredOrder: totalDeliveredOrderByDate,
                totalDeliveredOrderAvgInPercentage,
                adminButlerProfitAvgInPercentage,
                riderPayoutAvgInPercentage,
                profitBreakdown: {
                    totalOrderAmount,
                    riderPayout: riderPayoutByDate,
                    adminButlerProfit: adminButlerProfitByDate,
                },
            };
        } else {
            result = {
                totalDeliveredOrder: totalDeliveredOrderByDate,
                totalDeliveredOrderAvgInPercentage,
                adminButlerProfitAvgInPercentage,
                riderPayoutAvgInPercentage,
                profitBreakdown: {
                    totalOrderAmount: secondaryCurrency_totalOrderAmount,
                    riderPayout: secondaryCurrency_riderPayoutByDate,
                    adminButlerProfit:
                        secondaryCurrency_adminButlerProfitByDate,
                },
            };
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: { ...result },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.getButlerRiderAdminProfitBreakdown = async (req, res) => {
//     try {
//         const {
//             page = 1,
//             pageSize = 50,
//             pagingRange = 5,
//             sortBy = 'DESC',
//             startDate,
//             endDate,
//             searchKey,
//             liveStatus,
//             status,
//             paidCurrency,
//         } = req.query;

//         let whereConfig = {
//             deletedAt: null,
//             deliveryBoyType: 'dropRider',
//         };

//         if (searchKey) {
//             const newQuery = searchKey.split(/[ ,]+/);
//             const nameSearchQuery = newQuery.map(str => ({
//                 name: RegExp(str, 'i'),
//             }));

//             const autoGenIdQ = newQuery.map(str => ({
//                 autoGenId: RegExp(str, 'i'),
//             }));

//             whereConfig = {
//                 ...whereConfig,
//                 $and: [
//                     {
//                         $or: [{ $and: nameSearchQuery }, { $and: autoGenIdQ }],
//                     },
//                 ],
//             };
//         }

//         if (status && ['active', 'deactive'].includes(status)) {
//             whereConfig = {
//                 ...whereConfig,
//                 status,
//             };
//         }

//         if (liveStatus && ['online', 'offline'].includes(liveStatus)) {
//             whereConfig = {
//                 ...whereConfig,
//                 liveStatus,
//             };
//         }

//         let paginate = await pagination({
//             page,
//             pageSize,
//             model: DeliveryBoyModel,
//             condition: whereConfig,
//             pagingRange,
//         });

//         const riderList = await DeliveryBoyModel.find(whereConfig)
//             .sort({ createdAt: sortBy })
//             .skip(paginate.offset)
//             .limit(paginate.limit);

//         for (const rider of riderList) {
//             if (paidCurrency === 'baseCurrency') {
//                 const {
//                     orderAmount: totalOrderAmount,
//                     riderPayout,
//                     adminButlerProfit,
//                 } = await this.getButlerFinancial({
//                     riderId: rider._id,
//                     startDate,
//                     endDate,
//                     paidCurrency,
//                 });

//                 const profitBreakdown = {
//                     totalOrderAmount,
//                     riderPayout,
//                     adminButlerProfit,
//                 };

//                 rider._doc.profitBreakdown = profitBreakdown;
//             } else {
//                 const {
//                     secondaryCurrency_orderAmount: totalOrderAmount,
//                     secondaryCurrency_riderPayout: riderPayout,
//                     secondaryCurrency_adminButlerProfit: adminButlerProfit,
//                 } = await this.getButlerFinancial({
//                     riderId: rider._id,
//                     startDate,
//                     endDate,
//                     paidCurrency,
//                 });

//                 const profitBreakdown = {
//                     totalOrderAmount,
//                     riderPayout,
//                     adminButlerProfit,
//                 };

//                 rider._doc.profitBreakdown = profitBreakdown;
//             }
//         }

//         successResponse(res, {
//             message: 'Successfully get riders',
//             data: {
//                 riders: riderList,
//                 paginate,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
// exports.getButlerOrderAdminProfitBreakdown = async (req, res) => {
//     try {
//         const {
//             page = 1,
//             pageSize = 50,
//             pagingRange = 5,
//             sortBy = 'DESC',
//             startDate,
//             endDate,
//             searchKey,
//             paidCurrency,
//         } = req.query;

//         let config = { orderStatus: 'delivered' };

//         if (startDate && endDate) {
//             const startDateTime = moment(new Date(startDate)).startOf('day').toDate();
//             const endDateTime = moment(
//                 endDate ? new Date(endDate) : new Date()
//             ).endOf('day');

//             config = {
//                 ...config,
//                 createdAt: {
//                     $gte: startDateTime,
//                     $lte: endDateTime,
//                 },
//             };
//         }

//         if (
//             paidCurrency &&
//             ['baseCurrency', 'secondaryCurrency'].includes(paidCurrency)
//         ) {
//             config = {
//                 ...config,
//                 paidCurrency,
//             };
//         }

//         if (searchKey) {
//             const newQuery = searchKey.split(/[ ,]+/);
//             const orderIDSearchQuery = newQuery.map(str => ({
//                 orderId: RegExp(str, 'i'),
//             }));

//             const autoGenIdQ = newQuery.map(str => ({
//                 autoGenId: RegExp(str, 'i'),
//             }));

//             const noteSearchQuery = newQuery.map(str => ({
//                 note: RegExp(str, 'i'),
//             }));

//             config = {
//                 ...config,
//                 $and: [
//                     {
//                         $or: [
//                             { $and: orderIDSearchQuery },
//                             { $and: noteSearchQuery },
//                             { $and: autoGenIdQ },
//                         ],
//                     },
//                 ],
//             };
//         }

//         const paginate = await pagination({
//             page,
//             pageSize,
//             model: ButlerModel,
//             condition: config,
//             pagingRange,
//         });

//         let orderList = await ButlerModel.find(config)
//             .sort({ createdAt: sortBy })
//             .skip(paginate.offset)
//             .limit(paginate.limit);

//         for (const order of orderList) {
//             if (paidCurrency === 'baseCurrency') {
//                 const profitBreakdown = {
//                     totalOrderAmount: order.summary.baseCurrency_riderFee,
//                     riderPayout: order.baseCurrency_riderFee,
//                     adminButlerProfit:
//                         order.adminCharge.baseCurrency_adminChargeFromDelivery,
//                 };

//                 order._doc.profitBreakdown = profitBreakdown;
//             } else {
//                 const profitBreakdown = {
//                     totalOrderAmount: order.summary.secondaryCurrency_riderFee,
//                     riderPayout: order.secondaryCurrency_riderFee,
//                     adminButlerProfit:
//                         order.adminCharge
//                             .secondaryCurrency_adminChargeFromDelivery,
//                 };

//                 order._doc.profitBreakdown = profitBreakdown;
//             }
//         }

//         successResponse(res, {
//             message: 'Successfully get orders',
//             data: {
//                 orders: orderList,
//                 paginate,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
exports.getButlerOrderAdminProfitBreakdown = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            paidCurrency,
        } = req.query;

        let config = { orderStatus: 'delivered' };

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            config = {
                ...config,
                deliveredAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        // if (
        //     paidCurrency &&
        //     ['baseCurrency', 'secondaryCurrency'].includes(paidCurrency)
        // ) {
        //     config = {
        //         ...config,
        //         paidCurrency,
        //     };
        // }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const orderIDSearchQuery = newQuery.map(str => ({
                orderId: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const noteSearchQuery = newQuery.map(str => ({
                note: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [
                            { $and: orderIDSearchQuery },
                            { $and: noteSearchQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: ButlerModel,
            condition: config,
            pagingRange,
        });

        let orderList = await ButlerModel.find(config)
            .sort({ order_placedAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        for (const order of orderList) {
            if (paidCurrency === 'baseCurrency') {
                const profitBreakdown = {
                    totalOrderAmount: order.summary.baseCurrency_riderFee,
                    riderPayout: order.baseCurrency_riderFee,
                    adminButlerProfit:
                        order.adminCharge.baseCurrency_adminChargeFromDelivery,
                };

                order._doc.profitBreakdown = profitBreakdown;
            } else {
                const profitBreakdown = {
                    totalOrderAmount: order.summary.secondaryCurrency_riderFee,
                    riderPayout: order.secondaryCurrency_riderFee,
                    adminButlerProfit:
                        order.adminCharge
                            .secondaryCurrency_adminChargeFromDelivery,
                };

                order._doc.profitBreakdown = profitBreakdown;
            }
        }

        successResponse(res, {
            message: 'Successfully get orders',
            data: {
                orders: orderList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.getShopFinancial = async (req, res) => {
//     try {
//         const { startDate, endDate, type, id } = req.query;

//         const timeDiff =
//             new Date(endDate).getTime() - new Date(startDate).getTime();
//         const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

//         const oldEndDate = new Date(startDate);
//         oldEndDate.setDate(oldEndDate.getDate() - 1);
//         const oldStartDate = new Date(oldEndDate);
//         oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

//         //** Calculate Shop Payout Start ***/
//         const totalShopEarningFunc = await this.getShopEarning({
//             type,
//             id,
//         });
//         const totalShopEarning = totalShopEarningFunc.totalShopEarning;

//         const totalShopEarningByDateFunc = await this.getShopEarning({
//             type,
//             id,
//             startDate,
//             endDate,
//         });
//         const totalShopEarningByDate =
//             totalShopEarningByDateFunc.totalShopEarning;
//         const secondaryCurrency_totalShopEarningByDate =
//             totalShopEarningByDateFunc.secondaryCurrency_totalShopEarning;

//         const baseCurrency_shopEarningFunc = await this.getShopEarning({
//             type,
//             id,
//             startDate,
//             endDate,
//             paidCurrency: 'baseCurrency',
//         });
//         const baseCurrency_shopEarning =
//             baseCurrency_shopEarningFunc.totalShopEarning;

//         const secondaryCurrency_shopEarningFunc = await this.getShopEarning({
//             type,
//             id,
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });
//         const secondaryCurrency_shopEarning =
//             secondaryCurrency_shopEarningFunc.secondaryCurrency_totalShopEarning;

//         const totalShopEarningByOldDateFunc = await this.getShopEarning({
//             type,
//             id,
//             startDate: oldStartDate,
//             endDate: oldEndDate,
//         });
//         const totalShopEarningByOldDate =
//             totalShopEarningByOldDateFunc.totalShopEarning;

//         const totalShopUnsettleFunc = await this.getShopUnSettleAmount({
//             type,
//             id,
//         });
//         const totalShopUnsettle = totalShopUnsettleFunc.totalSellerUnsettle;

//         const totalShopUnsettleByDateFunc = await this.getShopUnSettleAmount({
//             type,
//             id,
//             startDate,
//             endDate,
//         });
//         const totalShopUnsettleByDate =
//             totalShopUnsettleByDateFunc.totalSellerUnsettle;
//         const secondaryCurrency_totalShopUnsettleByDate =
//             totalShopUnsettleByDateFunc.secondaryCurrency_totalSellerUnsettle;

//         const baseCurrency_shopUnsettleFunc = await this.getShopUnSettleAmount({
//             type,
//             id,
//             startDate,
//             endDate,
//             paidCurrency: 'baseCurrency',
//         });
//         const baseCurrency_shopUnsettle =
//             baseCurrency_shopUnsettleFunc.totalSellerUnsettle;

//         const secondaryCurrency_shopUnsettleFunc =
//             await this.getShopUnSettleAmount({
//                 type,
//                 id,
//                 startDate,
//                 endDate,
//                 paidCurrency: 'secondaryCurrency',
//             });
//         const secondaryCurrency_shopUnsettle =
//             secondaryCurrency_shopUnsettleFunc.secondaryCurrency_totalSellerUnsettle;

//         const totalShopUnsettleByOldDateFunc = await this.getShopUnSettleAmount(
//             {
//                 type,
//                 id,
//                 startDate: oldStartDate,
//                 endDate: oldEndDate,
//             }
//         );
//         const totalShopUnsettleByOldDate =
//             totalShopUnsettleByOldDateFunc.totalSellerUnsettle;

//         const totalShopProfit = totalShopUnsettle + totalShopEarning;
//         const totalShopProfitByDate =
//             totalShopUnsettleByDate + totalShopEarningByDate;
//         const secondaryCurrency_totalShopProfitByDate =
//             secondaryCurrency_totalShopUnsettleByDate +
//             secondaryCurrency_totalShopEarningByDate;
//         const totalShopProfitByOldDate =
//             totalShopUnsettleByOldDate + totalShopEarningByOldDate;

//         const baseCurrency_shopProfit =
//             baseCurrency_shopUnsettle + baseCurrency_shopEarning;
//         const secondaryCurrency_shopProfit =
//             secondaryCurrency_shopUnsettle + secondaryCurrency_shopEarning;

//         const totalShopProfitByDateAvg =
//             (totalShopProfitByDate / totalShopProfit) * 100;
//         const totalShopProfitByOldDateAvg =
//             (totalShopProfitByOldDate / totalShopProfit) * 100;
//         const totalShopProfitAvgInPercentage =
//             totalShopProfitByDateAvg - totalShopProfitByOldDateAvg || 0;
//         //** Calculate Shop Payout End ***/

//         //*** Marketing Spent Start ***/
//         const orderStatistics = await this.getOrderStatistics({
//             type,
//             id,
//         });
//         const orderStatisticsByDate = await this.getOrderStatistics({
//             type,
//             id,
//             startDate,
//             endDate,
//         });
//         const orderStatisticsByOldDate = await this.getOrderStatistics({
//             type,
//             id,
//             startDate: oldStartDate,
//             endDate: oldEndDate,
//         });

//         // Calculate delivered order start
//         const totalDeliveredOrder = orderStatistics.totalDeliveredOrder;
//         const totalDeliveredOrderByDate =
//             orderStatisticsByDate.totalDeliveredOrder;
//         const totalDeliveredOrderByOldDate =
//             orderStatisticsByOldDate.totalDeliveredOrder;
//         const totalDeliveredOrderByDateAvg =
//             (totalDeliveredOrderByDate / totalDeliveredOrder) * 100;
//         const totalDeliveredOrderByOldDateAvg =
//             (totalDeliveredOrderByOldDate / totalDeliveredOrder) * 100;
//         const totalDeliveredOrderAvgInPercentage =
//             totalDeliveredOrderByDateAvg - totalDeliveredOrderByOldDateAvg || 0;
//         // Calculate delivered order end

//         // Free Delivery Shop Cut
//         const freeDeliveryShopCut =
//             orderStatistics.totalValue.freeDeliveryShopLoss;
//         const freeDeliveryShopCutByDate =
//             orderStatisticsByDate.totalValue.freeDeliveryShopLoss;
//         const freeDeliveryShopCutByOldDate =
//             orderStatisticsByOldDate.totalValue.freeDeliveryShopLoss;

//         // Free Delivery Admin Cut
//         const freeDeliveryAdminCut =
//             orderStatistics.totalValue.freeDeliveryAdminCut;
//         const freeDeliveryAdminCutByDate =
//             orderStatisticsByDate.totalValue.freeDeliveryAdminCut;
//         const freeDeliveryAdminCutByOldDate =
//             orderStatisticsByOldDate.totalValue.freeDeliveryAdminCut;

//         // Featured amount
//         const { featuredAmount: totalFeaturedAmount } =
//             await this.getFeaturedAmount({
//                 type,
//                 id,
//             });
//         const { featuredAmount: totalFeaturedAmountByDate } =
//             await this.getFeaturedAmount({
//                 type,
//                 id,
//                 startDate,
//                 endDate,
//             });
//         const { featuredAmount: totalFeaturedAmountByOldDate } =
//             await this.getFeaturedAmount({
//                 type,
//                 id,
//                 startDate: oldStartDate,
//                 endDate: oldEndDate,
//             });

//         const totalMarketingSpent =
//             orderStatistics.totalValue.totalDiscount +
//             orderStatistics.totalValue.totalRewardAmount +
//             // orderStatistics.totalValue.totalShopDoubleMenuItemPrice +
//             // orderStatistics.totalValue.totalAdminDoubleMenuCut +
//             orderStatistics.totalValue.totalDoubleMenuItemPrice +
//             orderStatistics.totalValue.totalCouponAdminCut +
//             orderStatistics.totalValue.totalCouponShopCut +
//             freeDeliveryShopCut +
//             freeDeliveryAdminCut +
//             totalFeaturedAmount;

//         const totalMarketingSpentByDate =
//             orderStatisticsByDate.totalValue.totalDiscount +
//             orderStatisticsByDate.totalValue.totalRewardAmount +
//             // orderStatisticsByDate.totalValue.totalShopDoubleMenuItemPrice +
//             // orderStatisticsByDate.totalValue.totalAdminDoubleMenuCut +
//             orderStatisticsByDate.totalValue.totalDoubleMenuItemPrice +
//             orderStatisticsByDate.totalValue.totalCouponAdminCut +
//             orderStatisticsByDate.totalValue.totalCouponShopCut +
//             freeDeliveryShopCutByDate +
//             freeDeliveryAdminCutByDate +
//             totalFeaturedAmountByDate;

//         const totalMarketingSpentByOldDate =
//             orderStatisticsByOldDate.totalValue.totalDiscount +
//             orderStatisticsByOldDate.totalValue.totalRewardAmount +
//             // orderStatisticsByOldDate.totalValue.totalShopDoubleMenuItemPrice +
//             // orderStatisticsByOldDate.totalValue.totalAdminDoubleMenuCut +
//             orderStatisticsByOldDate.totalValue.totalDoubleMenuItemPrice +
//             orderStatisticsByOldDate.totalValue.totalCouponAdminCut +
//             orderStatisticsByOldDate.totalValue.totalCouponShopCut +
//             freeDeliveryShopCutByOldDate +
//             freeDeliveryAdminCutByOldDate +
//             totalFeaturedAmountByOldDate;

//         const totalMarketingSpentByDateAvg =
//             (totalMarketingSpentByDate / totalMarketingSpent) * 100;
//         const totalMarketingSpentByOldDateAvg =
//             (totalMarketingSpentByOldDate / totalMarketingSpent) * 100;
//         const totalMarketingSpentAvgInPercentage =
//             totalMarketingSpentByDateAvg - totalMarketingSpentByOldDateAvg || 0;
//         //*** Marketing Spent End ***/

//         //** Create summary Start **/
//         const orderStatistics_cash = await this.getOrderStatistics({
//             type,
//             id,
//             startDate,
//             endDate,
//             paymentMethod: 'cash',
//         });
//         const orderStatistics_online = await this.getOrderStatistics({
//             type,
//             id,
//             startDate,
//             endDate,
//             paymentMethod: 'online',
//         });
//         const originalOrderAmount_cash =
//             orderStatistics_cash.totalValue.productAmount +
//             orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
//         const discount_cash = orderStatistics_cash.totalValue.totalDiscount;
//         const loyaltyPoints_cash =
//             orderStatistics_cash.totalValue.totalRewardAmount;
//         const buy1Get1_cash =
//             orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
//         const couponDiscount_cash =
//             orderStatistics_cash.totalValue.totalCouponAdminCut +
//             orderStatistics_cash.totalValue.totalCouponShopCut;
//         const totalCash =
//             originalOrderAmount_cash -
//             discount_cash -
//             loyaltyPoints_cash -
//             buy1Get1_cash -
//             couponDiscount_cash;
//         const wallet_cash = orderStatistics_cash.totalValue.wallet;

//         const originalOrderAmount_online =
//             orderStatistics_online.totalValue.productAmount +
//             orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
//         const discount_online = orderStatistics_online.totalValue.totalDiscount;
//         const loyaltyPoints_online =
//             orderStatistics_online.totalValue.totalRewardAmount;
//         const buy1Get1_online =
//             orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
//         const couponDiscount_online =
//             orderStatistics_online.totalValue.totalCouponAdminCut +
//             orderStatistics_online.totalValue.totalCouponShopCut;
//         const totalOnline =
//             originalOrderAmount_online -
//             discount_online -
//             loyaltyPoints_online -
//             buy1Get1_online -
//             couponDiscount_online;
//         const wallet_online = orderStatistics_online.totalValue.wallet;

//         const discount_amc =
//             orderStatisticsByDate.totalValue.totalAdminDiscount;
//         const buy1Get1_amc =
//             orderStatisticsByDate.totalValue.totalAdminDoubleMenuItemPrice;
//         const couponDiscount_amc =
//             orderStatisticsByDate.totalValue.totalCouponAdminCut;
//         const pointsCashback = orderStatisticsByDate.totalValue.pointsCashback;

//         const adminMarketingCashback =
//             discount_amc + buy1Get1_amc + couponDiscount_amc + pointsCashback;

//         const orderAmount = totalCash + totalOnline + adminMarketingCashback;

//         let { adminFees, secondaryCurrency_adminFees } =
//             await this.getAdminEarning({
//                 type,
//                 id,
//                 startDate,
//                 endDate,
//             });
//         adminFees += adminMarketingCashback;

//         const freeDeliveryByShop =
//             orderStatisticsByDate.totalValue.freeDeliveryShopCut;

//         const featuredAmount = totalFeaturedAmountByDate;

//         const { refundAmount: customerRefund } =
//             await this.getTotalRefundAmount({
//                 type,
//                 id,
//                 startDate,
//                 endDate,
//                 account: 'shop',
//             });

//         const { totalAddRemoveCredit: shopAddRemoveCredit } =
//             await this.getShopAddRemoveCredit({
//                 type,
//                 id,
//                 startDate,
//                 endDate,
//             });

//         const { deliveryFee: deliveryFee_cash } = await this.getShopDeliveryFee(
//             {
//                 type,
//                 id,
//                 startDate,
//                 endDate,
//                 paymentMethod: 'cash',
//             }
//         );

//         const { deliveryFee: deliveryFee_online, riderTip: riderTip_online } =
//             await this.getShopDeliveryFee({
//                 type,
//                 id,
//                 startDate,
//                 endDate,
//                 paymentMethod: 'online',
//             });

//         const { totalErrorCharge: errorCharge } =
//             await this.getTotalErrorCharge({
//                 type,
//                 id,
//                 startDate,
//                 endDate,
//                 account: 'shop',
//             });
//         //** Create summary End **/
//         //** Calc Shop Cash In Hand Start **/
//         const { totalShopCashInHand, secondaryCurrency_totalShopCashInHand } =
//             await this.getShopCashInHand({
//                 type,
//                 id,
//                 startDate,
//                 endDate,
//             });

//         const { totalShopCashInHand: baseCurrency_shopCashInHand } =
//             await this.getShopCashInHand({
//                 type,
//                 id,
//                 startDate,
//                 endDate,
//                 paidCurrency: 'baseCurrency',
//             });

//         const {
//             secondaryCurrency_totalShopCashInHand:
//                 secondaryCurrency_shopCashInHand,
//         } = await this.getShopCashInHand({
//             type,
//             id,
//             startDate,
//             endDate,
//             paidCurrency: 'secondaryCurrency',
//         });
//         //** Calc Shop Cash In Hand End **/

//         successResponse(res, {
//             message: 'Successfully fetched',
//             data: {
//                 totalDeliveredOrder: totalDeliveredOrderByDate,
//                 totalDeliveredOrderAvgInPercentage,
//                 marketingSpent: {
//                     totalMarketingSpentAvgInPercentage,
//                     marketingSpent_all: totalMarketingSpentByDate,
//                     discount_all:
//                         orderStatisticsByDate.totalValue.totalDiscount,
//                     loyaltyPoints_all:
//                         orderStatisticsByDate.totalValue.totalRewardAmount,
//                     // buy1Get1_all:
//                     //     orderStatisticsByDate.totalValue
//                     //         .totalShopDoubleMenuItemPrice +
//                     //     orderStatisticsByDate.totalValue
//                     //         .totalAdminDoubleMenuCut,
//                     buy1Get1_all:
//                         orderStatisticsByDate.totalValue
//                             .totalDoubleMenuItemPrice,
//                     freeDelivery_all:
//                         freeDeliveryShopCutByDate + freeDeliveryAdminCutByDate,
//                     featuredAmount_all: totalFeaturedAmountByDate,
//                     couponDiscount_all:
//                         orderStatisticsByDate.totalValue.totalCouponAdminCut +
//                         orderStatisticsByDate.totalValue.totalCouponShopCut,
//                     shop: {
//                         marketingSpent_shop:
//                             orderStatisticsByDate.totalValue.totalShopDiscount +
//                             orderStatisticsByDate.totalValue
//                                 .totalShopRewardAmount +
//                             orderStatisticsByDate.totalValue
//                                 .totalShopDoubleMenuItemPrice +
//                             orderStatisticsByDate.totalValue
//                                 .totalCouponShopCut +
//                             freeDeliveryShopCutByDate +
//                             totalFeaturedAmountByDate,
//                         discount_shop:
//                             orderStatisticsByDate.totalValue.totalShopDiscount,
//                         loyaltyPoints_shop:
//                             orderStatisticsByDate.totalValue
//                                 .totalShopRewardAmount,
//                         buy1Get1_shop:
//                             orderStatisticsByDate.totalValue
//                                 .totalShopDoubleMenuItemPrice,
//                         freeDelivery_shop: freeDeliveryShopCutByDate,
//                         featuredAmount_shop: totalFeaturedAmountByDate,
//                         couponDiscount_shop:
//                             orderStatisticsByDate.totalValue.totalCouponShopCut,
//                     },
//                     admin: {
//                         marketingSpent_admin:
//                             orderStatisticsByDate.totalValue
//                                 .totalAdminDiscount +
//                             orderStatisticsByDate.totalValue
//                                 .totalAdminRewardAmount +
//                             orderStatisticsByDate.totalValue
//                                 .totalAdminDoubleMenuItemPrice +
//                             orderStatisticsByDate.totalValue
//                                 .totalCouponAdminCut +
//                             freeDeliveryAdminCutByDate,
//                         discount_admin:
//                             orderStatisticsByDate.totalValue.totalAdminDiscount,
//                         loyaltyPoints_admin:
//                             orderStatisticsByDate.totalValue
//                                 .totalAdminRewardAmount,
//                         // buy1Get1_admin:
//                         //     orderStatisticsByDate.totalValue
//                         //         .totalAdminDoubleMenuCut,
//                         buy1Get1_admin:
//                             orderStatisticsByDate.totalValue
//                                 .totalAdminDoubleMenuItemPrice,
//                         freeDelivery_admin: freeDeliveryAdminCutByDate,
//                         couponDiscount_admin:
//                             orderStatisticsByDate.totalValue
//                                 .totalCouponAdminCut,
//                     },
//                 },
//                 profitBreakdown: {
//                     cash: {
//                         originalOrderAmount_cash,
//                         discount_cash,
//                         loyaltyPoints_cash,
//                         buy1Get1_cash,
//                         couponDiscount_cash,
//                         totalCash,
//                         wallet_cash,
//                     },
//                     online: {
//                         originalOrderAmount_online,
//                         discount_online,
//                         loyaltyPoints_online,
//                         buy1Get1_online,
//                         couponDiscount_online,
//                         totalOnline,
//                         wallet_online,
//                     },
//                     AdminMarketingCashback: {
//                         discount_amc,
//                         buy1Get1_amc,
//                         couponDiscount_amc,
//                         pointsCashback,
//                         adminMarketingCashback,
//                     },
//                     orderAmount,
//                     adminFees,
//                     // pointsCashback,
//                     totalVat: orderStatisticsByDate.totalValue.totalVat,
//                     otherPayments: {
//                         freeDeliveryByShop,
//                         featuredAmount,
//                         customerRefund,
//                         shopAddRemoveCredit,
//                         errorCharge,
//                         totalOtherPayments:
//                             freeDeliveryByShop +
//                             featuredAmount +
//                             customerRefund +
//                             errorCharge -
//                             shopAddRemoveCredit,
//                     },
//                     deliveryFee: {
//                         deliveryFee:
//                             deliveryFee_cash +
//                             deliveryFee_online +
//                             riderTip_online,
//                         cash: deliveryFee_cash,
//                         online: deliveryFee_online + riderTip_online,
//                         deliveryFee_online,
//                         riderTip_online,
//                     },
//                     cashInHand: totalShopCashInHand,
//                     baseCurrency_paid: baseCurrency_shopEarning,
//                     secondaryCurrency_paid: secondaryCurrency_shopEarning,
//                     totalPaid: totalShopEarningByDate,
//                     secondaryCurrency_totalPaid:
//                         secondaryCurrency_totalShopEarningByDate,
//                     baseCurrency_unpaid: baseCurrency_shopUnsettle,
//                     secondaryCurrency_unpaid: secondaryCurrency_shopUnsettle,
//                     totalUnpaid: totalShopUnsettleByDate,
//                     secondaryCurrency_totalUnpaid:
//                         secondaryCurrency_totalShopUnsettleByDate,
//                     baseCurrency_payout:
//                         baseCurrency_shopProfit - baseCurrency_shopCashInHand,
//                     secondaryCurrency_payout:
//                         secondaryCurrency_shopProfit -
//                         secondaryCurrency_shopCashInHand,
//                     totalPayout: totalShopProfitByDate - totalShopCashInHand,
//                     secondaryCurrency_totalPayout:
//                         secondaryCurrency_totalShopProfitByDate,
//                     totalPayoutAvgInPercentage: totalShopProfitAvgInPercentage,
//                 },
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
exports.getShopFinancial = async (req, res) => {
    try {
        const { startDate, endDate, type, id, paidCurrency } = req.query;

        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        //** Calculate Shop Payout Start ***/
        const { totalShopEarning } = await this.getShopEarning({
            type,
            id,
        });

        const {
            totalShopEarning: totalShopEarningByDate,
            secondaryCurrency_totalShopEarning:
                secondaryCurrency_totalShopEarningByDate,
        } = await this.getShopEarning({
            type,
            id,
            startDate,
            endDate,
        });

        const {
            totalShopEarning: totalShopEarningByOldDate,
            secondaryCurrency_totalShopEarning:
                secondaryCurrency_totalShopEarningByOldDate,
        } = await this.getShopEarning({
            type,
            id,
            startDate: oldStartDate,
            endDate: oldEndDate,
        });

        const { totalSellerUnsettle: totalShopUnsettle } =
            await this.getShopUnSettleAmount({
                type,
                id,
            });

        const {
            totalSellerUnsettle: totalShopUnsettleByDate,
            secondaryCurrency_totalSellerUnsettle:
                secondaryCurrency_totalShopUnsettleByDate,
        } = await this.getShopUnSettleAmount({
            type,
            id,
            startDate,
            endDate,
        });

        const {
            totalSellerUnsettle: totalShopUnsettleByOldDate,
            secondaryCurrency_totalSellerUnsettle:
                secondaryCurrency_totalShopUnsettleByOldDate,
        } = await this.getShopUnSettleAmount({
            type,
            id,
            startDate: oldStartDate,
            endDate: oldEndDate,
        });

        const totalShopProfit = totalShopUnsettle + totalShopEarning;
        const totalShopProfitByDate =
            totalShopUnsettleByDate + totalShopEarningByDate;
        const secondaryCurrency_totalShopProfitByDate =
            secondaryCurrency_totalShopUnsettleByDate +
            secondaryCurrency_totalShopEarningByDate;
        const totalShopProfitByOldDate =
            totalShopUnsettleByOldDate + totalShopEarningByOldDate;
        const secondaryCurrency_totalShopProfitByOldDate =
            secondaryCurrency_totalShopUnsettleByOldDate +
            secondaryCurrency_totalShopEarningByOldDate;

        const totalShopProfitByDateAvg =
            (totalShopProfitByDate / totalShopProfit) * 100;
        const totalShopProfitByOldDateAvg =
            (totalShopProfitByOldDate / totalShopProfit) * 100;
        // const totalShopProfitAvgInPercentage = totalShopProfitByDateAvg - totalShopProfitByOldDateAvg || 0;
        //** Calculate Shop Payout End ***/

        //*** Marketing Spent Start ***/
        const orderStatistics = await this.getOrderStatistics({
            type,
            id,
        });
        const orderStatisticsByDate = await this.getOrderStatistics({
            type,
            id,
            startDate,
            endDate,
        });
        const orderStatisticsByOldDate = await this.getOrderStatistics({
            type,
            id,
            startDate: oldStartDate,
            endDate: oldEndDate,
        });

        // Calculate delivered order start
        const totalDeliveredOrderByDate =
            orderStatisticsByDate.totalDeliveredOrder;
        const totalDeliveredOrderByOldDate =
            orderStatisticsByOldDate.totalDeliveredOrder;

        const totalDeliveredOrderAvgInPercentage = getIncreasePercentage(
            totalDeliveredOrderByOldDate,
            totalDeliveredOrderByDate
        );
        // Calculate delivered order end

        // Free Delivery Shop Cut
        const freeDeliveryShopCut =
            orderStatistics.totalValue.freeDeliveryShopLoss;
        const freeDeliveryShopCutByDate =
            orderStatisticsByDate.totalValue.freeDeliveryShopLoss;
        const secondaryCurrency_freeDeliveryShopCutByDate =
            orderStatisticsByDate.totalValue
                .secondaryCurrency_freeDeliveryShopLoss;
        const freeDeliveryShopCutByOldDate =
            orderStatisticsByOldDate.totalValue.freeDeliveryShopLoss;
        const secondaryCurrency_freeDeliveryShopCutByOldDate =
            orderStatisticsByOldDate.totalValue
                .secondaryCurrency_freeDeliveryShopLoss;
        // Free Delivery Admin Cut
        const freeDeliveryAdminCut =
            orderStatistics.totalValue.freeDeliveryAdminCut;
        const freeDeliveryAdminCutByDate =
            orderStatisticsByDate.totalValue.freeDeliveryAdminCut;
        const secondaryCurrency_freeDeliveryAdminCutByDate =
            orderStatisticsByDate.totalValue
                .secondaryCurrency_freeDeliveryAdminCut;
        const freeDeliveryAdminCutByOldDate =
            orderStatisticsByOldDate.totalValue.freeDeliveryAdminCut;

        // Featured amount
        const { featuredAmount: totalFeaturedAmount } =
            await this.getFeaturedAmount({
                type,
                id,
            });
        const {
            featuredAmount: totalFeaturedAmountByDate,
            secondaryCurrency_featuredAmount:
                secondaryCurrency_totalFeaturedAmountByDate,
        } = await this.getFeaturedAmount({
            type,
            id,
            startDate,
            endDate,
        });
        const {
            featuredAmount: totalFeaturedAmountByOldDate,
            secondaryCurrency_featuredAmount:
                secondaryCurrency_totalFeaturedAmountByOldDate,
        } = await this.getFeaturedAmount({
            type,
            id,
            startDate: oldStartDate,
            endDate: oldEndDate,
        });

        const totalMarketingSpent =
            orderStatistics.totalValue.totalDiscount +
            orderStatistics.totalValue.totalRewardAmount +
            orderStatistics.totalValue.totalDoubleMenuItemPrice +
            orderStatistics.totalValue.totalCouponAdminCut +
            orderStatistics.totalValue.totalCouponShopCut +
            freeDeliveryShopCut +
            freeDeliveryAdminCut +
            totalFeaturedAmount;

        const totalMarketingSpentByDate =
            orderStatisticsByDate.totalValue.totalDiscount +
            orderStatisticsByDate.totalValue.totalRewardAmount +
            orderStatisticsByDate.totalValue.totalDoubleMenuItemPrice +
            orderStatisticsByDate.totalValue.totalCouponAdminCut +
            orderStatisticsByDate.totalValue.totalCouponShopCut +
            freeDeliveryShopCutByDate +
            freeDeliveryAdminCutByDate +
            totalFeaturedAmountByDate;

        const secondaryCurrency_totalMarketingSpentByDate =
            orderStatisticsByDate.totalValue.secondaryCurrency_totalDiscount +
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalRewardAmount +
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalDoubleMenuItemPrice +
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalCouponAdminCut +
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalCouponShopCut +
            secondaryCurrency_freeDeliveryShopCutByDate +
            secondaryCurrency_freeDeliveryAdminCutByDate +
            secondaryCurrency_totalFeaturedAmountByDate;

        const totalMarketingSpentByOldDate =
            orderStatisticsByOldDate.totalValue.totalDiscount +
            orderStatisticsByOldDate.totalValue.totalRewardAmount +
            orderStatisticsByOldDate.totalValue.totalDoubleMenuItemPrice +
            orderStatisticsByOldDate.totalValue.totalCouponAdminCut +
            orderStatisticsByOldDate.totalValue.totalCouponShopCut +
            freeDeliveryShopCutByOldDate +
            freeDeliveryAdminCutByOldDate +
            totalFeaturedAmountByOldDate;

        const totalMarketingSpentByDateAvg =
            (totalMarketingSpentByDate / totalMarketingSpent) * 100;
        const totalMarketingSpentByOldDateAvg =
            (totalMarketingSpentByOldDate / totalMarketingSpent) * 100;
        // const totalMarketingSpentAvgInPercentage = totalMarketingSpentByDateAvg - totalMarketingSpentByOldDateAvg || 0;
        //*** Marketing Spent End ***/

        //** Create summary Start **/
        const orderStatistics_cash = await this.getOrderStatistics({
            type,
            id,
            startDate,
            endDate,
            paymentMethod: 'cash',
        });
        const orderStatistics_online = await this.getOrderStatistics({
            type,
            id,
            startDate,
            endDate,
            paymentMethod: 'online',
        });
        const originalOrderAmount_cash =
            orderStatistics_cash.totalValue.productAmount +
            orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
        const secondaryCurrency_originalOrderAmount_cash =
            orderStatistics_cash.totalValue.secondaryCurrency_productAmount +
            orderStatistics_cash.totalValue
                .secondaryCurrency_totalDoubleMenuItemPrice;
        const discount_cash = orderStatistics_cash.totalValue.totalDiscount;
        const secondaryCurrency_discount_cash =
            orderStatistics_cash.totalValue.secondaryCurrency_totalDiscount;
        const loyaltyPoints_cash =
            orderStatistics_cash.totalValue.totalRewardAmount;
        const secondaryCurrency_loyaltyPoints_cash =
            orderStatistics_cash.totalValue.secondaryCurrency_totalRewardAmount;
        const buy1Get1_cash =
            orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
        const secondaryCurrency_buy1Get1_cash =
            orderStatistics_cash.totalValue
                .secondaryCurrency_totalDoubleMenuItemPrice;
        const couponDiscount_cash =
            orderStatistics_cash.totalValue.totalCouponAdminCut +
            orderStatistics_cash.totalValue.totalCouponShopCut;
        const secondaryCurrency_couponDiscount_cash =
            orderStatistics_cash.totalValue
                .secondaryCurrency_totalCouponAdminCut +
            orderStatistics_cash.totalValue
                .secondaryCurrency_totalCouponShopCut;
        const totalCash =
            originalOrderAmount_cash -
            discount_cash -
            loyaltyPoints_cash -
            buy1Get1_cash -
            couponDiscount_cash;
        const secondaryCurrency_totalCash =
            secondaryCurrency_originalOrderAmount_cash -
            secondaryCurrency_discount_cash -
            secondaryCurrency_loyaltyPoints_cash -
            secondaryCurrency_buy1Get1_cash -
            secondaryCurrency_couponDiscount_cash;
        const wallet_cash = orderStatistics_cash.totalValue.wallet;
        const secondaryCurrency_wallet_cash =
            orderStatistics_cash.totalValue.secondaryCurrency_wallet;

        const originalOrderAmount_online =
            orderStatistics_online.totalValue.productAmount +
            orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
        const secondaryCurrency_originalOrderAmount_online =
            orderStatistics_online.totalValue.secondaryCurrency_productAmount +
            orderStatistics_online.totalValue
                .secondaryCurrency_totalDoubleMenuItemPrice;
        const discount_online = orderStatistics_online.totalValue.totalDiscount;
        const secondaryCurrency_discount_online =
            orderStatistics_online.totalValue.secondaryCurrency_totalDiscount;
        const loyaltyPoints_online =
            orderStatistics_online.totalValue.totalRewardAmount;
        const secondaryCurrency_loyaltyPoints_online =
            orderStatistics_online.totalValue
                .secondaryCurrency_totalRewardAmount;
        const buy1Get1_online =
            orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
        const secondaryCurrency_buy1Get1_online =
            orderStatistics_online.totalValue
                .secondaryCurrency_totalDoubleMenuItemPrice;
        const couponDiscount_online =
            orderStatistics_online.totalValue.totalCouponAdminCut +
            orderStatistics_online.totalValue.totalCouponShopCut;
        const secondaryCurrency_couponDiscount_online =
            orderStatistics_online.totalValue
                .secondaryCurrency_totalCouponAdminCut +
            orderStatistics_online.totalValue
                .secondaryCurrency_totalCouponShopCut;
        const totalOnline =
            originalOrderAmount_online -
            discount_online -
            loyaltyPoints_online -
            buy1Get1_online -
            couponDiscount_online;
        const secondaryCurrency_totalOnline =
            secondaryCurrency_originalOrderAmount_online -
            secondaryCurrency_discount_online -
            secondaryCurrency_loyaltyPoints_online -
            secondaryCurrency_buy1Get1_online -
            secondaryCurrency_couponDiscount_online;
        const wallet_online = orderStatistics_online.totalValue.wallet;
        const secondaryCurrency_wallet_online =
            orderStatistics_online.totalValue.secondaryCurrency_wallet;

        const discount_amc =
            orderStatisticsByDate.totalValue.totalAdminDiscount;
        const buy1Get1_amc =
            orderStatisticsByDate.totalValue.totalAdminDoubleMenuItemPrice;
        const couponDiscount_amc =
            orderStatisticsByDate.totalValue.totalCouponAdminCut;
        const pointsCashback = orderStatisticsByDate.totalValue.pointsCashback;
        const adminMarketingCashback =
            discount_amc + buy1Get1_amc + couponDiscount_amc + pointsCashback;
        const secondaryCurrency_discount_amc =
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalAdminDiscount;
        const secondaryCurrency_buy1Get1_amc =
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalAdminDoubleMenuItemPrice;
        const secondaryCurrency_couponDiscount_amc =
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalCouponAdminCut;
        const secondaryCurrency_pointsCashback =
            orderStatisticsByDate.totalValue.secondaryCurrency_pointsCashback;
        const secondaryCurrency_adminMarketingCashback =
            secondaryCurrency_discount_amc +
            secondaryCurrency_buy1Get1_amc +
            secondaryCurrency_couponDiscount_amc +
            secondaryCurrency_pointsCashback;

        const orderAmount = totalCash + totalOnline + adminMarketingCashback;
        const secondaryCurrency_orderAmount =
            secondaryCurrency_totalCash +
            secondaryCurrency_totalOnline +
            secondaryCurrency_adminMarketingCashback;

        let { adminFees, secondaryCurrency_adminFees } =
            await this.getAdminEarning({
                type,
                id,
                startDate,
                endDate,
            });
        adminFees += adminMarketingCashback;
        secondaryCurrency_adminFees += secondaryCurrency_adminMarketingCashback;

        const freeDeliveryByShop =
            orderStatisticsByDate.totalValue.freeDeliveryShopCut;
        const secondaryCurrency_freeDeliveryByShop =
            orderStatisticsByDate.totalValue
                .secondaryCurrency_freeDeliveryShopCut;

        const featuredAmount = totalFeaturedAmountByDate;
        const secondaryCurrency_featuredAmount =
            secondaryCurrency_totalFeaturedAmountByDate;

        const {
            refundAmount: customerRefund,
            secondaryCurrency_refundAmount: secondaryCurrency_customerRefund,
        } = await this.getTotalRefundAmount({
            type,
            id,
            startDate,
            endDate,
            account: 'shop',
        });

        const {
            totalAddRemoveCredit: shopAddRemoveCredit,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_shopAddRemoveCredit,
        } = await this.getShopAddRemoveCredit({
            type,
            id,
            startDate,
            endDate,
        });

        const {
            deliveryFee: deliveryFee_cash,
            secondaryCurrency_deliveryFee: secondaryCurrency_deliveryFee_cash,
        } = await this.getShopDeliveryFee({
            type,
            id,
            startDate,
            endDate,
            paymentMethod: 'cash',
        });

        const {
            deliveryFee: deliveryFee_online,
            riderTip: riderTip_online,
            secondaryCurrency_deliveryFee: secondaryCurrency_deliveryFee_online,
            secondaryCurrency_riderTip: secondaryCurrency_riderTip_online,
        } = await this.getShopDeliveryFee({
            type,
            id,
            startDate,
            endDate,
            paymentMethod: 'online',
        });

        const {
            totalErrorCharge: errorCharge,
            secondaryCurrency_totalErrorCharge: secondaryCurrency_errorCharge,
        } = await this.getTotalErrorCharge({
            type,
            id,
            startDate,
            endDate,
            account: 'shop',
        });
        //** Create summary End **/
        //** Calc Shop Cash In Hand Start **/
        const { totalShopCashInHand, secondaryCurrency_totalShopCashInHand } =
            await this.getShopCashInHand({
                type,
                id,
                startDate,
                endDate,
            });
        const {
            totalShopCashInHand: totalShopCashInHandByOldDate,
            secondaryCurrency_totalShopCashInHand:
                secondaryCurrency_totalShopCashInHandByOldDate,
        } = await this.getShopCashInHand({
            type,
            id,
            startDate: oldStartDate,
            endDate: oldEndDate,
        });
        //** Calc Shop Cash In Hand End **/

        let result = {};
        const totalPayout = totalShopProfitByDate - totalShopCashInHand;
        const secondaryCurrency_totalPayout =
            secondaryCurrency_totalShopProfitByDate -
            secondaryCurrency_totalShopCashInHand;

        const totalPayoutByOldDate =
            totalShopProfitByOldDate - totalShopCashInHandByOldDate;
        const secondaryCurrency_totalPayoutByOldDate =
            secondaryCurrency_totalShopProfitByOldDate -
            secondaryCurrency_totalShopCashInHandByOldDate;

        const totalShopProfitAvgInPercentage = getIncreasePercentage(
            totalPayoutByOldDate,
            totalPayout
        );
        const secondaryCurrency_totalShopProfitAvgInPercentage =
            getIncreasePercentage(
                secondaryCurrency_totalPayoutByOldDate,
                secondaryCurrency_totalPayout
            );

        const marketingSpent_shop =
            orderStatisticsByDate.totalValue.totalShopDiscount +
            orderStatisticsByDate.totalValue.totalShopRewardAmount +
            orderStatisticsByDate.totalValue.totalShopDoubleMenuItemPrice +
            orderStatisticsByDate.totalValue.totalCouponShopCut +
            freeDeliveryShopCutByDate +
            totalFeaturedAmountByDate;
        const secondaryCurrency_marketingSpent_shop =
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalShopDiscount +
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalShopRewardAmount +
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalShopDoubleMenuItemPrice +
            orderStatisticsByDate.totalValue
                .secondaryCurrency_totalCouponShopCut +
            secondaryCurrency_freeDeliveryShopCutByDate +
            secondaryCurrency_totalFeaturedAmountByDate;
        const marketingSpent_shopByOldDate =
            orderStatisticsByOldDate.totalValue.totalShopDiscount +
            orderStatisticsByOldDate.totalValue.totalShopRewardAmount +
            orderStatisticsByOldDate.totalValue.totalShopDoubleMenuItemPrice +
            orderStatisticsByOldDate.totalValue.totalCouponShopCut +
            freeDeliveryShopCutByOldDate +
            totalFeaturedAmountByOldDate;
        const secondaryCurrency_marketingSpent_shopByOldDate =
            orderStatisticsByOldDate.totalValue
                .secondaryCurrency_totalShopDiscount +
            orderStatisticsByOldDate.totalValue
                .secondaryCurrency_totalShopRewardAmount +
            orderStatisticsByOldDate.totalValue
                .secondaryCurrency_totalShopDoubleMenuItemPrice +
            orderStatisticsByOldDate.totalValue
                .secondaryCurrency_totalCouponShopCut +
            secondaryCurrency_freeDeliveryShopCutByOldDate +
            secondaryCurrency_totalFeaturedAmountByOldDate;
        const totalMarketingSpentAvgInPercentage = getIncreasePercentage(
            marketingSpent_shopByOldDate,
            marketingSpent_shop
        );
        const secondaryCurrency_totalMarketingSpentAvgInPercentage =
            getIncreasePercentage(
                secondaryCurrency_marketingSpent_shopByOldDate,
                secondaryCurrency_marketingSpent_shop
            );
        if (paidCurrency === 'baseCurrency') {
            result = {
                totalDeliveredOrder: totalDeliveredOrderByDate,
                totalDeliveredOrderAvgInPercentage,
                marketingSpent: {
                    totalMarketingSpentAvgInPercentage,
                    marketingSpent_all: totalMarketingSpentByDate,
                    discount_all:
                        orderStatisticsByDate.totalValue.totalDiscount,
                    loyaltyPoints_all:
                        orderStatisticsByDate.totalValue.totalRewardAmount,
                    buy1Get1_all:
                        orderStatisticsByDate.totalValue
                            .totalDoubleMenuItemPrice,
                    freeDelivery_all:
                        freeDeliveryShopCutByDate + freeDeliveryAdminCutByDate,
                    featuredAmount_all: totalFeaturedAmountByDate,
                    couponDiscount_all:
                        orderStatisticsByDate.totalValue.totalCouponAdminCut +
                        orderStatisticsByDate.totalValue.totalCouponShopCut,
                    shop: {
                        marketingSpent_shop,
                        discount_shop:
                            orderStatisticsByDate.totalValue.totalShopDiscount,
                        loyaltyPoints_shop:
                            orderStatisticsByDate.totalValue
                                .totalShopRewardAmount,
                        buy1Get1_shop:
                            orderStatisticsByDate.totalValue
                                .totalShopDoubleMenuItemPrice,
                        freeDelivery_shop: freeDeliveryShopCutByDate,
                        featuredAmount_shop: totalFeaturedAmountByDate,
                        couponDiscount_shop:
                            orderStatisticsByDate.totalValue.totalCouponShopCut,
                    },
                    admin: {
                        marketingSpent_admin:
                            orderStatisticsByDate.totalValue
                                .totalAdminDiscount +
                            orderStatisticsByDate.totalValue
                                .totalAdminRewardAmount +
                            orderStatisticsByDate.totalValue
                                .totalAdminDoubleMenuItemPrice +
                            orderStatisticsByDate.totalValue
                                .totalCouponAdminCut +
                            freeDeliveryAdminCutByDate,
                        discount_admin:
                            orderStatisticsByDate.totalValue.totalAdminDiscount,
                        loyaltyPoints_admin:
                            orderStatisticsByDate.totalValue
                                .totalAdminRewardAmount,
                        buy1Get1_admin:
                            orderStatisticsByDate.totalValue
                                .totalAdminDoubleMenuItemPrice,
                        freeDelivery_admin: freeDeliveryAdminCutByDate,
                        couponDiscount_admin:
                            orderStatisticsByDate.totalValue
                                .totalCouponAdminCut,
                    },
                },
                profitBreakdown: {
                    cash: {
                        originalOrderAmount_cash,
                        discount_cash,
                        loyaltyPoints_cash,
                        buy1Get1_cash,
                        couponDiscount_cash,
                        totalCash,
                        wallet_cash,
                    },
                    online: {
                        originalOrderAmount_online,
                        discount_online,
                        loyaltyPoints_online,
                        buy1Get1_online,
                        couponDiscount_online,
                        totalOnline,
                        wallet_online,
                    },
                    AdminMarketingCashback: {
                        discount_amc,
                        buy1Get1_amc,
                        couponDiscount_amc,
                        pointsCashback,
                        adminMarketingCashback,
                    },
                    orderAmount,
                    adminFees,
                    totalVat: orderStatisticsByDate.totalValue.totalVat,
                    otherPayments: {
                        freeDeliveryByShop,
                        featuredAmount,
                        customerRefund,
                        shopAddRemoveCredit,
                        errorCharge,
                        totalOtherPayments:
                            freeDeliveryByShop +
                            featuredAmount +
                            customerRefund +
                            errorCharge -
                            shopAddRemoveCredit,
                    },
                    deliveryFee: {
                        deliveryFee:
                            deliveryFee_cash +
                            deliveryFee_online +
                            riderTip_online,
                        cash: deliveryFee_cash,
                        online: deliveryFee_online + riderTip_online,
                        deliveryFee_online,
                        riderTip_online,
                    },
                    cashInHand: totalShopCashInHand,
                    totalPaid: totalShopEarningByDate,
                    totalUnpaid: totalShopUnsettleByDate,
                    totalPayout,
                    totalPayoutAvgInPercentage: totalShopProfitAvgInPercentage,
                },
            };
        } else {
            result = {
                totalDeliveredOrder: totalDeliveredOrderByDate,
                totalDeliveredOrderAvgInPercentage,
                marketingSpent: {
                    totalMarketingSpentAvgInPercentage:
                        secondaryCurrency_totalMarketingSpentAvgInPercentage,
                    marketingSpent_all:
                        secondaryCurrency_totalMarketingSpentByDate,
                    discount_all:
                        orderStatisticsByDate.totalValue
                            .secondaryCurrency_totalDiscount,
                    loyaltyPoints_all:
                        orderStatisticsByDate.totalValue
                            .secondaryCurrency_totalRewardAmount,
                    buy1Get1_all:
                        orderStatisticsByDate.totalValue
                            .secondaryCurrency_totalDoubleMenuItemPrice,
                    freeDelivery_all:
                        secondaryCurrency_freeDeliveryShopCutByDate +
                        secondaryCurrency_freeDeliveryAdminCutByDate,
                    featuredAmount_all:
                        secondaryCurrency_totalFeaturedAmountByDate,
                    couponDiscount_all:
                        orderStatisticsByDate.totalValue
                            .secondaryCurrency_totalCouponAdminCut +
                        orderStatisticsByDate.totalValue
                            .secondaryCurrency_totalCouponShopCut,
                    shop: {
                        marketingSpent_shop:
                            secondaryCurrency_marketingSpent_shop,
                        discount_shop:
                            orderStatisticsByDate.totalValue
                                .secondaryCurrency_totalShopDiscount,
                        loyaltyPoints_shop:
                            orderStatisticsByDate.totalValue
                                .secondaryCurrency_totalShopRewardAmount,
                        buy1Get1_shop:
                            orderStatisticsByDate.totalValue
                                .secondaryCurrency_totalShopDoubleMenuItemPrice,
                        freeDelivery_shop:
                            secondaryCurrency_freeDeliveryShopCutByDate,
                        featuredAmount_shop:
                            secondaryCurrency_totalFeaturedAmountByDate,
                        couponDiscount_shop:
                            orderStatisticsByDate.totalValue
                                .secondaryCurrency_totalCouponShopCut,
                    },
                    admin: {
                        marketingSpent_admin:
                            orderStatisticsByDate.totalValue
                                .secondaryCurrency_totalAdminDiscount +
                            orderStatisticsByDate.totalValue
                                .secondaryCurrency_totalAdminRewardAmount +
                            orderStatisticsByDate.totalValue
                                .secondaryCurrency_totalAdminDoubleMenuItemPrice +
                            orderStatisticsByDate.totalValue
                                .secondaryCurrency_totalCouponAdminCut +
                            secondaryCurrency_freeDeliveryAdminCutByDate,
                        discount_admin:
                            orderStatisticsByDate.totalValue
                                .secondaryCurrency_totalAdminDiscount,
                        loyaltyPoints_admin:
                            orderStatisticsByDate.totalValue
                                .secondaryCurrency_totalAdminRewardAmount,
                        buy1Get1_admin:
                            orderStatisticsByDate.totalValue
                                .secondaryCurrency_totalAdminDoubleMenuItemPrice,
                        freeDelivery_admin:
                            secondaryCurrency_freeDeliveryAdminCutByDate,
                        couponDiscount_admin:
                            orderStatisticsByDate.totalValue
                                .secondaryCurrency_totalCouponAdminCut,
                    },
                },
                profitBreakdown: {
                    cash: {
                        originalOrderAmount_cash:
                            secondaryCurrency_originalOrderAmount_cash,
                        discount_cash: secondaryCurrency_discount_cash,
                        loyaltyPoints_cash:
                            secondaryCurrency_loyaltyPoints_cash,
                        buy1Get1_cash: secondaryCurrency_buy1Get1_cash,
                        couponDiscount_cash:
                            secondaryCurrency_couponDiscount_cash,
                        totalCash: secondaryCurrency_totalCash,
                        wallet_cash: secondaryCurrency_wallet_cash,
                    },
                    online: {
                        originalOrderAmount_online:
                            secondaryCurrency_originalOrderAmount_online,
                        discount_online: secondaryCurrency_discount_online,
                        loyaltyPoints_online:
                            secondaryCurrency_loyaltyPoints_online,
                        buy1Get1_online: secondaryCurrency_buy1Get1_online,
                        couponDiscount_online:
                            secondaryCurrency_couponDiscount_online,
                        totalOnline: secondaryCurrency_totalOnline,
                        wallet_online: secondaryCurrency_wallet_online,
                    },
                    AdminMarketingCashback: {
                        discount_amc: secondaryCurrency_discount_amc,
                        buy1Get1_amc: secondaryCurrency_buy1Get1_amc,
                        couponDiscount_amc:
                            secondaryCurrency_couponDiscount_amc,
                        pointsCashback: secondaryCurrency_pointsCashback,
                        adminMarketingCashback:
                            secondaryCurrency_adminMarketingCashback,
                    },
                    orderAmount: secondaryCurrency_orderAmount,
                    adminFees: secondaryCurrency_adminFees,
                    totalVat:
                        orderStatisticsByDate.totalValue
                            .secondaryCurrency_totalVat,
                    otherPayments: {
                        freeDeliveryByShop:
                            secondaryCurrency_freeDeliveryByShop,
                        featuredAmount: secondaryCurrency_featuredAmount,
                        customerRefund: secondaryCurrency_customerRefund,
                        shopAddRemoveCredit:
                            secondaryCurrency_shopAddRemoveCredit,
                        errorCharge: secondaryCurrency_errorCharge,
                        totalOtherPayments:
                            secondaryCurrency_freeDeliveryByShop +
                            secondaryCurrency_featuredAmount +
                            secondaryCurrency_customerRefund +
                            secondaryCurrency_errorCharge -
                            secondaryCurrency_shopAddRemoveCredit,
                    },
                    deliveryFee: {
                        deliveryFee:
                            secondaryCurrency_deliveryFee_cash +
                            secondaryCurrency_deliveryFee_online +
                            secondaryCurrency_riderTip_online,
                        cash: secondaryCurrency_deliveryFee_cash,
                        online:
                            secondaryCurrency_deliveryFee_online +
                            secondaryCurrency_riderTip_online,
                        deliveryFee_online:
                            secondaryCurrency_deliveryFee_online,
                        riderTip_online: secondaryCurrency_riderTip_online,
                    },
                    cashInHand: secondaryCurrency_totalShopCashInHand,
                    totalPaid: secondaryCurrency_totalShopEarningByDate,
                    totalUnpaid: secondaryCurrency_totalShopUnsettleByDate,
                    totalPayout: secondaryCurrency_totalPayout,
                    totalPayoutAvgInPercentage:
                        secondaryCurrency_totalShopProfitAvgInPercentage,
                },
            };
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: { ...result },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.getOrderShopProfitBreakdown = async (req, res) => {
//     try {
//         const {
//             page = 1,
//             pageSize = 50,
//             pagingRange = 5,
//             sortBy = 'DESC',
//             startDate,
//             endDate,
//             searchKey,
//             shop,
//             seller,
//             paidCurrency,
//         } = req.query;

//         let config = {
//             $or: [
//                 {
//                     orderStatus: 'delivered',
//                 },
//                 {
//                     orderStatus: 'cancelled',
//                     isEndorseLoss: true,
//                 },
//             ],
//         };

//         if (startDate && endDate) {
//             const startDateTime = moment(new Date(startDate)).startOf('day').toDate();
//             const endDateTime = moment(
//                 endDate ? new Date(endDate) : new Date()
//             ).endOf('day');

//             config = {
//                 ...config,
//                 createdAt: {
//                     $gte: startDateTime,
//                     $lte: endDateTime,
//                 },
//             };
//         }

//         if (seller) {
//             config.seller = seller;
//         }

//         if (shop) {
//             config.shop = shop;
//         }

//         if (
//             paidCurrency &&
//             ['baseCurrency', 'secondaryCurrency'].includes(paidCurrency)
//         ) {
//             config = {
//                 ...config,
//                 paidCurrency,
//             };
//         }

//         if (searchKey) {
//             const newQuery = searchKey.split(/[ ,]+/);
//             const orderIDSearchQuery = newQuery.map(str => ({
//                 orderId: RegExp(str, 'i'),
//             }));

//             const autoGenIdQ = newQuery.map(str => ({
//                 autoGenId: RegExp(str, 'i'),
//             }));

//             const noteSearchQuery = newQuery.map(str => ({
//                 note: RegExp(str, 'i'),
//             }));

//             config = {
//                 ...config,
//                 $and: [
//                     {
//                         $or: [
//                             { $and: orderIDSearchQuery },
//                             { $and: noteSearchQuery },
//                             { $and: autoGenIdQ },
//                         ],
//                     },
//                 ],
//             };
//         }

//         const paginate = await pagination({
//             page,
//             pageSize,
//             model: OrderModel,
//             condition: config,
//             pagingRange,
//         });

//         let orderList = await OrderModel.find(config)
//             .sort({ createdAt: sortBy })
//             .skip(paginate.offset)
//             .limit(paginate.limit)
//             .populate([
//                 {
//                     path: 'userRefundTnx',
//                 },
//                 {
//                     path: 'shop',
//                     select: '-password',
//                 },
//                 {
//                     path: 'user',
//                     select: '-password',
//                 },
//                 {
//                     path: 'users',
//                     select: '-password',
//                 },
//                 {
//                     path: 'deliveryBoy',
//                     select: '-password',
//                 },
//                 {
//                     path: 'cart',
//                     populate: [
//                         {
//                             path: 'cartItems.user',
//                         },
//                         {
//                             path: 'creator',
//                         },
//                     ],
//                 },
//             ]);

//         for (const order of orderList) {
//             if (paidCurrency === 'baseCurrency') {
//                 const { profitBreakdown } =
//                     getOrderShopProfitBreakdownInBaseCurrency(order);
//                 order._doc.profitBreakdown = profitBreakdown;
//             } else {
//                 const { profitBreakdown } =
//                     getOrderShopProfitBreakdownInSecondaryCurrency(order);
//                 order._doc.profitBreakdown = profitBreakdown;
//             }
//         }

//         successResponse(res, {
//             message: 'Successfully get orders',
//             data: {
//                 orders: orderList,
//                 paginate,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
exports.getOrderShopProfitBreakdown = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            shop,
            seller,
            paidCurrency,
        } = req.query;

        let config = {};

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            config = {
                ...config,
                $or: [
                    {
                        orderStatus: 'delivered',
                        deliveredAt: {
                            $gte: startDateTime,
                            $lte: endDateTime,
                        },
                    },
                    {
                        orderStatus: 'cancelled',
                        isEndorseLoss: true,
                        cancelledAt: {
                            $gte: startDateTime,
                            $lte: endDateTime,
                        },
                    },
                ],
            };
        } else {
            config = {
                ...config,
                $or: [
                    {
                        orderStatus: 'delivered',
                    },
                    {
                        orderStatus: 'cancelled',
                        isEndorseLoss: true,
                    },
                ],
            };
        }

        if (seller) {
            config.seller = seller;
        }

        if (shop) {
            config.shop = shop;
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const orderIDSearchQuery = newQuery.map(str => ({
                orderId: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const noteSearchQuery = newQuery.map(str => ({
                note: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [
                            { $and: orderIDSearchQuery },
                            { $and: noteSearchQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: OrderModel,
            condition: config,
            pagingRange,
        });

        let orderList = await OrderModel.find(config)
            .sort({ order_placedAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'userRefundTnx',
                },
                {
                    path: 'shop',
                    select: '-password',
                },
                {
                    path: 'user',
                    select: '-password',
                },
                {
                    path: 'users',
                    select: '-password',
                },
                {
                    path: 'deliveryBoy',
                    select: '-password',
                },
                {
                    path: 'cart',
                    populate: [
                        {
                            path: 'cartItems.user',
                        },
                        {
                            path: 'creator',
                        },
                    ],
                },
            ]);

        for (const order of orderList) {
            if (paidCurrency === 'baseCurrency') {
                const { profitBreakdown } =
                    getOrderShopProfitBreakdownInBaseCurrency(order);
                order._doc.profitBreakdown = profitBreakdown;
            } else {
                const { profitBreakdown } =
                    getOrderShopProfitBreakdownInSecondaryCurrency(order);
                order._doc.profitBreakdown = profitBreakdown;
            }
        }

        successResponse(res, {
            message: 'Successfully get orders',
            data: {
                orders: orderList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSellerShopProfitBreakdown = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 20,
            pagingRange = 5,
            sortBy = 'desc',
            startDate,
            endDate,
            searchKey,
            paidCurrency,
        } = req.query;

        let config = {
            deletedAt: null,
            parentSeller: null,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const nationalIdSearchQuery = newQuery.map(str => ({
                national_id: RegExp(str, 'i'),
            }));

            const emailSearchQuery = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            const company_nameSearchQuery = newQuery.map(str => ({
                company_name: RegExp(str, 'i'),
            }));

            const phone_numberSearchQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: nationalIdSearchQuery },
                            { $and: emailSearchQuery },
                            { $and: company_nameSearchQuery },
                            { $and: phone_numberSearchQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: SellerModel,
            condition: config,
            pagingRange,
        });

        const sellerList = await SellerModel.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .select('-password');

        for (const seller of sellerList) {
            if (paidCurrency === 'baseCurrency') {
                const { profitBreakdown } =
                    await getShopProfitBreakdownInBaseCurrency({
                        type: 'seller',
                        id: seller._id,
                        startDate,
                        endDate,
                    });

                seller._doc.profitBreakdown = profitBreakdown;
            } else {
                const { profitBreakdown } =
                    await getShopProfitBreakdownInSecondaryCurrency({
                        type: 'seller',
                        id: seller._id,
                        startDate,
                        endDate,
                    });

                seller._doc.profitBreakdown = profitBreakdown;
            }
        }

        successResponse(res, {
            message: 'Successfully get sellers',
            data: {
                sellers: sellerList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllSellerShopProfitBreakdown = async (req, res) => {
    try {
        const {
            sortBy = 'desc',
            startDate,
            endDate,
            searchKey,
            paidCurrency,
        } = req.query;

        let config = {
            deletedAt: null,
            parentSeller: null,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const nationalIdSearchQuery = newQuery.map(str => ({
                national_id: RegExp(str, 'i'),
            }));

            const emailSearchQuery = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            const company_nameSearchQuery = newQuery.map(str => ({
                company_name: RegExp(str, 'i'),
            }));

            const phone_numberSearchQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: nationalIdSearchQuery },
                            { $and: emailSearchQuery },
                            { $and: company_nameSearchQuery },
                            { $and: phone_numberSearchQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        const sellerList = await SellerModel.find(config)
            .sort({ createdAt: sortBy })
            .select('-password');

        for (const seller of sellerList) {
            if (paidCurrency === 'baseCurrency') {
                const { profitBreakdown } =
                    await getShopProfitBreakdownInBaseCurrency({
                        type: 'seller',
                        id: seller._id,
                        startDate,
                        endDate,
                    });

                seller._doc.profitBreakdown = profitBreakdown;
            } else {
                const { profitBreakdown } =
                    await getShopProfitBreakdownInSecondaryCurrency({
                        type: 'seller',
                        id: seller._id,
                        startDate,
                        endDate,
                    });

                seller._doc.profitBreakdown = profitBreakdown;
            }
        }

        successResponse(res, {
            message: 'Successfully get sellers',
            data: {
                sellers: sellerList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getShopProfitBreakdown = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            paidCurrency,
            liveStatus,
            sellerId,
            shopType,
            shopStatus,
        } = req.query;

        let config = { deletedAt: null, parentShop: null };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                shopName: RegExp(str, 'i'),
            }));

            const phone_numberQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const emailQ = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: autoGenIdQ },
                            { $and: phone_numberQuery },
                            { $and: emailQ },
                        ],
                    },
                ],
            };
        }

        if (liveStatus && ['online', 'offline', 'busy'].includes(liveStatus)) {
            config.liveStatus = liveStatus;
        }

        if (sellerId) {
            config.seller = sellerId;
        }

        if (
            shopType &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                shopType
            )
        ) {
            config.shopType = shopType;
        }

        if (
            shopStatus &&
            ['active', 'inactive', 'blocked'].includes(shopStatus)
        ) {
            config.shopStatus = shopStatus;
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: ShopModel,
            condition: config,
            pagingRange,
        });

        let shopList = await ShopModel.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        for (const shop of shopList) {
            if (paidCurrency === 'baseCurrency') {
                const { profitBreakdown } =
                    await getShopProfitBreakdownInBaseCurrency({
                        type: 'shop',
                        id: shop._id,
                        startDate,
                        endDate,
                    });

                shop._doc.profitBreakdown = profitBreakdown;
            } else {
                const { profitBreakdown } =
                    await getShopProfitBreakdownInSecondaryCurrency({
                        type: 'shop',
                        id: shop._id,
                        startDate,
                        endDate,
                    });

                shop._doc.profitBreakdown = profitBreakdown;
            }
        }

        successResponse(res, {
            message: 'Successfully get shops',
            data: {
                shops: shopList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllShopProfitBreakdown = async (req, res) => {
    try {
        const {
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            paidCurrency,
            liveStatus,
            sellerId,
            shopType,
            shopStatus,
        } = req.query;

        let config = { deletedAt: null, parentShop: null };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                shopName: RegExp(str, 'i'),
            }));

            const phone_numberQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const emailQ = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: autoGenIdQ },
                            { $and: phone_numberQuery },
                            { $and: emailQ },
                        ],
                    },
                ],
            };
        }

        if (liveStatus && ['online', 'offline', 'busy'].includes(liveStatus)) {
            config.liveStatus = liveStatus;
        }

        if (sellerId) {
            config.seller = sellerId;
        }

        if (
            shopType &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                shopType
            )
        ) {
            config.shopType = shopType;
        }

        if (
            shopStatus &&
            ['active', 'inactive', 'blocked'].includes(shopStatus)
        ) {
            config.shopStatus = shopStatus;
        }

        let shopList = await ShopModel.find(config).sort({ createdAt: sortBy });

        for (const shop of shopList) {
            if (paidCurrency === 'baseCurrency') {
                const { profitBreakdown } =
                    await getShopProfitBreakdownInBaseCurrency({
                        type: 'shop',
                        id: shop._id,
                        startDate,
                        endDate,
                    });

                shop._doc.profitBreakdown = profitBreakdown;
            } else {
                const { profitBreakdown } =
                    await getShopProfitBreakdownInSecondaryCurrency({
                        type: 'shop',
                        id: shop._id,
                        startDate,
                        endDate,
                    });

                shop._doc.profitBreakdown = profitBreakdown;
            }
        }

        successResponse(res, {
            message: 'Successfully get shops',
            data: {
                shops: shopList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getRiderFinancial = async (req, res) => {
    try {
        const { startDate, endDate, riderId } = req.query;

        const appSetting = await AppSetting.findOne({});
        const currency =
            appSetting.adminExchangeRate === 0
                ? 'baseCurrency'
                : 'secondaryCurrency';

        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        let profitBreakdown;

        if (currency === 'baseCurrency') {
            const {
                totalDeliveredOrder: totalDeliveredNormalOrder,
                totalDeliveredButlerOrder,
                riderPayout: riderPayoutForOrder,
                riderPayoutForButler: riderPayoutForButler,
                adminDeliveryProfit: adminOrderDeliveryProfit,
                adminButlerProfit: adminButlerProfit,
            } = await this.getDeliveryFinancial({
                riderId,
                isShopRiderSubscriptionLossAdjust: false,
            });
            const totalDeliveredOrder =
                totalDeliveredNormalOrder + totalDeliveredButlerOrder;
            const riderPayout = riderPayoutForOrder + riderPayoutForButler;
            const adminDeliveryProfit =
                adminOrderDeliveryProfit + adminButlerProfit;

            const {
                totalDeliveredOrder: totalDeliveredNormalOrderByDate,
                totalDeliveredButlerOrder: totalDeliveredButlerOrderByDate,
                deliveryFee: totalDeliveryFee,
                orderAmount: orderAmount,
                userPayDeliveryFee: users,
                freeDeliveryShopCut: freeDeliveryByShop,
                freeDeliveryAdminCut: freeDeliveryByAdmin,
                freeDeliveryAdminCutForSubscription:
                    freeDeliveryByAdminForSubscription,
                riderPayout: riderPayoutForOrderByDate,
                riderPayoutForButler: riderPayoutForButlerByDate,
                userPayRiderTip: userPayRiderTipByDate,
                adminDeliveryProfit: adminOrderDeliveryProfitByDate,
                adminButlerProfit: adminButlerProfitByDate,
            } = await this.getDeliveryFinancial({
                startDate,
                endDate,
                riderId,
                isShopRiderSubscriptionLossAdjust: false,
            });

            const totalDeliveredOrderByDate =
                totalDeliveredNormalOrderByDate +
                totalDeliveredButlerOrderByDate;
            const riderPayoutByDate =
                riderPayoutForOrderByDate + riderPayoutForButlerByDate;
            const adminDeliveryProfitByDate =
                adminOrderDeliveryProfitByDate + adminButlerProfitByDate;

            const {
                totalDeliveredOrder: totalDeliveredNormalOrderByOldDate,
                totalDeliveredButlerOrder: totalDeliveredButlerOrderByOldDate,
                riderPayout: riderPayoutForOrderByOldDate,
                riderPayoutForButler: riderPayoutForButlerByOldDate,
                adminDeliveryProfit: adminOrderDeliveryProfitByOldDate,
                adminButlerProfit: adminButlerProfitByOldDate,
            } = await this.getDeliveryFinancial({
                startDate: oldStartDate,
                endDate: oldEndDate,
                riderId,
                isShopRiderSubscriptionLossAdjust: false,
            });
            const totalDeliveredOrderByOldDate =
                totalDeliveredNormalOrderByOldDate +
                totalDeliveredButlerOrderByOldDate;
            const riderPayoutByOldDate =
                riderPayoutForOrderByOldDate + riderPayoutForButlerByOldDate;
            const adminDeliveryProfitByOldDate =
                adminOrderDeliveryProfitByOldDate + adminButlerProfitByOldDate;

            // Calculate admin delivery profit avg start
            const adminDeliveryProfitByDateAvg =
                (adminDeliveryProfitByDate / adminDeliveryProfit) * 100;
            const adminDeliveryProfitByOldDateAvg =
                (adminDeliveryProfitByOldDate / adminDeliveryProfit) * 100;
            const adminDeliveryProfitAvgInPercentage =
                adminDeliveryProfitByDateAvg -
                    adminDeliveryProfitByOldDateAvg || 0;
            // Calculate admin delivery profit avg end

            // Calculate delivered order avg start
            const totalDeliveredOrderByDateAvg =
                (totalDeliveredOrderByDate / totalDeliveredOrder) * 100;
            const totalDeliveredOrderByOldDateAvg =
                (totalDeliveredOrderByOldDate / totalDeliveredOrder) * 100;
            const totalDeliveredOrderAvgInPercentage =
                totalDeliveredOrderByDateAvg -
                    totalDeliveredOrderByOldDateAvg || 0;
            // Calculate delivered order avg end

            // Calculate rider payout avg start
            const riderPayoutByDateAvg =
                (riderPayoutByDate / riderPayout) * 100;
            const riderPayoutByOldDateAvg =
                (riderPayoutByOldDate / riderPayout) * 100;
            const riderPayoutAvgInPercentage =
                riderPayoutByDateAvg - riderPayoutByOldDateAvg || 0;
            // Calculate rider payout avg end

            // Calculate rider add remove credit start
            const { totalAddRemoveCredit: riderAddRemoveCredit } =
                await this.getRiderAddRemoveCredit({
                    id: riderId,
                    startDate,
                    endDate,
                });
            // Calculate rider add remove credit end

            // Calculate rider weekly reward start
            const { riderWeeklyReward } = await this.getRiderWeeklyReward({
                id: riderId,
                startDate,
                endDate,
            });
            // Calculate rider weekly reward end

            profitBreakdown = {
                currency,
                totalDeliveredOrder: totalDeliveredOrderByDate,
                totalDeliveredOrderAvgInPercentage,
                adminDeliveryProfitAvgInPercentage,
                riderPayoutAvgInPercentage,
                profitBreakdown: {
                    users: users + orderAmount,
                    freeDeliveryByShop,
                    freeDeliveryByAdmin:
                        freeDeliveryByAdmin -
                        freeDeliveryByAdminForSubscription,
                    freeDeliveryByAdminForSubscription,
                    totalDeliveryFee: totalDeliveryFee + orderAmount,
                    adminDeliveryProfit:
                        adminDeliveryProfitByDate + freeDeliveryByAdmin,
                    riderTips: userPayRiderTipByDate,
                    riderAddRemoveCredit,
                    riderWeeklyReward,
                    riderPayout:
                        riderPayoutByDate +
                        riderAddRemoveCredit +
                        riderWeeklyReward,
                },
            };
        } else {
            const {
                totalDeliveredOrder: totalDeliveredNormalOrder,
                totalDeliveredButlerOrder,
                secondaryCurrency_riderPayout: riderPayoutForOrder,
                secondaryCurrency_riderPayoutForButler: riderPayoutForButler,
                secondaryCurrency_adminDeliveryProfit: adminOrderDeliveryProfit,
                secondaryCurrency_adminButlerProfit: adminButlerProfit,
            } = await this.getDeliveryFinancial({
                riderId,
                isShopRiderSubscriptionLossAdjust: false,
            });
            const totalDeliveredOrder =
                totalDeliveredNormalOrder + totalDeliveredButlerOrder;
            const riderPayout = riderPayoutForOrder + riderPayoutForButler;
            const adminDeliveryProfit =
                adminOrderDeliveryProfit + adminButlerProfit;

            const {
                totalDeliveredOrder: totalDeliveredNormalOrderByDate,
                totalDeliveredButlerOrder: totalDeliveredButlerOrderByDate,
                secondaryCurrency_deliveryFee: totalDeliveryFee,
                secondaryCurrency_orderAmount: orderAmount,
                secondaryCurrency_userPayDeliveryFee: users,
                secondaryCurrency_freeDeliveryShopCut: freeDeliveryByShop,
                secondaryCurrency_freeDeliveryAdminCut: freeDeliveryByAdmin,
                secondaryCurrency_freeDeliveryAdminCutForSubscription:
                    freeDeliveryByAdminForSubscription,
                secondaryCurrency_riderPayout: riderPayoutForOrderByDate,
                secondaryCurrency_riderPayoutForButler:
                    riderPayoutForButlerByDate,
                secondaryCurrency_userPayRiderTip: userPayRiderTipByDate,
                secondaryCurrency_adminDeliveryProfit:
                    adminOrderDeliveryProfitByDate,
                secondaryCurrency_adminButlerProfit: adminButlerProfitByDate,
            } = await this.getDeliveryFinancial({
                startDate,
                endDate,
                riderId,
                isShopRiderSubscriptionLossAdjust: false,
            });

            const totalDeliveredOrderByDate =
                totalDeliveredNormalOrderByDate +
                totalDeliveredButlerOrderByDate;
            const riderPayoutByDate =
                riderPayoutForOrderByDate + riderPayoutForButlerByDate;
            const adminDeliveryProfitByDate =
                adminOrderDeliveryProfitByDate + adminButlerProfitByDate;

            const {
                totalDeliveredOrder: totalDeliveredNormalOrderByOldDate,
                totalDeliveredButlerOrder: totalDeliveredButlerOrderByOldDate,
                secondaryCurrency_riderPayout: riderPayoutForOrderByOldDate,
                secondaryCurrency_riderPayoutForButler:
                    riderPayoutForButlerByOldDate,
                secondaryCurrency_adminDeliveryProfit:
                    adminOrderDeliveryProfitByOldDate,
                secondaryCurrency_adminButlerProfit: adminButlerProfitByOldDate,
            } = await this.getDeliveryFinancial({
                startDate: oldStartDate,
                endDate: oldEndDate,
                riderId,
                isShopRiderSubscriptionLossAdjust: false,
            });
            const totalDeliveredOrderByOldDate =
                totalDeliveredNormalOrderByOldDate +
                totalDeliveredButlerOrderByOldDate;
            const riderPayoutByOldDate =
                riderPayoutForOrderByOldDate + riderPayoutForButlerByOldDate;
            const adminDeliveryProfitByOldDate =
                adminOrderDeliveryProfitByOldDate + adminButlerProfitByOldDate;

            // Calculate admin delivery profit avg start
            const adminDeliveryProfitByDateAvg =
                (adminDeliveryProfitByDate / adminDeliveryProfit) * 100;
            const adminDeliveryProfitByOldDateAvg =
                (adminDeliveryProfitByOldDate / adminDeliveryProfit) * 100;
            const adminDeliveryProfitAvgInPercentage =
                adminDeliveryProfitByDateAvg -
                    adminDeliveryProfitByOldDateAvg || 0;
            // Calculate admin delivery profit avg end

            // Calculate delivered order avg start
            const totalDeliveredOrderByDateAvg =
                (totalDeliveredOrderByDate / totalDeliveredOrder) * 100;
            const totalDeliveredOrderByOldDateAvg =
                (totalDeliveredOrderByOldDate / totalDeliveredOrder) * 100;
            const totalDeliveredOrderAvgInPercentage =
                totalDeliveredOrderByDateAvg -
                    totalDeliveredOrderByOldDateAvg || 0;
            // Calculate delivered order avg end

            // Calculate rider payout avg start
            const riderPayoutByDateAvg =
                (riderPayoutByDate / riderPayout) * 100;
            const riderPayoutByOldDateAvg =
                (riderPayoutByOldDate / riderPayout) * 100;
            const riderPayoutAvgInPercentage =
                riderPayoutByDateAvg - riderPayoutByOldDateAvg || 0;
            // Calculate rider payout avg end

            // Calculate rider add remove credit start
            const {
                secondaryCurrency_totalAddRemoveCredit: riderAddRemoveCredit,
            } = await this.getRiderAddRemoveCredit({
                id: riderId,
                startDate,
                endDate,
            });
            // Calculate rider add remove credit end

            // Calculate rider weekly reward start
            const { secondaryCurrency_riderWeeklyReward: riderWeeklyReward } =
                await this.getRiderWeeklyReward({
                    id: riderId,
                    startDate,
                    endDate,
                });
            // Calculate rider weekly reward end

            profitBreakdown = {
                currency,
                totalDeliveredOrder: totalDeliveredOrderByDate,
                totalDeliveredOrderAvgInPercentage,
                adminDeliveryProfitAvgInPercentage,
                riderPayoutAvgInPercentage,
                profitBreakdown: {
                    users: users + orderAmount,
                    freeDeliveryByShop,
                    freeDeliveryByAdmin:
                        freeDeliveryByAdmin -
                        freeDeliveryByAdminForSubscription,
                    freeDeliveryByAdminForSubscription,
                    totalDeliveryFee: totalDeliveryFee + orderAmount,
                    adminDeliveryProfit:
                        adminDeliveryProfitByDate + freeDeliveryByAdmin,
                    riderTips: userPayRiderTipByDate,
                    riderAddRemoveCredit,
                    riderWeeklyReward,
                    riderPayout:
                        riderPayoutByDate +
                        riderAddRemoveCredit +
                        riderWeeklyReward,
                },
            };
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: profitBreakdown,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getRiderFinancialSecondaryCurrency = async (req, res) => {
    try {
        const { startDate, endDate, riderId } = req.query;

        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        const {
            totalDeliveredOrder: totalDeliveredNormalOrder,
            totalDeliveredButlerOrder,
            secondaryCurrency_riderPayout: riderPayoutForOrder,
            secondaryCurrency_riderPayoutForButler: riderPayoutForButler,
            secondaryCurrency_adminDeliveryProfit: adminOrderDeliveryProfit,
            secondaryCurrency_adminButlerProfit: adminButlerProfit,
        } = await this.getDeliveryFinancial({
            riderId,
        });
        const totalDeliveredOrder =
            totalDeliveredNormalOrder + totalDeliveredButlerOrder;
        const riderPayout = riderPayoutForOrder + riderPayoutForButler;
        const adminDeliveryProfit =
            adminOrderDeliveryProfit + adminButlerProfit;

        const {
            totalDeliveredOrder: totalDeliveredNormalOrderByDate,
            totalDeliveredButlerOrder: totalDeliveredButlerOrderByDate,
            secondaryCurrency_deliveryFee: totalDeliveryFee,
            secondaryCurrency_orderAmount: orderAmount,
            secondaryCurrency_userPayDeliveryFee: users,
            secondaryCurrency_freeDeliveryShopCut: freeDeliveryByShop,
            secondaryCurrency_freeDeliveryAdminCut: freeDeliveryByAdmin,
            secondaryCurrency_riderPayout: riderPayoutForOrderByDate,
            secondaryCurrency_riderPayoutForButler: riderPayoutForButlerByDate,
            secondaryCurrency_userPayRiderTip: userPayRiderTipByDate,
            secondaryCurrency_adminDeliveryProfit:
                adminOrderDeliveryProfitByDate,
            secondaryCurrency_adminButlerProfit: adminButlerProfitByDate,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
            riderId,
        });
        const totalDeliveredOrderByDate =
            totalDeliveredNormalOrderByDate + totalDeliveredButlerOrderByDate;
        const riderPayoutByDate =
            riderPayoutForOrderByDate + riderPayoutForButlerByDate;
        const adminDeliveryProfitByDate =
            adminOrderDeliveryProfitByDate + adminButlerProfitByDate;

        const {
            totalDeliveredOrder: totalDeliveredNormalOrderByOldDate,
            totalDeliveredButlerOrder: totalDeliveredButlerOrderByOldDate,
            secondaryCurrency_riderPayout: riderPayoutForOrderByOldDate,
            secondaryCurrency_riderPayoutForButler:
                riderPayoutForButlerByOldDate,
            secondaryCurrency_adminDeliveryProfit:
                adminOrderDeliveryProfitByOldDate,
            secondaryCurrency_adminButlerProfit: adminButlerProfitByOldDate,
        } = await this.getDeliveryFinancial({
            startDate: oldStartDate,
            endDate: oldEndDate,
            riderId,
        });
        const totalDeliveredOrderByOldDate =
            totalDeliveredNormalOrderByOldDate +
            totalDeliveredButlerOrderByOldDate;
        const riderPayoutByOldDate =
            riderPayoutForOrderByOldDate + riderPayoutForButlerByOldDate;
        const adminDeliveryProfitByOldDate =
            adminOrderDeliveryProfitByOldDate + adminButlerProfitByOldDate;

        // Calculate admin delivery profit avg start
        const adminDeliveryProfitByDateAvg =
            (adminDeliveryProfitByDate / adminDeliveryProfit) * 100;
        const adminDeliveryProfitByOldDateAvg =
            (adminDeliveryProfitByOldDate / adminDeliveryProfit) * 100;
        const adminDeliveryProfitAvgInPercentage =
            adminDeliveryProfitByDateAvg - adminDeliveryProfitByOldDateAvg || 0;
        // Calculate admin delivery profit avg end

        // Calculate delivered order avg start
        const totalDeliveredOrderByDateAvg =
            (totalDeliveredOrderByDate / totalDeliveredOrder) * 100;
        const totalDeliveredOrderByOldDateAvg =
            (totalDeliveredOrderByOldDate / totalDeliveredOrder) * 100;
        const totalDeliveredOrderAvgInPercentage =
            totalDeliveredOrderByDateAvg - totalDeliveredOrderByOldDateAvg || 0;
        // Calculate delivered order avg end

        // Calculate rider payout avg start
        const riderPayoutByDateAvg = (riderPayoutByDate / riderPayout) * 100;
        const riderPayoutByOldDateAvg =
            (riderPayoutByOldDate / riderPayout) * 100;
        const riderPayoutAvgInPercentage =
            riderPayoutByDateAvg - riderPayoutByOldDateAvg || 0;
        // Calculate rider payout avg end

        // const {
        //     riderPayout: baseCurrency_riderPayout,
        //     riderPayoutForButler: baseCurrency_riderPayoutForButler,
        // } = await this.getDeliveryFinancial({
        //     startDate,
        //     endDate,
        //     riderId,
        //     paidCurrency: 'baseCurrency',
        // });

        // const {
        //     secondaryCurrency_riderPayout,
        //     secondaryCurrency_riderPayoutForButler,
        // } = await this.getDeliveryFinancial({
        //     startDate,
        //     endDate,
        //     riderId,
        //     paidCurrency: 'secondaryCurrency',
        // });

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                totalDeliveredOrder: totalDeliveredOrderByDate,
                totalDeliveredOrderAvgInPercentage,
                adminDeliveryProfitAvgInPercentage,
                riderPayoutAvgInPercentage,
                profitBreakdown: {
                    users: users + orderAmount,
                    freeDeliveryByShop,
                    freeDeliveryByAdmin,
                    totalDeliveryFee: totalDeliveryFee + orderAmount,
                    adminDeliveryProfit:
                        adminDeliveryProfitByDate + freeDeliveryByAdmin,
                    riderTips: userPayRiderTipByDate,
                    riderPayout: riderPayoutByDate,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getRiderProfitBreakdown = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            liveStatus,
            status,
            paidCurrency,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            deliveryBoyType: 'dropRider',
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [{ $and: nameSearchQuery }, { $and: autoGenIdQ }],
                    },
                ],
            };
        }

        if (status && ['active', 'deactive'].includes(status)) {
            whereConfig = {
                ...whereConfig,
                status,
            };
        }

        if (liveStatus && ['online', 'offline'].includes(liveStatus)) {
            whereConfig = {
                ...whereConfig,
                liveStatus,
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: DeliveryBoyModel,
            condition: whereConfig,
            pagingRange,
        });

        const riderList = await DeliveryBoyModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        for (const rider of riderList) {
            if (paidCurrency === 'baseCurrency') {
                const {
                    deliveryFee: totalDeliveryFee,
                    orderAmount: orderAmount,
                    userPayDeliveryFee: users,
                    freeDeliveryShopCut: freeDeliveryByShop,
                    freeDeliveryAdminCut: freeDeliveryByAdmin,
                    riderPayout: riderPayoutForOrder,
                    riderPayoutForButler: riderPayoutForButler,
                    userPayRiderTip: userPayRiderTip,
                    adminDeliveryProfit: adminOrderDeliveryProfit,
                    adminButlerProfit: adminButlerProfit,
                } = await this.getDeliveryFinancial({
                    startDate,
                    endDate,
                    riderId: rider._id,
                    // paidCurrency,
                    isShopRiderSubscriptionLossAdjust: false,
                });

                const riderPayout = riderPayoutForOrder + riderPayoutForButler;
                const adminDeliveryProfit =
                    adminOrderDeliveryProfit + adminButlerProfit;

                const {
                    riderCashInHand: baseCurrency_CashInHand,
                    secondaryCurrency_riderCashInHand:
                        secondaryCurrency_CashInHand,
                } = await this.getRiderActualCashInHand({
                    startDate,
                    endDate,
                    riderId: rider._id,
                });

                // Calculate rider add remove credit start
                const { totalAddRemoveCredit: riderAddRemoveCredit } =
                    await this.getRiderAddRemoveCredit({
                        id: rider._id,
                        startDate,
                        endDate,
                    });
                // Calculate rider add remove credit end

                // Calculate rider weekly reward
                const { riderWeeklyReward } = await this.getRiderWeeklyReward({
                    id: rider._id,
                    startDate,
                    endDate,
                });
                // Calculate rider weekly reward

                const profitBreakdown = {
                    users: users + orderAmount,
                    freeDeliveryByShop,
                    freeDeliveryByAdmin,
                    totalDeliveryFee: totalDeliveryFee + orderAmount,
                    adminDeliveryProfit:
                        adminDeliveryProfit + freeDeliveryByAdmin,
                    riderTips: userPayRiderTip,
                    riderAddRemoveCredit,
                    riderWeeklyReward,
                    riderPayout:
                        riderPayout + riderAddRemoveCredit + riderWeeklyReward,
                    cashInHand: {
                        baseCurrency_CashInHand,
                        secondaryCurrency_CashInHand,
                    },
                };

                rider._doc.profitBreakdown = profitBreakdown;
            } else {
                const {
                    secondaryCurrency_deliveryFee: totalDeliveryFee,
                    secondaryCurrency_orderAmount: orderAmount,
                    secondaryCurrency_userPayDeliveryFee: users,
                    secondaryCurrency_freeDeliveryShopCut: freeDeliveryByShop,
                    secondaryCurrency_freeDeliveryAdminCut: freeDeliveryByAdmin,
                    secondaryCurrency_riderPayout: riderPayoutForOrder,
                    secondaryCurrency_riderPayoutForButler:
                        riderPayoutForButler,
                    secondaryCurrency_userPayRiderTip: userPayRiderTip,
                    secondaryCurrency_adminDeliveryProfit:
                        adminOrderDeliveryProfit,
                    secondaryCurrency_adminButlerProfit: adminButlerProfit,
                } = await this.getDeliveryFinancial({
                    startDate,
                    endDate,
                    riderId: rider._id,
                    // paidCurrency,
                    isShopRiderSubscriptionLossAdjust: false,
                });

                const riderPayout = riderPayoutForOrder + riderPayoutForButler;
                const adminDeliveryProfit =
                    adminOrderDeliveryProfit + adminButlerProfit;

                const {
                    riderCashInHand: baseCurrency_CashInHand,
                    secondaryCurrency_riderCashInHand:
                        secondaryCurrency_CashInHand,
                } = await this.getRiderActualCashInHand({
                    startDate,
                    endDate,
                    riderId: rider._id,
                });

                // Calculate rider add remove credit start
                const {
                    secondaryCurrency_totalAddRemoveCredit:
                        riderAddRemoveCredit,
                } = await this.getRiderAddRemoveCredit({
                    id: rider._id,
                    startDate,
                    endDate,
                });
                // Calculate rider add remove credit end

                // Calculate rider weekly reward
                const {
                    secondaryCurrency_riderWeeklyReward: riderWeeklyReward,
                } = await this.getRiderWeeklyReward({
                    id: rider._id,
                    startDate,
                    endDate,
                });
                // Calculate rider weekly reward

                const profitBreakdown = {
                    users: users + orderAmount,
                    freeDeliveryByShop,
                    freeDeliveryByAdmin,
                    totalDeliveryFee: totalDeliveryFee + orderAmount,
                    adminDeliveryProfit:
                        adminDeliveryProfit + freeDeliveryByAdmin,
                    riderTips: userPayRiderTip,
                    riderAddRemoveCredit,
                    riderWeeklyReward,
                    riderPayout:
                        riderPayout + riderAddRemoveCredit + riderWeeklyReward,
                    cashInHand: {
                        baseCurrency_CashInHand,
                        secondaryCurrency_CashInHand,
                    },
                };

                rider._doc.profitBreakdown = profitBreakdown;
            }
        }

        successResponse(res, {
            message: 'Successfully get riders',
            data: {
                riders: riderList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllRiderProfitBreakdown = async (req, res) => {
    try {
        const {
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            liveStatus,
            status,
            paidCurrency,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            deliveryBoyType: 'dropRider',
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [{ $and: nameSearchQuery }, { $and: autoGenIdQ }],
                    },
                ],
            };
        }

        if (status && ['active', 'deactive'].includes(status)) {
            whereConfig = {
                ...whereConfig,
                status,
            };
        }

        if (liveStatus && ['online', 'offline'].includes(liveStatus)) {
            whereConfig = {
                ...whereConfig,
                liveStatus,
            };
        }

        const riderList = await DeliveryBoyModel.find(whereConfig).sort({
            createdAt: sortBy,
        });

        for (const rider of riderList) {
            if (paidCurrency === 'baseCurrency') {
                const {
                    deliveryFee: totalDeliveryFee,
                    orderAmount: orderAmount,
                    userPayDeliveryFee: users,
                    freeDeliveryShopCut: freeDeliveryByShop,
                    freeDeliveryAdminCut: freeDeliveryByAdmin,
                    riderPayout: riderPayoutForOrder,
                    riderPayoutForButler: riderPayoutForButler,
                    userPayRiderTip: userPayRiderTip,
                    adminDeliveryProfit: adminOrderDeliveryProfit,
                    adminButlerProfit: adminButlerProfit,
                } = await this.getDeliveryFinancial({
                    startDate,
                    endDate,
                    riderId: rider._id,
                    // paidCurrency,
                    isShopRiderSubscriptionLossAdjust: false,
                });

                const riderPayout = riderPayoutForOrder + riderPayoutForButler;
                const adminDeliveryProfit =
                    adminOrderDeliveryProfit + adminButlerProfit;

                const {
                    riderCashInHand: baseCurrency_CashInHand,
                    secondaryCurrency_riderCashInHand:
                        secondaryCurrency_CashInHand,
                } = await this.getRiderActualCashInHand({
                    startDate,
                    endDate,
                    riderId: rider._id,
                });

                // Calculate rider add remove credit start
                const { totalAddRemoveCredit: riderAddRemoveCredit } =
                    await this.getRiderAddRemoveCredit({
                        id: rider._id,
                        startDate,
                        endDate,
                    });
                // Calculate rider add remove credit end

                // Calculate rider weekly reward
                const { riderWeeklyReward } = await this.getRiderWeeklyReward({
                    id: rider._id,
                    startDate,
                    endDate,
                });
                // Calculate rider weekly reward

                const profitBreakdown = {
                    users: users + orderAmount,
                    freeDeliveryByShop,
                    freeDeliveryByAdmin,
                    totalDeliveryFee: totalDeliveryFee + orderAmount,
                    adminDeliveryProfit:
                        adminDeliveryProfit + freeDeliveryByAdmin,
                    riderTips: userPayRiderTip,
                    riderAddRemoveCredit,
                    riderWeeklyReward,
                    riderPayout:
                        riderPayout + riderAddRemoveCredit + riderWeeklyReward,
                    cashInHand: {
                        baseCurrency_CashInHand,
                        secondaryCurrency_CashInHand,
                    },
                };

                rider._doc.profitBreakdown = profitBreakdown;
            } else {
                const {
                    secondaryCurrency_deliveryFee: totalDeliveryFee,
                    secondaryCurrency_orderAmount: orderAmount,
                    secondaryCurrency_userPayDeliveryFee: users,
                    secondaryCurrency_freeDeliveryShopCut: freeDeliveryByShop,
                    secondaryCurrency_freeDeliveryAdminCut: freeDeliveryByAdmin,
                    secondaryCurrency_riderPayout: riderPayoutForOrder,
                    secondaryCurrency_riderPayoutForButler:
                        riderPayoutForButler,
                    secondaryCurrency_userPayRiderTip: userPayRiderTip,
                    secondaryCurrency_adminDeliveryProfit:
                        adminOrderDeliveryProfit,
                    secondaryCurrency_adminButlerProfit: adminButlerProfit,
                } = await this.getDeliveryFinancial({
                    startDate,
                    endDate,
                    riderId: rider._id,
                    // paidCurrency,
                    isShopRiderSubscriptionLossAdjust: false,
                });

                const riderPayout = riderPayoutForOrder + riderPayoutForButler;
                const adminDeliveryProfit =
                    adminOrderDeliveryProfit + adminButlerProfit;

                const {
                    riderCashInHand: baseCurrency_CashInHand,
                    secondaryCurrency_riderCashInHand:
                        secondaryCurrency_CashInHand,
                } = await this.getRiderActualCashInHand({
                    startDate,
                    endDate,
                    riderId: rider._id,
                });

                // Calculate rider add remove credit start
                const {
                    secondaryCurrency_totalAddRemoveCredit:
                        riderAddRemoveCredit,
                } = await this.getRiderAddRemoveCredit({
                    id: rider._id,
                    startDate,
                    endDate,
                });
                // Calculate rider add remove credit end

                // Calculate rider weekly reward
                const {
                    secondaryCurrency_riderWeeklyReward: riderWeeklyReward,
                } = await this.getRiderWeeklyReward({
                    id: rider._id,
                    startDate,
                    endDate,
                });
                // Calculate rider weekly reward

                const profitBreakdown = {
                    users: users + orderAmount,
                    freeDeliveryByShop,
                    freeDeliveryByAdmin,
                    totalDeliveryFee: totalDeliveryFee + orderAmount,
                    adminDeliveryProfit:
                        adminDeliveryProfit + freeDeliveryByAdmin,
                    riderTips: userPayRiderTip,
                    riderAddRemoveCredit,
                    riderWeeklyReward,
                    riderPayout:
                        riderPayout + riderAddRemoveCredit + riderWeeklyReward,
                    cashInHand: {
                        baseCurrency_CashInHand,
                        secondaryCurrency_CashInHand,
                    },
                };

                rider._doc.profitBreakdown = profitBreakdown;
            }
        }

        successResponse(res, {
            message: 'Successfully get riders',
            data: {
                riders: riderList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOrderRiderProfitBreakdown = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            riderId,
            paidCurrency,
        } = req.query;

        let config = {
            orderFor: 'global',
        };

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            config = {
                ...config,
                $or: [
                    {
                        deliveredAt: {
                            $gte: startDateTime,
                            $lte: endDateTime,
                        },
                    },
                    {
                        cancelledAt: {
                            $gte: startDateTime,
                            $lte: endDateTime,
                        },
                    },
                ],
            };
        }

        if (riderId) {
            config = {
                ...config,
                deliveryBoy: riderId,
            };
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const orderIDSearchQuery = newQuery.map(str => ({
                orderId: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const noteSearchQuery = newQuery.map(str => ({
                note: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [
                            { $and: orderIDSearchQuery },
                            { $and: noteSearchQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        let normalOrderList = await OrderModel.find({
            ...config,
            $or: [
                {
                    orderStatus: 'delivered',
                },
                {
                    orderStatus: 'cancelled',
                    isEndorseLoss: true,
                    inEndorseLossDeliveryFeeIncluded: true,
                },
            ],
        }).populate([
            {
                path: 'shop',
                select: '-password',
            },
            {
                path: 'user',
                select: '-password',
            },
            {
                path: 'users',
                select: '-password',
            },
            {
                path: 'deliveryBoy',
                select: '-password',
            },
            {
                path: 'cart',
                populate: [
                    {
                        path: 'cartItems.user',
                    },
                    {
                        path: 'creator',
                    },
                ],
            },
            {
                path: 'userRefundTnx',
            },
            {
                path: 'flag',
            },
        ]);

        let butlerOrderList = await ButlerModel.find({
            ...config,
            orderStatus: 'delivered',
        }).populate([
            {
                path: 'user',
                select: '-password',
            },
            {
                path: 'deliveryBoy',
                select: '-password',
            },
        ]);

        let orderList = [];
        if (sortBy.toUpperCase() === 'DESC') {
            orderList = [...normalOrderList, ...butlerOrderList].sort(
                (a, b) =>
                    new Date(b.order_placedAt) - new Date(a.order_placedAt)
            );
        } else {
            orderList = [...normalOrderList, ...butlerOrderList].sort(
                (a, b) =>
                    new Date(a.order_placedAt) - new Date(b.order_placedAt)
            );
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: orderList.length,
            pagingRange,
        });

        orderList = orderList.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        for (const order of orderList) {
            if (paidCurrency === 'baseCurrency') {
                const freeDeliveryByShop =
                    order?.freeDeliveryCut?.baseCurrency_freeDeliveryShopCut ||
                    0;
                const freeDeliveryByAdmin =
                    order?.freeDeliveryCut
                        ?.baseCurrency_dropLossForFreeDelivery || 0;

                const profitBreakdown = {
                    users: order.summary.baseCurrency_riderFee,
                    freeDeliveryByShop,
                    freeDeliveryByAdmin,
                    totalDeliveryFee: order?.isButler
                        ? order.summary.baseCurrency_riderFee
                        : order.summary.baseCurrency_riderFeeWithFreeDelivery,
                    adminDeliveryProfit:
                        order.adminCharge.baseCurrency_adminChargeFromDelivery +
                        freeDeliveryByAdmin,
                    riderTips: order.summary.baseCurrency_riderTip,
                    riderPayout: order.baseCurrency_riderFee,
                    // cashInHand: {
                    //     baseCurrency_CashInHand:
                    //         order.paidCurrency === 'baseCurrency' &&
                    //         !order.isEndorseLoss
                    //             ? order.summary.baseCurrency_cash
                    //             : 0,
                    //     secondaryCurrency_CashInHand:
                    //         order.paidCurrency === 'secondaryCurrency' &&
                    //         !order.isEndorseLoss
                    //             ? order.summary.secondaryCurrency_cash
                    //             : 0,
                    // },
                    cashInHand: {
                        baseCurrency_CashInHand: !order.isEndorseLoss
                            ? order.baseCurrency_collectCash
                            : 0,
                        secondaryCurrency_CashInHand: !order.isEndorseLoss
                            ? order.secondaryCurrency_collectCash
                            : 0,
                    },
                };

                order._doc.profitBreakdown = profitBreakdown;
            } else {
                const freeDeliveryByShop =
                    order?.freeDeliveryCut
                        ?.secondaryCurrency_freeDeliveryShopCut || 0;
                const freeDeliveryByAdmin =
                    order?.freeDeliveryCut
                        ?.secondaryCurrency_dropLossForFreeDelivery || 0;

                const profitBreakdown = {
                    users: order.summary.secondaryCurrency_riderFee,
                    freeDeliveryByShop,
                    freeDeliveryByAdmin,
                    totalDeliveryFee: order?.isButler
                        ? order.summary.secondaryCurrency_riderFee
                        : order.summary
                              .secondaryCurrency_riderFeeWithFreeDelivery,
                    adminDeliveryProfit:
                        order.adminCharge
                            .secondaryCurrency_adminChargeFromDelivery +
                        freeDeliveryByAdmin,
                    riderTips: order.summary.secondaryCurrency_riderTip,
                    riderPayout: order.secondaryCurrency_riderFee,
                    // cashInHand: {
                    //     baseCurrency_CashInHand:
                    //         order.paidCurrency === 'baseCurrency' &&
                    //         !order.isEndorseLoss
                    //             ? order.summary.baseCurrency_cash
                    //             : 0,
                    //     secondaryCurrency_CashInHand:
                    //         order.paidCurrency === 'secondaryCurrency' &&
                    //         !order.isEndorseLoss
                    //             ? order.summary.secondaryCurrency_cash
                    //             : 0,
                    // },
                    cashInHand: {
                        baseCurrency_CashInHand: !order.isEndorseLoss
                            ? order.baseCurrency_collectCash
                            : 0,
                        secondaryCurrency_CashInHand: !order.isEndorseLoss
                            ? order.secondaryCurrency_collectCash
                            : 0,
                    },
                };

                order._doc.profitBreakdown = profitBreakdown;
            }
        }

        successResponse(res, {
            message: 'Successfully get orders',
            data: {
                orders: orderList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getRiderAppProfitBreakdown = async (req, res) => {
    try {
        let {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'DESC',
            startDate,
            endDate,
            timestamp, // weekly
        } = req.query;

        const riderId = req.deliveryBoyId;

        const appSetting = await AppSetting.findOne({});
        const currency =
            appSetting?.adminExchangeRate === 0
                ? 'baseCurrency'
                : 'secondaryCurrency';

        let config = { deliveryBoy: riderId, orderStatus: 'delivered' };
        let trxConfig = {
            deliveryBoy: riderId,
            type: {
                $in: [
                    'adminAddBalanceRider',
                    'adminRemoveBalanceRider',
                    'riderGetWeeklyReward',
                ],
            },
        };

        if (timestamp && timestamp === 'today') {
            startDate = moment().format('YYYY-MM-DD');
            endDate = moment().format('YYYY-MM-DD');
        }

        if (timestamp && timestamp === 'weekly') {
            const payoutSetting = await PayoutSettingModel.findOne({});
            const firstDayOfWeek = payoutSetting?.firstDayOfWeek || 0;

            moment.updateLocale('en', {
                week: {
                    dow: firstDayOfWeek,
                },
            });
            const currentDate = moment();
            startDate = currentDate
                .clone()
                .startOf('week')
                .format('YYYY-MM-DD');
            endDate = currentDate.clone().endOf('week').format('YYYY-MM-DD');
        }

        if (timestamp && timestamp === 'monthly') {
            const currentDate = moment();
            startDate = currentDate
                .clone()
                .startOf('month')
                .format('YYYY-MM-DD');
            endDate = currentDate.clone().endOf('month').format('YYYY-MM-DD');
        }

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            config = {
                ...config,
                deliveredAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };

            trxConfig = {
                ...trxConfig,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        const normalOrderList = await OrderModel.find(config).populate('shop');

        const butlerOrderList = await ButlerModel.find(config);

        const trxList = await TransactionModel.find(trxConfig);

        let tableList = [];
        if (sortBy.toUpperCase() === 'DESC') {
            tableList = [
                ...normalOrderList,
                ...butlerOrderList,
                ...trxList,
            ].sort(
                (a, b) =>
                    new Date(b.order_placedAt) - new Date(a.order_placedAt)
            );
        } else {
            tableList = [
                ...normalOrderList,
                ...butlerOrderList,
                ...trxList,
            ].sort(
                (a, b) =>
                    new Date(a.order_placedAt) - new Date(b.order_placedAt)
            );
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: tableList.length,
            pagingRange,
        });

        tableList = tableList.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        // for (const order of tableList) {
        //     if (currency === 'baseCurrency') {
        //         let profitBreakdown;
        //         if (order?.orderStatus) {
        //             profitBreakdown = {
        //                 profit:
        //                     order.baseCurrency_riderFee -
        //                     order.summary.baseCurrency_riderTip,
        //                 tips: order.summary.baseCurrency_riderTip,
        //                 totalProfit: order.baseCurrency_riderFee,
        //             };
        //         }

        //         order._doc.profitBreakdown = profitBreakdown;
        //     } else {
        //         let profitBreakdown;
        //         if (order?.orderStatus) {
        //             profitBreakdown = {
        //                 profit:
        //                     order.secondaryCurrency_riderFee -
        //                     order.summary.secondaryCurrency_riderTip,
        //                 tips: order.summary.secondaryCurrency_riderTip,
        //                 totalProfit: order.secondaryCurrency_riderFee,
        //             };
        //         }

        //         order._doc.profitBreakdown = profitBreakdown;
        //     }
        // }

        // Calculate breakdown
        let profitBreakdown;
        if (currency === 'baseCurrency') {
            const {
                riderPayout: riderPayoutForOrder,
                riderPayoutForButler: riderPayoutForButler,
                userPayRiderTip: userPayRiderTip,
            } = await this.getDeliveryFinancial({
                startDate,
                endDate,
                riderId,
            });

            const riderPayout = riderPayoutForOrder + riderPayoutForButler;

            const { totalAddRemoveCredit: riderAddRemoveCredit } =
                await this.getRiderAddRemoveCredit({
                    id: riderId,
                    startDate,
                    endDate,
                });

            const { riderWeeklyReward } = await this.getRiderWeeklyReward({
                id: riderId,
                startDate,
                endDate,
            });

            profitBreakdown = {
                profit: riderPayout - userPayRiderTip,
                tips: userPayRiderTip,
                riderAddRemoveCredit,
                riderWeeklyReward,
                riderPayout:
                    riderPayout + riderAddRemoveCredit + riderWeeklyReward,
            };
        } else {
            const {
                secondaryCurrency_riderPayout: riderPayoutForOrder,
                secondaryCurrency_riderPayoutForButler: riderPayoutForButler,
                secondaryCurrency_userPayRiderTip: userPayRiderTip,
            } = await this.getDeliveryFinancial({
                startDate,
                endDate,
                riderId,
            });

            const riderPayout = riderPayoutForOrder + riderPayoutForButler;

            const {
                secondaryCurrency_totalAddRemoveCredit: riderAddRemoveCredit,
            } = await this.getRiderAddRemoveCredit({
                id: riderId,
                startDate,
                endDate,
            });

            const { secondaryCurrency_riderWeeklyReward: riderWeeklyReward } =
                await this.getRiderWeeklyReward({
                    id: riderId,
                    startDate,
                    endDate,
                });

            profitBreakdown = {
                profit: riderPayout - userPayRiderTip,
                tips: userPayRiderTip,
                riderAddRemoveCredit,
                riderWeeklyReward,
                riderPayout:
                    riderPayout + riderAddRemoveCredit + riderWeeklyReward,
            };
        }

        successResponse(res, {
            message: 'Successfully get',
            data: {
                currency:
                    currency === 'baseCurrency'
                        ? { ...appSetting.baseCurrency, type: currency }
                        : { ...appSetting.secondaryCurrency, type: currency },
                profitBreakdown,
                orders: tableList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getRiderAppCurrentMonthProfit = async (req, res) => {
    try {
        const riderId = req.deliveryBoyId;

        const appSetting = await AppSetting.findOne({});
        const currency =
            appSetting?.adminExchangeRate === 0
                ? 'baseCurrency'
                : 'secondaryCurrency';

        const currentDate = moment();
        const currentMonthName = currentDate.format('MMMM');
        const startDate = currentDate
            .clone()
            .startOf('month')
            .format('YYYY-MM-DD');
        const endDate = currentDate.clone().endOf('month').format('YYYY-MM-DD');

        // Calculate breakdown
        let profitBreakdown;
        if (currency === 'baseCurrency') {
            const {
                riderPayout: riderPayoutForOrder,
                riderPayoutForButler: riderPayoutForButler,
                userPayRiderTip: userPayRiderTip,
            } = await this.getDeliveryFinancial({
                startDate,
                endDate,
                riderId,
            });

            const riderPayout = riderPayoutForOrder + riderPayoutForButler;

            const { totalAddRemoveCredit: riderAddRemoveCredit } =
                await this.getRiderAddRemoveCredit({
                    id: riderId,
                    startDate,
                    endDate,
                });

            const { riderWeeklyReward } = await this.getRiderWeeklyReward({
                id: riderId,
                startDate,
                endDate,
            });

            profitBreakdown = {
                profit: riderPayout - userPayRiderTip,
                tips: userPayRiderTip,
                riderAddRemoveCredit,
                riderWeeklyReward,
                riderPayout:
                    riderPayout + riderAddRemoveCredit + riderWeeklyReward,
            };
        } else {
            const {
                secondaryCurrency_riderPayout: riderPayoutForOrder,
                secondaryCurrency_riderPayoutForButler: riderPayoutForButler,
                secondaryCurrency_userPayRiderTip: userPayRiderTip,
            } = await this.getDeliveryFinancial({
                startDate,
                endDate,
                riderId,
            });

            const riderPayout = riderPayoutForOrder + riderPayoutForButler;

            const {
                secondaryCurrency_totalAddRemoveCredit: riderAddRemoveCredit,
            } = await this.getRiderAddRemoveCredit({
                id: riderId,
                startDate,
                endDate,
            });

            const { secondaryCurrency_riderWeeklyReward: riderWeeklyReward } =
                await this.getRiderWeeklyReward({
                    id: riderId,
                    startDate,
                    endDate,
                });

            profitBreakdown = {
                profit: riderPayout - userPayRiderTip,
                tips: userPayRiderTip,
                riderAddRemoveCredit,
                riderWeeklyReward,
                riderPayout:
                    riderPayout + riderAddRemoveCredit + riderWeeklyReward,
            };
        }

        successResponse(res, {
            message: 'Successfully get',
            data: {
                currentMonthName,
                currency:
                    currency === 'baseCurrency'
                        ? { ...appSetting.baseCurrency, type: currency }
                        : { ...appSetting.secondaryCurrency, type: currency },
                profitBreakdown,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getRiderAppWeeklyProfitGraph = async (req, res) => {
    try {
        const riderId = req.deliveryBoyId;

        const appSetting = await AppSetting.findOne({});
        const currency =
            appSetting?.adminExchangeRate === 0
                ? 'baseCurrency'
                : 'secondaryCurrency';

        const payoutSetting = await PayoutSettingModel.findOne({});
        const firstDayOfWeek = payoutSetting?.firstDayOfWeek || 0;

        moment.updateLocale('en', {
            week: {
                dow: firstDayOfWeek,
            },
        });

        const currentDate = moment();
        const startDate = currentDate
            .clone()
            .startOf('week')
            .format('YYYY-MM-DD');
        const endDate = currentDate.clone().endOf('week').format('YYYY-MM-DD');

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        let weeklyProfit = [];
        for (const date of dates) {
            let riderPayout;

            if (currency === 'baseCurrency') {
                const {
                    riderPayout: riderPayoutForOrder,
                    riderPayoutForButler: riderPayoutForButler,
                } = await this.getDeliveryFinancial({
                    startDate: date,
                    endDate: date,
                    riderId,
                });

                const { totalAddRemoveCredit: riderAddRemoveCredit } =
                    await this.getRiderAddRemoveCredit({
                        id: riderId,
                        startDate: date,
                        endDate: date,
                    });

                const { riderWeeklyReward } = await this.getRiderWeeklyReward({
                    id: riderId,
                    startDate: date,
                    endDate: date,
                });

                riderPayout =
                    riderPayoutForOrder +
                    riderPayoutForButler +
                    riderAddRemoveCredit +
                    riderWeeklyReward;
            } else {
                const {
                    secondaryCurrency_riderPayout: riderPayoutForOrder,
                    secondaryCurrency_riderPayoutForButler:
                        riderPayoutForButler,
                } = await this.getDeliveryFinancial({
                    startDate: date,
                    endDate: date,
                    riderId,
                });

                const {
                    secondaryCurrency_totalAddRemoveCredit:
                        riderAddRemoveCredit,
                } = await this.getRiderAddRemoveCredit({
                    id: riderId,
                    startDate: date,
                    endDate: date,
                });

                const {
                    secondaryCurrency_riderWeeklyReward: riderWeeklyReward,
                } = await this.getRiderWeeklyReward({
                    id: riderId,
                    startDate: date,
                    endDate: date,
                });

                riderPayout =
                    riderPayoutForOrder +
                    riderPayoutForButler +
                    riderAddRemoveCredit +
                    riderWeeklyReward;
            }

            const day = moment(date).format('dddd');
            weeklyProfit.push({ riderPayout, date, day });
        }

        successResponse(res, {
            message: 'Successfully get',
            data: {
                currency:
                    currency === 'baseCurrency'
                        ? { ...appSetting.baseCurrency, type: currency }
                        : { ...appSetting.secondaryCurrency, type: currency },
                weeklyProfit,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getRiderAppCashOnHand = async (req, res) => {
    try {
        const riderId = req.deliveryBoyId;

        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            searchKey,
            sortBy = 'desc',
            startDate,
            endDate,
            paidCurrency,
            type, //all || order || settlement
        } = req.query;

        let whereConfig = {
            deliveryBoy: ObjectId(riderId),
        };

        if (type === 'order') {
            whereConfig = {
                ...whereConfig,
                // deliveryBoyHand: true,
                // isCashCollected: false,
                type: {
                    $in: ['deliveryBoyOrderDeliveredCash'],
                },
            };
        } else if (type === 'settlement') {
            whereConfig = {
                ...whereConfig,
                type: {
                    $in: ['deliveryBoyAdminAmountReceivedCash'],
                },
            };
        } else {
            whereConfig = {
                ...whereConfig,
                type: {
                    $in: [
                        'deliveryBoyOrderDeliveredCash',
                        'deliveryBoyAdminAmountReceivedCash',
                    ],
                },
            };
        }

        if (startDate) {
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

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const trxIdSearchQuery = newQuery.map(str => ({
                trxId: RegExp(str, 'i'),
            }));

            const adminNoteSearchQuery = newQuery.map(str => ({
                adminNote: RegExp(str, 'i'),
            }));

            const userNoteQuery = newQuery.map(str => ({
                userNote: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: trxIdSearchQuery },
                            { $and: adminNoteSearchQuery },
                            { $and: userNoteQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        if (paidCurrency) {
            whereConfig = {
                ...whereConfig,
                paidCurrency: { $in: [paidCurrency, 'mixedCurrency'] },
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: TransactionModel,
            condition: whereConfig,
            pagingRange,
        });

        const cashOrderList = await TransactionModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'shop',
                },
                {
                    path: 'order',
                    populate: {
                        path: 'user',
                        select: 'name profile_photo',
                    },
                },
                {
                    path: 'butler',
                    populate: {
                        path: 'user',
                        select: 'name profile_photo',
                    },
                },
                {
                    path: 'bobFinance',
                },
            ]);

        const {
            riderCashInHand: baseCurrency_CashInHand,
            secondaryCurrency_riderCashInHand: secondaryCurrency_CashInHand,
            riderCashInHand_sc: baseCurrency_CashInHand_sc,
            secondaryCurrency_riderCashInHand_bc:
                secondaryCurrency_CashInHand_bc,
        } = await this.getRiderActualCashInHand({
            startDate,
            endDate,
            riderId,
        });

        const appSetting = await AppSetting.findOne({});

        successResponse(res, {
            message: 'Successfully get',
            data: {
                baseCurrency: appSetting?.baseCurrency,
                secondaryCurrency: appSetting?.secondaryCurrency,
                baseCurrency_CashInHand,
                baseCurrency_CashInHand_sc,
                secondaryCurrency_CashInHand,
                secondaryCurrency_CashInHand_bc,
                cashOrderList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getRiderAppCashInHandAmount = async (req, res) => {
    try {
        let { riderId } = req.query;

        if (!riderId) riderId = req.deliveryBoyId;

        if (!riderId) return errorResponse(res, 'riderId is required');

        const {
            riderCashInHand: baseCurrency_CashInHand,
            secondaryCurrency_riderCashInHand: secondaryCurrency_CashInHand,
            riderCashInHand_sc: baseCurrency_CashInHand_sc,
            secondaryCurrency_riderCashInHand_bc:
                secondaryCurrency_CashInHand_bc,
        } = await this.getRiderActualCashInHand({
            riderId,
        });

        const appSetting = await AppSetting.findOne({}).select(
            'baseCurrency secondaryCurrency riderBOBCashSettlementLimit'
        );

        successResponse(res, {
            message: 'Successfully get',
            data: {
                baseCurrency: appSetting?.baseCurrency,
                secondaryCurrency: appSetting?.secondaryCurrency,
                riderBOBCashSettlementLimit:
                    appSetting?.riderBOBCashSettlementLimit,
                baseCurrency_CashInHand,
                baseCurrency_CashInHand_sc,
                secondaryCurrency_CashInHand,
                secondaryCurrency_CashInHand_bc,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAdminEarning = async ({
    type,
    id,
    startDate,
    endDate,
    paidCurrency,
    orderType,
    orderIds,
}) => {
    let commonConfig = { orderStatus: 'delivered' };

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }

    if (orderIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: orderIds },
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const adminEarningQuery = await OrderModel.aggregate([
        {
            $match: commonConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                adminFees: {
                    $sum: {
                        $sum: [
                            '$adminCharge.baseCurrency_adminChargeFromOrder',
                        ],
                    },
                },
                secondaryCurrency_adminFees: {
                    $sum: {
                        $sum: [
                            '$adminCharge.secondaryCurrency_adminChargeFromOrder',
                        ],
                    },
                },
            },
        },
    ]);

    const adminFees =
        adminEarningQuery.length > 0 ? adminEarningQuery[0].adminFees : 0;
    const secondaryCurrency_adminFees =
        adminEarningQuery.length > 0
            ? adminEarningQuery[0].secondaryCurrency_adminFees
            : 0;

    return { adminFees, secondaryCurrency_adminFees };
};

exports.getAdminPay = async ({ startDate, endDate, paidCurrency }) => {
    // let commonConfig = { account: 'user', status: 'success' };
    let commonConfig = { status: 'success' };

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    let config = {
        ...commonConfig,
        type: {
            $in: ['topUpAdminWallet'],
        },
    };

    const adminPayAddQuery = await TransactionModel.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const adminPayAdd =
        adminPayAddQuery.length > 0 ? adminPayAddQuery[0].amount : 0;
    const secondaryCurrency_adminPayAdd =
        adminPayAddQuery.length > 0
            ? adminPayAddQuery[0].secondaryCurrency_amount
            : 0;

    // let config1 = {
    //     ...commonConfig,
    //     type: {
    //         $in: ['userBalanceWithdrawAdmin'],
    //     },
    // };

    // const adminPayRemoveQuery = await TransactionModel.aggregate([
    //     {
    //         $match: config1,
    //     },
    //     {
    //         $group: {
    //             _id: '',
    //             count: { $sum: 1 },
    //             amount: { $sum: { $sum: ['$amount'] } },
    //             secondaryCurrency_amount: {
    //                 $sum: { $sum: ['$secondaryCurrency_amount'] },
    //             },
    //         },
    //     },
    // ]);

    // const adminPayRemove =
    //     adminPayRemoveQuery.length > 0 ? adminPayRemoveQuery[0].amount : 0;
    // const secondaryCurrency_adminPayRemove =
    //     adminPayRemoveQuery.length > 0
    //         ? adminPayRemoveQuery[0].secondaryCurrency_amount
    //         : 0;

    const totalAdminPay = adminPayAdd;
    // - adminPayRemove;
    const secondaryCurrency_totalAdminPay = secondaryCurrency_adminPayAdd;
    // - secondaryCurrency_adminPayRemove;

    return { totalAdminPay, secondaryCurrency_totalAdminPay };
};

exports.getOrderStatistics = async ({
    type,
    id,
    startDate,
    endDate,
    paymentMethod,
    paidCurrency,
    orderType,
    orderIds,
    transactionIds,
}) => {
    let commonConfig = {};
    let cancelOrderConfig = {};

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (paymentMethod === 'cash') {
        commonConfig = {
            ...commonConfig,
            paymentMethod: 'cash',
        };
    }

    if (paymentMethod === 'online') {
        commonConfig = {
            ...commonConfig,
            paymentMethod: {
                $nin: ['cash'],
            },
        };
    }

    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }
    if (orderIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: orderIds },
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
        cancelOrderConfig = {
            ...commonConfig,
            cancelledAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const totalDeliveredOrder = await OrderModel.count({
        ...commonConfig,
        orderStatus: 'delivered',
    });
    const totalExpectedOrder = totalDeliveredOrder;
    const totalCanceledOrder = await OrderModel.count({
        ...cancelOrderConfig,
        orderStatus: 'cancelled',
    });
    const totalShopCanceledOrder = await OrderModel.count({
        ...cancelOrderConfig,
        orderStatus: 'cancelled',
        'orderCancel.canceledBy': 'shop',
        'orderCancel.shopCancelType': 'canceled',
    });
    const totalShopRejectedOrder = await OrderModel.count({
        ...cancelOrderConfig,
        orderStatus: 'cancelled',
        'orderCancel.canceledBy': 'shop',
        'orderCancel.shopCancelType': 'rejected',
    });
    const totalShopNotAcceptedOrder = await OrderModel.count({
        ...cancelOrderConfig,
        orderStatus: 'cancelled',
        'orderCancel.canceledBy': 'automatically',
        'orderCancel.shopCancelType': 'notAccepted',
    });

    const totalValueQuery = await OrderModel.aggregate([
        {
            $match: { ...commonConfig, orderStatus: 'delivered' },
        },

        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                productAmount: {
                    $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
                },
                secondaryCurrency_productAmount: {
                    $sum: {
                        $sum: ['$summary.secondaryCurrency_productAmount'],
                    },
                },
                totalDiscount: {
                    $sum: { $sum: ['$summary.baseCurrency_discount'] },
                },
                secondaryCurrency_totalDiscount: {
                    $sum: { $sum: ['$summary.secondaryCurrency_discount'] },
                },
                totalShopDiscount: {
                    $sum: { $sum: ['$discountCut.discountShopCut'] },
                },
                secondaryCurrency_totalShopDiscount: {
                    $sum: {
                        $sum: [
                            '$discountCut.secondaryCurrency_discountShopCut',
                        ],
                    },
                },
                totalAdminDiscount: {
                    $sum: { $sum: ['$discountCut.discountAdminCut'] },
                },
                secondaryCurrency_totalAdminDiscount: {
                    $sum: {
                        $sum: [
                            '$discountCut.secondaryCurrency_discountAdminCut',
                        ],
                    },
                },
                totalAdminDiscountForSubscription: {
                    $sum: { $sum: ['$subscriptionLoss.baseCurrency_discount'] },
                },
                secondaryCurrency_totalAdminDiscountForSubscription: {
                    $sum: {
                        $sum: ['$subscriptionLoss.secondaryCurrency_discount'],
                    },
                },
                totalRewardAmount: {
                    $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
                },
                secondaryCurrency_totalRewardAmount: {
                    $sum: {
                        $sum: ['$summary.reward.secondaryCurrency_amount'],
                    },
                },
                totalShopRewardAmount: {
                    $sum: { $sum: ['$rewardRedeemCut.rewardShopCut'] },
                },
                secondaryCurrency_totalShopRewardAmount: {
                    $sum: {
                        $sum: [
                            '$rewardRedeemCut.secondaryCurrency_rewardShopCut',
                        ],
                    },
                },
                totalAdminRewardAmount: {
                    $sum: { $sum: ['$rewardRedeemCut.rewardAdminCut'] },
                },
                secondaryCurrency_totalAdminRewardAmount: {
                    $sum: {
                        $sum: [
                            '$rewardRedeemCut.secondaryCurrency_rewardAdminCut',
                        ],
                    },
                },
                // Points cashback, shop get back loyalty amount adminCut
                pointsCashback: {
                    $sum: { $sum: ['$baseCurrency_rewardRedeemCashback'] },
                },
                secondaryCurrency_pointsCashback: {
                    $sum: { $sum: ['$secondaryCurrency_rewardRedeemCashback'] },
                },
                totalDoubleMenuItemPrice: {
                    $sum: {
                        $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
                    },
                },
                secondaryCurrency_totalDoubleMenuItemPrice: {
                    $sum: {
                        $sum: [
                            '$summary.secondaryCurrency_doubleMenuItemPrice',
                        ],
                    },
                },
                totalShopDoubleMenuItemPrice: {
                    $sum: {
                        $sum: ['$doubleMenuItemPrice.doubleMenuItemPriceShop'],
                    },
                },
                secondaryCurrency_totalShopDoubleMenuItemPrice: {
                    $sum: {
                        $sum: [
                            '$doubleMenuItemPrice.secondaryCurrency_doubleMenuItemPriceShop',
                        ],
                    },
                },
                totalAdminDoubleMenuItemPrice: {
                    $sum: {
                        $sum: ['$doubleMenuItemPrice.doubleMenuItemPriceAdmin'],
                    },
                },
                secondaryCurrency_totalAdminDoubleMenuItemPrice: {
                    $sum: {
                        $sum: [
                            '$doubleMenuItemPrice.secondaryCurrency_doubleMenuItemPriceAdmin',
                        ],
                    },
                },
                totalShopDoubleMenuCut: {
                    $sum: { $sum: ['$doubleMenuCut.doubleMenuShopCut'] },
                },
                secondaryCurrency_totalShopDoubleMenuCut: {
                    $sum: {
                        $sum: [
                            '$doubleMenuCut.secondaryCurrency_doubleMenuShopCut',
                        ],
                    },
                },
                totalAdminDoubleMenuCut: {
                    $sum: { $sum: ['$doubleMenuCut.doubleMenuAdminCut'] },
                },
                secondaryCurrency_totalAdminDoubleMenuCut: {
                    $sum: {
                        $sum: [
                            '$doubleMenuCut.secondaryCurrency_doubleMenuAdminCut',
                        ],
                    },
                },
                totalAdminDoubleMenuCutForSubscription: {
                    $sum: {
                        $sum: ['$subscriptionLoss.baseCurrency_doubleMenuLoss'],
                    },
                },
                secondaryCurrency_totalAdminDoubleMenuCutForSubscription: {
                    $sum: {
                        $sum: [
                            '$subscriptionLoss.secondaryCurrency_doubleMenuLoss',
                        ],
                    },
                },
                totalCouponAdminCut: {
                    $sum: {
                        $sum: [
                            '$couponDiscountCut.baseCurrency_couponAdminCut',
                        ],
                    },
                },
                secondaryCurrency_totalCouponAdminCut: {
                    $sum: {
                        $sum: [
                            '$couponDiscountCut.secondaryCurrency_couponAdminCut',
                        ],
                    },
                },
                totalCouponShopCut: {
                    $sum: {
                        $sum: ['$couponDiscountCut.baseCurrency_couponShopCut'],
                    },
                },
                secondaryCurrency_totalCouponShopCut: {
                    $sum: {
                        $sum: [
                            '$couponDiscountCut.secondaryCurrency_couponShopCut',
                        ],
                    },
                },
                totalAmount: {
                    $sum: { $sum: ['$summary.baseCurrency_totalAmount'] },
                },
                secondaryCurrency_totalAmount: {
                    $sum: { $sum: ['$summary.secondaryCurrency_totalAmount'] },
                },
                totalVat: {
                    $sum: { $sum: ['$vatAmount.baseCurrency_vatForAdmin'] },
                },
                secondaryCurrency_totalVat: {
                    $sum: {
                        $sum: ['$vatAmount.secondaryCurrency_vatForAdmin'],
                    },
                },
                freeDeliveryShopCut: {
                    $sum: {
                        $sum: [
                            '$freeDeliveryCut.baseCurrency_freeDeliveryShopCut',
                        ],
                    },
                },
                secondaryCurrency_freeDeliveryShopCut: {
                    $sum: {
                        $sum: [
                            '$freeDeliveryCut.secondaryCurrency_freeDeliveryShopCut',
                        ],
                    },
                },
                freeDeliveryShopLoss: {
                    $sum: {
                        $sum: [
                            '$freeDeliveryCut.baseCurrency_shopLossForFreeDelivery',
                        ],
                    },
                },
                secondaryCurrency_freeDeliveryShopLoss: {
                    $sum: {
                        $sum: [
                            '$freeDeliveryCut.secondaryCurrency_shopLossForFreeDelivery',
                        ],
                    },
                },
                freeDeliveryAdminCut: {
                    $sum: {
                        $sum: [
                            '$freeDeliveryCut.baseCurrency_dropLossForFreeDelivery',
                        ],
                    },
                },
                secondaryCurrency_freeDeliveryAdminCut: {
                    $sum: {
                        $sum: [
                            '$freeDeliveryCut.secondaryCurrency_dropLossForFreeDelivery',
                        ],
                    },
                },
                freeDeliveryAdminCutForSubscription: {
                    $sum: {
                        $sum: ['$subscriptionLoss.baseCurrency_freeDelivery'],
                    },
                },
                secondaryCurrency_freeDeliveryAdminCutForSubscription: {
                    $sum: {
                        $sum: [
                            '$subscriptionLoss.secondaryCurrency_freeDelivery',
                        ],
                    },
                },
                shopEarnings: {
                    $sum: { $sum: ['$baseCurrency_shopEarnings'] },
                },
                secondaryCurrency_shopEarnings: {
                    $sum: { $sum: ['$secondaryCurrency_shopEarnings'] },
                },

                wallet: {
                    $sum: {
                        $let: {
                            vars: {
                                calculatedAmount: {
                                    $subtract: [
                                        '$summary.baseCurrency_productAmount',
                                        {
                                            $add: [
                                                '$summary.baseCurrency_discount',
                                                '$summary.reward.baseCurrency_amount',
                                                '$summary.baseCurrency_couponDiscountAmount',
                                            ],
                                        },
                                    ],
                                },
                            },
                            in: {
                                $cond: {
                                    if: {
                                        $lt: [
                                            '$$calculatedAmount',
                                            '$summary.baseCurrency_wallet',
                                        ],
                                    },
                                    then: '$$calculatedAmount',
                                    else: '$summary.baseCurrency_wallet',
                                },
                            },
                        },
                    },
                },
                secondaryCurrency_wallet: {
                    $sum: {
                        $let: {
                            vars: {
                                calculatedAmount: {
                                    $subtract: [
                                        '$summary.secondaryCurrency_productAmount',
                                        {
                                            $add: [
                                                '$summary.secondaryCurrency_discount',
                                                '$summary.reward.secondaryCurrency_amount',
                                                '$summary.secondaryCurrency_couponDiscountAmount',
                                            ],
                                        },
                                    ],
                                },
                            },
                            in: {
                                $cond: {
                                    if: {
                                        $lt: [
                                            '$$calculatedAmount',
                                            '$summary.secondaryCurrency_wallet',
                                        ],
                                    },
                                    then: '$$calculatedAmount',
                                    else: '$summary.secondaryCurrency_wallet',
                                },
                            },
                        },
                    },
                },
            },
        },
    ]);
    if (totalValueQuery.length < 1) {
        totalValueQuery.push({
            productAmount: 0,
            secondaryCurrency_productAmount: 0,
            totalDiscount: 0,
            secondaryCurrency_totalDiscount: 0,
            totalShopDiscount: 0,
            secondaryCurrency_totalShopDiscount: 0,
            totalAdminDiscount: 0,
            secondaryCurrency_totalAdminDiscount: 0,
            totalAdminDiscountForSubscription: 0,
            secondaryCurrency_totalAdminDiscountForSubscription: 0,
            totalRewardAmount: 0,
            secondaryCurrency_totalRewardAmount: 0,
            totalShopRewardAmount: 0,
            secondaryCurrency_totalShopRewardAmount: 0,
            totalAdminRewardAmount: 0,
            secondaryCurrency_totalAdminRewardAmount: 0,
            pointsCashback: 0,
            secondaryCurrency_pointsCashback: 0,
            totalDoubleMenuItemPrice: 0,
            secondaryCurrency_totalDoubleMenuItemPrice: 0,
            totalShopDoubleMenuItemPrice: 0,
            secondaryCurrency_totalShopDoubleMenuItemPrice: 0,
            totalAdminDoubleMenuItemPrice: 0,
            secondaryCurrency_totalAdminDoubleMenuItemPrice: 0,
            totalShopDoubleMenuCut: 0,
            secondaryCurrency_totalShopDoubleMenuCut: 0,
            totalAdminDoubleMenuCut: 0,
            secondaryCurrency_totalAdminDoubleMenuCut: 0,
            totalAdminDoubleMenuCutForSubscription: 0,
            secondaryCurrency_totalAdminDoubleMenuCutForSubscription: 0,
            totalCouponAdminCut: 0,
            secondaryCurrency_totalCouponAdminCut: 0,
            totalCouponShopCut: 0,
            secondaryCurrency_totalCouponShopCut: 0,
            totalAmount: 0,
            secondaryCurrency_totalAmount: 0,
            totalVat: 0,
            secondaryCurrency_totalVat: 0,
            freeDeliveryShopCut: 0,
            secondaryCurrency_freeDeliveryShopCut: 0,
            freeDeliveryShopLoss: 0,
            secondaryCurrency_freeDeliveryShopLoss: 0,
            freeDeliveryAdminCut: 0,
            secondaryCurrency_freeDeliveryAdminCut: 0,
            freeDeliveryAdminCutForSubscription: 0,
            secondaryCurrency_freeDeliveryAdminCutForSubscription: 0,
            shopEarnings: 0,
            secondaryCurrency_shopEarnings: 0,

            wallet: 0,
            secondaryCurrency_wallet: 0,
        });
    }

    // Wallet amount can't be more than actual product amount
    if (
        totalValueQuery[0].productAmount -
            totalValueQuery[0].totalDiscount -
            totalValueQuery[0].totalRewardAmount -
            totalValueQuery[0].totalCouponAdminCut <
        totalValueQuery[0].wallet
    ) {
        totalValueQuery[0].wallet =
            totalValueQuery[0].productAmount -
            totalValueQuery[0].totalDiscount -
            totalValueQuery[0].totalRewardAmount -
            totalValueQuery[0].totalCouponAdminCut;
        totalValueQuery[0].secondaryCurrency_wallet =
            totalValueQuery[0].secondaryCurrency_productAmount -
            totalValueQuery[0].secondaryCurrency_totalDiscount -
            totalValueQuery[0].secondaryCurrency_totalRewardAmount -
            totalValueQuery[0].secondaryCurrency_totalCouponAdminCut;
    }

    // Adjust refund vat
    const { baseCurrency_refundVatAmount, secondaryCurrency_refundVatAmount } =
        await this.getRefundVatAmount({
            type,
            id,
            startDate,
            endDate,
            orderType,
            paidCurrency,
            transactionIds,
        });

    totalValueQuery[0].totalVat =
        totalValueQuery[0].totalVat - baseCurrency_refundVatAmount;
    totalValueQuery[0].secondaryCurrency_totalVat =
        totalValueQuery[0].secondaryCurrency_totalVat -
        secondaryCurrency_refundVatAmount;

    return {
        totalDeliveredOrder,
        totalExpectedOrder,
        totalCanceledOrder,
        totalShopCanceledOrder,
        totalShopRejectedOrder,
        totalShopNotAcceptedOrder,
        totalValue: totalValueQuery[0],
    };
};

exports.getFeaturedAmount = async ({
    type,
    id,
    startDate,
    endDate,
    orderType,
    paidCurrency,
    transactionIds,
}) => {
    let commonConfig = { account: 'shop', type: 'shopPayForFeatured' };

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }

    if (transactionIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: transactionIds },
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const totalFeaturedAmountQuery = await TransactionModel.aggregate([
        {
            $match: commonConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const featuredAmount = totalFeaturedAmountQuery.length
        ? totalFeaturedAmountQuery[0].amount
        : 0;

    const secondaryCurrency_featuredAmount = totalFeaturedAmountQuery.length
        ? totalFeaturedAmountQuery[0].secondaryCurrency_amount
        : 0;

    return { featuredAmount, secondaryCurrency_featuredAmount };
};

exports.getShopDeliveryFee = async ({
    type,
    id,
    startDate,
    endDate,
    paymentMethod,
    orderType,
    paidCurrency,
    orderIds,
}) => {
    let commonConfig = {
        orderFor: 'specific',
    };

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (paymentMethod === 'cash') {
        commonConfig = {
            ...commonConfig,
            paymentMethod: 'cash',
        };
    }

    if (paymentMethod === 'online') {
        commonConfig = {
            ...commonConfig,
            paymentMethod: {
                $nin: ['cash'],
            },
        };
    }

    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }

    if (orderIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: orderIds },
        };
    }

    let cancelOrderDateConfig = {};
    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
        cancelOrderDateConfig = {
            cancelledAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const totalValueConfig = {
        ...commonConfig,
        orderStatus: 'delivered',
    };

    const totalValueQ = await OrderModel.aggregate([
        {
            $match: totalValueConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                deliveryFee: {
                    $sum: { $sum: ['$summary.baseCurrency_riderFee'] },
                },
                secondaryCurrency_deliveryFee: {
                    $sum: { $sum: ['$summary.secondaryCurrency_riderFee'] },
                },
                riderTip: {
                    $sum: { $sum: ['$summary.baseCurrency_riderTip'] },
                },
                secondaryCurrency_riderTip: {
                    $sum: { $sum: ['$summary.secondaryCurrency_riderTip'] },
                },
                freeDelivery: {
                    $sum: {
                        $sum: ['$subscriptionLoss.baseCurrency_freeDelivery'],
                    },
                },
                secondaryCurrency_freeDelivery: {
                    $sum: {
                        $sum: [
                            '$subscriptionLoss.secondaryCurrency_freeDelivery',
                        ],
                    },
                },
            },
        },
    ]);

    let deliveryFee = totalValueQ.length > 0 ? totalValueQ[0].deliveryFee : 0;
    let secondaryCurrency_deliveryFee =
        totalValueQ.length > 0
            ? totalValueQ[0].secondaryCurrency_deliveryFee
            : 0;
    const riderTip = totalValueQ.length > 0 ? totalValueQ[0].riderTip : 0;
    const secondaryCurrency_riderTip =
        totalValueQ.length > 0 ? totalValueQ[0].secondaryCurrency_riderTip : 0;
    deliveryFee += totalValueQ.length > 0 ? totalValueQ[0].freeDelivery : 0;
    secondaryCurrency_deliveryFee +=
        totalValueQ.length > 0
            ? totalValueQ[0].secondaryCurrency_freeDelivery
            : 0;

    let totalCancelOrderValueConfig = {
        ...commonConfig,
        ...cancelOrderDateConfig,
        orderStatus: 'cancelled',
        isEndorseLoss: true,
        inEndorseLossDeliveryFeeIncluded: true,
    };

    const totalCancelOrderValueQ = await OrderModel.aggregate([
        {
            $match: totalCancelOrderValueConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                deliveryFee: {
                    $sum: {
                        $sum: [
                            '$summary.baseCurrency_riderFeeWithFreeDelivery',
                        ],
                    },
                },
                secondaryCurrency_deliveryFee: {
                    $sum: {
                        $sum: [
                            '$summary.secondaryCurrency_riderFeeWithFreeDelivery',
                        ],
                    },
                },
            },
        },
    ]);

    deliveryFee +=
        totalCancelOrderValueQ.length > 0
            ? totalCancelOrderValueQ[0].deliveryFee
            : 0;
    secondaryCurrency_deliveryFee +=
        totalCancelOrderValueQ.length > 0
            ? totalCancelOrderValueQ[0].secondaryCurrency_deliveryFee
            : 0;

    return {
        deliveryFee,
        secondaryCurrency_deliveryFee,
        riderTip,
        secondaryCurrency_riderTip,
    };
};

exports.getTotalRefundAmount = async ({
    type,
    id,
    startDate,
    endDate,
    account,
    orderType,
    paidCurrency,
    orderIds,
    transactionIds,
}) => {
    let commonConfig = {};

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (account === 'shop') {
        commonConfig = {
            ...commonConfig,
            account: 'shop',
            type: {
                $in: ['refundedAfterDeliveredOrderShopCut'],
            },
        };
    }
    if (account === 'admin') {
        commonConfig = {
            ...commonConfig,
            account: 'admin',
            type: {
                $in: ['refundedAfterDeliveredOrderAdminCut'],
            },
        };
    }
    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }
    if (orderIds) {
        commonConfig = {
            ...commonConfig,
            order: { $in: orderIds },
        };
    }
    if (transactionIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: transactionIds },
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const totalRefundAmountQuery = await TransactionModel.aggregate([
        {
            $match: commonConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
                baseCurrency_adminDeliveryRefund: {
                    $sum: { $sum: ['$baseCurrency_adminDeliveryRefund'] },
                },
                secondaryCurrency_adminDeliveryRefund: {
                    $sum: { $sum: ['$secondaryCurrency_adminDeliveryRefund'] },
                },
                baseCurrency_refundVatAmount: { $sum: { $sum: ['$vat'] } },
                secondaryCurrency_refundVatAmount: {
                    $sum: { $sum: ['$secondaryCurrency_vat'] },
                },
            },
        },
    ]);

    const refundAmount =
        totalRefundAmountQuery.length > 0
            ? totalRefundAmountQuery[0].amount
            : 0;
    const secondaryCurrency_refundAmount =
        totalRefundAmountQuery.length > 0
            ? totalRefundAmountQuery[0].secondaryCurrency_amount
            : 0;
    const baseCurrency_adminDeliveryRefund =
        totalRefundAmountQuery.length > 0
            ? totalRefundAmountQuery[0].baseCurrency_adminDeliveryRefund
            : 0;
    const secondaryCurrency_adminDeliveryRefund =
        totalRefundAmountQuery.length > 0
            ? totalRefundAmountQuery[0].secondaryCurrency_adminDeliveryRefund
            : 0;

    let baseCurrency_refundVatAmount = 0;
    let secondaryCurrency_refundVatAmount = 0;

    if (account === 'shop' && totalRefundAmountQuery.length > 0)
        baseCurrency_refundVatAmount =
            totalRefundAmountQuery.length > 0 ?
            totalRefundAmountQuery[0].baseCurrency_refundVatAmount
            : 0;

    secondaryCurrency_refundVatAmount = 
        totalRefundAmountQuery.length > 0 ?
        totalRefundAmountQuery[0].secondaryCurrency_refundVatAmount
        : 0;

    return {
        refundAmount:
            refundAmount +
            baseCurrency_refundVatAmount -
            baseCurrency_adminDeliveryRefund,
        secondaryCurrency_refundAmount:
            secondaryCurrency_refundAmount +
            secondaryCurrency_refundVatAmount -
            secondaryCurrency_adminDeliveryRefund,
        baseCurrency_adminDeliveryRefund,
        secondaryCurrency_adminDeliveryRefund,
        secondaryCurrency_refundVatAmount,
    };
};

exports.getRefundVatAmount = async ({
    type,
    id,
    startDate,
    endDate,
    orderType,
    paidCurrency,
    transactionIds,
}) => {
    let commonConfig = {
        account: 'shop',
        type: 'refundedAfterDeliveredOrderShopCut',
    };

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }
    if (transactionIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: transactionIds },
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const refundVatAmountQuery = await TransactionModel.aggregate([
        {
            $match: commonConfig,
        },
        {
            $group: {
                _id: '',
                baseCurrency_refundVatAmount: { $sum: { $sum: ['$vat'] } },
                secondaryCurrency_refundVatAmount: {
                    $sum: { $sum: ['$secondaryCurrency_vat'] },
                },
            },
        },
    ]);

    const { baseCurrency_refundVatAmount, secondaryCurrency_refundVatAmount } =
        refundVatAmountQuery[0] || {
            baseCurrency_refundVatAmount: 0,
            secondaryCurrency_refundVatAmount: 0,
        };

    return {
        baseCurrency_refundVatAmount,
        secondaryCurrency_refundVatAmount,
    };
};

exports.getShopEarning = async ({
    type,
    id,
    startDate,
    endDate,
    paidCurrency,
    orderType,
}) => {
    let commonConfig = {};

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    let config = {
        ...commonConfig,
        account: 'shop',
        status: 'success',
        type: {
            $in: [
                'adminSettlebalanceShop',
                'sellerGetPaymentFromOrderCash',
                // 'adminAddBalanceShop',
            ],
        },
    };

    const sellerEarningAddQuery = await TransactionModel.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const sellerEarningAdd =
        sellerEarningAddQuery.length > 0 ? sellerEarningAddQuery[0].amount : 0;
    const secondaryCurrency_sellerEarningAdd =
        sellerEarningAddQuery.length > 0
            ? sellerEarningAddQuery[0].secondaryCurrency_amount
            : 0;

    // let config1 = {
    //     ...commonConfig,
    //     account: 'shop',
    //     type: {
    //         $in: ['adminRemoveBalanceShop'],
    //     },
    // };

    // const sellerEarningRemoveQuery = await TransactionModel.aggregate([
    //     {
    //         $match: config1,
    //     },
    //     {
    //         $group: {
    //             _id: '',
    //             count: { $sum: 1 },
    //             amount: { $sum: { $sum: ['$amount'] } },
    //             secondaryCurrency_amount: {
    //                 $sum: { $sum: ['$secondaryCurrency_amount'] },
    //             },
    //         },
    //     },
    // ]);

    // const sellerEarningRemove =
    //     sellerEarningRemoveQuery.length > 0
    //         ? sellerEarningRemoveQuery[0].amount
    //         : 0;
    // const secondaryCurrency_sellerEarningRemove =
    //     sellerEarningRemoveQuery.length > 0
    //         ? sellerEarningRemoveQuery[0].secondaryCurrency_amount
    //         : 0;

    const totalShopEarning = sellerEarningAdd;
    // - sellerEarningRemove;
    const secondaryCurrency_totalShopEarning =
        secondaryCurrency_sellerEarningAdd;
    // -secondaryCurrency_sellerEarningRemove;

    return { totalShopEarning, secondaryCurrency_totalShopEarning };
};

exports.getShopCashInHand = async ({
    type,
    id,
    startDate,
    endDate,
    paidCurrency,
    orderType,
}) => {
    let commonConfig = {};

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    let config = {
        ...commonConfig,
        account: 'shop',
        status: 'success',
        type: {
            $in: ['sellerGetPaymentFromOrderCash'],
        },
    };

    const shopCashInHandQuery = await TransactionModel.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const totalShopCashInHand = shopCashInHandQuery[0]
        ? shopCashInHandQuery[0].amount
        : 0;
    const secondaryCurrency_totalShopCashInHand = shopCashInHandQuery[0]
        ? shopCashInHandQuery[0].secondaryCurrency_amount
        : 0;

    return { totalShopCashInHand, secondaryCurrency_totalShopCashInHand };
};

exports.getShopAddRemoveCredit = async ({
    type,
    id,
    startDate,
    endDate,
    paidCurrency,
    orderType,
    transactionIds,
}) => {
    let commonConfig = { account: 'shop', status: 'success' };

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }
    if (transactionIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: transactionIds },
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    let config = {
        ...commonConfig,

        type: {
            $in: ['adminAddBalanceShop'],
        },
    };

    const creditAddQuery = await TransactionModel.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const creditAdd = creditAddQuery.length > 0 ? creditAddQuery[0].amount : 0;
    const secondaryCurrency_creditAdd =
        creditAddQuery.length > 0
            ? creditAddQuery[0].secondaryCurrency_amount
            : 0;

    let config1 = {
        ...commonConfig,
        type: {
            $in: ['adminRemoveBalanceShop'],
        },
    };

    const creditRemoveQuery = await TransactionModel.aggregate([
        {
            $match: config1,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const creditRemove =
        creditRemoveQuery.length > 0 ? creditRemoveQuery[0].amount : 0;
    const secondaryCurrency_creditRemove =
        creditRemoveQuery.length > 0
            ? creditRemoveQuery[0].secondaryCurrency_amount
            : 0;

    const totalAddRemoveCredit = creditAdd - creditRemove;
    const secondaryCurrency_totalAddRemoveCredit =
        secondaryCurrency_creditAdd - secondaryCurrency_creditRemove;

    return { totalAddRemoveCredit, secondaryCurrency_totalAddRemoveCredit };
};

exports.getShopUnSettleAmount = async ({
    type,
    id,
    startDate,
    endDate,
    paidCurrency,
    orderType,
}) => {
    let commonConfig = {};

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    let config = {
        ...commonConfig,
        account: 'shop',
        status: { $in: ['pending', 'success'] },
        type: {
            $in: [
                'sellerGetPaymentFromOrder',
                'sellerGetPaymentFromOrderRefused',
                'adminAddBalanceShop',
                'shopGetForCancelReplacementOrder', // For replacement order feature
                'sellerGetDeliveryFeeFromCancelOrder', // For endrose loss feature
            ],
        },
    };

    const sellerUnsettleAddQuery = await TransactionModel.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const sellerUnsettleAdd =
        sellerUnsettleAddQuery.length > 0
            ? sellerUnsettleAddQuery[0].amount
            : 0;
    const secondaryCurrency_sellerUnsettleAdd =
        sellerUnsettleAddQuery.length > 0
            ? sellerUnsettleAddQuery[0].secondaryCurrency_amount
            : 0;

    let config1 = {
        ...commonConfig,
        account: 'shop',
        type: {
            $in: [
                'adminSettlebalanceShop',
                'shopCashInHand',
                'shopPayForFeatured', //Featured system
                'refundedAfterDeliveredOrderShopCut', //Refund feature after delivered order
                'adminRemoveBalanceShop',
                'replacementOrderShopCut', // For replacement order feature
                'shopEndorseLoss', // For Endorse Loss feature
            ],
        },
    };

    const sellerUnsettleRemoveQuery = await TransactionModel.aggregate([
        {
            $match: config1,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const sellerUnsettleRemove =
        sellerUnsettleRemoveQuery.length > 0
            ? sellerUnsettleRemoveQuery[0].amount
            : 0;
    const secondaryCurrency_sellerUnsettleRemove =
        sellerUnsettleRemoveQuery.length > 0
            ? sellerUnsettleRemoveQuery[0].secondaryCurrency_amount
            : 0;

    // For Vat
    // let configForVat = {
    //     ...commonConfig,
    //     orderStatus: 'delivered',
    //     $or: [
    //         {
    //             orderFor: 'specific',
    //             paymentMethod: {
    //                 $nin: ['cash'],
    //             },
    //         },
    //         {
    //             orderFor: 'global',
    //         },
    //     ],
    // };

    // const sellerVatAddQuery = await OrderModel.aggregate([
    //     {
    //         $match: configForVat,
    //     },
    //     {
    //         $group: {
    //             _id: '',
    //             amount: {
    //                 $sum: { $sum: ['$vatAmount.baseCurrency_vatForShop'] },
    //             },
    //             secondaryCurrency_amount: {
    //                 $sum: { $sum: ['$vatAmount.secondaryCurrency_vatForShop'] },
    //             },
    //             count: { $sum: 1 },
    //         },
    //     },
    // ]);

    // const sellerVatAdd = sellerVatAddQuery[0] ? sellerVatAddQuery[0].amount : 0;
    // const secondaryCurrency_sellerVatAdd = sellerVatAddQuery[0]
    //     ? sellerVatAddQuery[0].secondaryCurrency_amount
    //     : 0;

    // let configForVat2 = {
    //     ...commonConfig,
    //     orderFor: 'specific',
    //     paymentMethod: 'cash',
    //     orderStatus: 'delivered',
    // };

    // const sellerVatRemoveQuery = await OrderModel.aggregate([
    //     {
    //         $match: configForVat2,
    //     },
    //     {
    //         $group: {
    //             _id: '',
    //             amount: {
    //                 $sum: { $sum: ['$vatAmount.baseCurrency_vatForAdmin'] },
    //             },
    //             secondaryCurrency_amount: {
    //                 $sum: {
    //                     $sum: ['$vatAmount.secondaryCurrency_vatForAdmin'],
    //                 },
    //             },
    //             count: { $sum: 1 },
    //         },
    //     },
    // ]);

    // const sellerVatRemove = sellerVatRemoveQuery[0]
    //     ? sellerVatRemoveQuery[0].amount
    //     : 0;
    // const secondaryCurrency_sellerVatRemove = sellerVatRemoveQuery[0]
    //     ? sellerVatRemoveQuery[0].secondaryCurrency_amount
    //     : 0;

    const totalSellerUnsettle = sellerUnsettleAdd - sellerUnsettleRemove;
    // + sellerVatAdd - sellerVatRemove

    const secondaryCurrency_totalSellerUnsettle =
        secondaryCurrency_sellerUnsettleAdd -
        secondaryCurrency_sellerUnsettleRemove;
    // + secondaryCurrency_sellerVatAdd - secondaryCurrency_sellerVatRemove;

    return { totalSellerUnsettle, secondaryCurrency_totalSellerUnsettle };
};

exports.getDeliveryFinancial = async ({
    riderId,
    shopId,
    startDate,
    endDate,
    orderType,
    paidCurrency,
    orderIds,
    isShopRiderSubscriptionLossAdjust = true,
}) => {
    let commonConfig = {};

    if (riderId) {
        commonConfig = {
            ...commonConfig,
            deliveryBoy: ObjectId(riderId),
        };
    }

    if (shopId) {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(shopId),
        };
    }

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }

    if (orderIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: orderIds },
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,

            $and: [
                {
                    $or: [
                        {
                            deliveredAt: {
                                $gte: startDateTime,
                                $lte: endDateTime,
                            },
                        },
                        {
                            cancelledAt: {
                                $gte: startDateTime,
                                $lte: endDateTime,
                            },
                        },
                    ],
                },
            ],
        };
    }

    let subscriptionLossConfig = {
        ...commonConfig,
        orderFor: 'specific',
        orderStatus: 'delivered',
    };

    commonConfig = {
        ...commonConfig,
        orderFor: 'global',
    };

    const totalDeliveryFinancialConfig = {
        ...commonConfig,
        $or: [
            {
                orderStatus: 'delivered',
            },
            {
                orderStatus: 'cancelled',
                isEndorseLoss: true,
                inEndorseLossDeliveryFeeIncluded: true,
            },
        ],
    };

    const totalDeliveredOrder = await OrderModel.count(
        totalDeliveryFinancialConfig
    );

    const totalDeliveredButlerOrder = await ButlerModel.count({
        ...commonConfig,
        orderStatus: 'delivered',
    });

    const totalDeliveryFinancialQ = await OrderModel.aggregate([
        {
            $match: totalDeliveryFinancialConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                deliveryFee: {
                    $sum: {
                        $sum: [
                            '$summary.baseCurrency_riderFeeWithFreeDelivery',
                        ],
                    },
                },
                secondaryCurrency_deliveryFee: {
                    $sum: {
                        $sum: [
                            '$summary.secondaryCurrency_riderFeeWithFreeDelivery',
                        ],
                    },
                },
                userPayDeliveryFee: {
                    $sum: {
                        $sum: ['$summary.baseCurrency_riderFee'],
                    },
                },
                secondaryCurrency_userPayDeliveryFee: {
                    $sum: {
                        $sum: ['$summary.secondaryCurrency_riderFee'],
                    },
                },
                userPayDeliveryFeeCash: {
                    $sum: {
                        $cond: [
                            { $eq: ['$paymentMethod', 'cash'] },
                            '$summary.baseCurrency_riderFee',
                            0,
                        ],
                    },
                },
                secondaryCurrency_userPayDeliveryFeeCash: {
                    $sum: {
                        $cond: [
                            { $eq: ['$paymentMethod', 'cash'] },
                            '$summary.secondaryCurrency_riderFee',
                            0,
                        ],
                    },
                },
                userPayDeliveryFeeOnline: {
                    $sum: {
                        $cond: [
                            { $ne: ['$paymentMethod', 'cash'] },
                            '$summary.baseCurrency_riderFee',
                            0,
                        ],
                    },
                },
                secondaryCurrency_userPayDeliveryFeeOnline: {
                    $sum: {
                        $cond: [
                            { $ne: ['$paymentMethod', 'cash'] },
                            '$summary.secondaryCurrency_riderFee',
                            0,
                        ],
                    },
                },
                freeDeliveryShopCut: {
                    $sum: {
                        $sum: [
                            '$freeDeliveryCut.baseCurrency_freeDeliveryShopCut',
                        ],
                    },
                },
                secondaryCurrency_freeDeliveryShopCut: {
                    $sum: {
                        $sum: [
                            '$freeDeliveryCut.secondaryCurrency_freeDeliveryShopCut',
                        ],
                    },
                },
                freeDeliveryAdminCut: {
                    $sum: {
                        $sum: [
                            '$freeDeliveryCut.baseCurrency_dropLossForFreeDelivery',
                        ],
                    },
                },
                secondaryCurrency_freeDeliveryAdminCut: {
                    $sum: {
                        $sum: [
                            '$freeDeliveryCut.secondaryCurrency_dropLossForFreeDelivery',
                        ],
                    },
                },
                freeDeliveryAdminCutForSubscription: {
                    $sum: {
                        $sum: ['$subscriptionLoss.baseCurrency_freeDelivery'],
                    },
                },
                secondaryCurrency_freeDeliveryAdminCutForSubscription: {
                    $sum: {
                        $sum: [
                            '$subscriptionLoss.secondaryCurrency_freeDelivery',
                        ],
                    },
                },
                riderPayout: {
                    $sum: {
                        $sum: ['$baseCurrency_riderFee'],
                    },
                },
                secondaryCurrency_riderPayout: {
                    $sum: {
                        $sum: ['$secondaryCurrency_riderFee'],
                    },
                },
                adminDeliveryProfit: {
                    $sum: {
                        $sum: [
                            '$adminCharge.baseCurrency_adminChargeFromDelivery',
                        ],
                    },
                },
                secondaryCurrency_adminDeliveryProfit: {
                    $sum: {
                        $sum: [
                            '$adminCharge.secondaryCurrency_adminChargeFromDelivery',
                        ],
                    },
                },
            },
        },
    ]);
    if (totalDeliveryFinancialQ.length < 1) {
        totalDeliveryFinancialQ.push({
            deliveryFee: 0,
            secondaryCurrency_deliveryFee: 0,
            userPayDeliveryFee: 0,
            secondaryCurrency_userPayDeliveryFee: 0,
            freeDeliveryShopCut: 0,
            secondaryCurrency_freeDeliveryShopCut: 0,
            freeDeliveryAdminCut: 0,
            secondaryCurrency_freeDeliveryAdminCut: 0,
            freeDeliveryAdminCutForSubscription: 0,
            secondaryCurrency_freeDeliveryAdminCutForSubscription: 0,
            riderPayout: 0,
            secondaryCurrency_riderPayout: 0,
            adminDeliveryProfit: 0,
            secondaryCurrency_adminDeliveryProfit: 0,
        });
    }

    const totalRiderTipFinancialConfig = {
        ...commonConfig,
        orderStatus: 'delivered',
    };

    const totalRiderTipFinancialQ = await OrderModel.aggregate([
        {
            $match: totalRiderTipFinancialConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                userPayRiderTip: {
                    $sum: {
                        $sum: ['$summary.baseCurrency_riderTip'],
                    },
                },
                secondaryCurrency_userPayRiderTip: {
                    $sum: {
                        $sum: ['$summary.secondaryCurrency_riderTip'],
                    },
                },
            },
        },
    ]);
    if (totalRiderTipFinancialQ.length < 1) {
        totalRiderTipFinancialQ.push({
            userPayRiderTip: 0,
            secondaryCurrency_userPayRiderTip: 0,
        });
    }

    const totalButlerFinancialQ = await ButlerModel.aggregate([
        {
            $match: {
                ...commonConfig,
                orderStatus: 'delivered',
            },
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                orderAmount: {
                    $sum: {
                        $sum: ['$summary.baseCurrency_riderFee'],
                    },
                },
                secondaryCurrency_orderAmount: {
                    $sum: {
                        $sum: ['$summary.secondaryCurrency_riderFee'],
                    },
                },
                riderPayoutForButler: {
                    $sum: {
                        $sum: ['$baseCurrency_riderFee'],
                    },
                },
                secondaryCurrency_riderPayoutForButler: {
                    $sum: {
                        $sum: ['$secondaryCurrency_riderFee'],
                    },
                },
                adminButlerProfit: {
                    $sum: {
                        $sum: [
                            '$adminCharge.baseCurrency_adminChargeFromDelivery',
                        ],
                    },
                },
                secondaryCurrency_adminButlerProfit: {
                    $sum: {
                        $sum: [
                            '$adminCharge.secondaryCurrency_adminChargeFromDelivery',
                        ],
                    },
                },
            },
        },
    ]);
    if (totalButlerFinancialQ.length < 1) {
        totalButlerFinancialQ.push({
            orderAmount: 0,
            secondaryCurrency_orderAmount: 0,
            riderPayoutForButler: 0,
            secondaryCurrency_riderPayoutForButler: 0,
            adminButlerProfit: 0,
            secondaryCurrency_adminButlerProfit: 0,
        });
    }

    // For Subscription loss
    const totalSubscriptionLossQ = await OrderModel.aggregate([
        {
            $match: subscriptionLossConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                shopRiderSubscriptionLoss: {
                    $sum: {
                        $sum: ['$subscriptionLoss.baseCurrency_freeDelivery'],
                    },
                },
                secondaryCurrency_shopRiderSubscriptionLoss: {
                    $sum: {
                        $sum: [
                            '$subscriptionLoss.secondaryCurrency_freeDelivery',
                        ],
                    },
                },
            },
        },
    ]);
    if (totalSubscriptionLossQ.length < 1) {
        totalSubscriptionLossQ.push({
            shopRiderSubscriptionLoss: 0,
            secondaryCurrency_shopRiderSubscriptionLoss: 0,
        });
    }

    // Update Admin delivery profit
    if (isShopRiderSubscriptionLossAdjust) {
        totalDeliveryFinancialQ[0].adminDeliveryProfit -=
            totalSubscriptionLossQ[0].shopRiderSubscriptionLoss;
        totalDeliveryFinancialQ[0].secondaryCurrency_adminDeliveryProfit -=
            totalSubscriptionLossQ[0].secondaryCurrency_shopRiderSubscriptionLoss;
    }

    return {
        totalDeliveredOrder,
        totalDeliveredButlerOrder,
        ...totalDeliveryFinancialQ[0],
        ...totalRiderTipFinancialQ[0],
        ...totalButlerFinancialQ[0],
        ...totalSubscriptionLossQ[0],
    };
};

exports.getButlerFinancial = async ({
    riderId,
    startDate,
    endDate,
    paidCurrency,
}) => {
    let commonConfig = {
        orderStatus: 'delivered',
    };

    if (riderId) {
        commonConfig = {
            ...commonConfig,
            deliveryBoy: riderId,
        };
    }

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const totalDeliveredOrder = await ButlerModel.count(commonConfig);

    const totalButlerFinancialQ = await ButlerModel.aggregate([
        {
            $match: commonConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                orderAmount: {
                    $sum: {
                        $sum: ['$summary.baseCurrency_riderFee'],
                    },
                },
                secondaryCurrency_orderAmount: {
                    $sum: {
                        $sum: ['$summary.secondaryCurrency_riderFee'],
                    },
                },
                riderPayout: {
                    $sum: {
                        $sum: ['$baseCurrency_riderFee'],
                    },
                },
                secondaryCurrency_riderPayout: {
                    $sum: {
                        $sum: ['$secondaryCurrency_riderFee'],
                    },
                },
                adminButlerProfit: {
                    $sum: {
                        $sum: [
                            '$adminCharge.baseCurrency_adminChargeFromDelivery',
                        ],
                    },
                },
                secondaryCurrency_adminButlerProfit: {
                    $sum: {
                        $sum: [
                            '$adminCharge.secondaryCurrency_adminChargeFromDelivery',
                        ],
                    },
                },
            },
        },
    ]);
    if (totalButlerFinancialQ.length < 1) {
        totalButlerFinancialQ.push({
            orderAmount: 0,
            secondaryCurrency_orderAmount: 0,
            riderPayout: 0,
            secondaryCurrency_riderPayout: 0,
            adminButlerProfit: 0,
            secondaryCurrency_adminButlerProfit: 0,
        });
    }

    return { totalDeliveredOrder, ...totalButlerFinancialQ[0] };
};

// const getShopAdminProfitBreakdownInBaseCurrency = async (
//     shopId,
//     startDate,
//     endDate
// ) => {
//     const paidCurrency = 'baseCurrency';

//     const orderStatistics = await this.getOrderStatistics({
//         type: 'shop',
//         id: shopId,
//         startDate,
//         endDate,
//         paidCurrency,
//     });

//     //** Create summary Start **/
//     const orderStatistics_cash = await this.getOrderStatistics({
//         type: 'shop',
//         id: shopId,
//         startDate,
//         endDate,
//         paymentMethod: 'cash',
//         paidCurrency,
//     });
//     const orderStatistics_online = await this.getOrderStatistics({
//         type: 'shop',
//         id: shopId,
//         startDate,
//         endDate,
//         paymentMethod: 'online',
//         paidCurrency,
//     });
//     const originalOrderAmount_cash =
//         orderStatistics_cash.totalValue.productAmount +
//         orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
//     const discount_cash = orderStatistics_cash.totalValue.totalDiscount;
//     const loyaltyPoints_cash =
//         orderStatistics_cash.totalValue.totalRewardAmount;
//     const buy1Get1_cash =
//         orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
//     const couponDiscount_cash =
//         orderStatistics_cash.totalValue.totalCouponAdminCut +
//         orderStatistics_cash.totalValue.totalCouponShopCut;
//     const totalCash =
//         originalOrderAmount_cash -
//         discount_cash -
//         loyaltyPoints_cash -
//         buy1Get1_cash -
//         couponDiscount_cash;
//     const wallet_cash = orderStatistics_cash.totalValue.wallet;

//     const originalOrderAmount_online =
//         orderStatistics_online.totalValue.productAmount +
//         orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
//     const discount_online = orderStatistics_online.totalValue.totalDiscount;
//     const loyaltyPoints_online =
//         orderStatistics_online.totalValue.totalRewardAmount;
//     const buy1Get1_online =
//         orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
//     const couponDiscount_online =
//         orderStatistics_online.totalValue.totalCouponAdminCut +
//         orderStatistics_online.totalValue.totalCouponShopCut;
//     const totalOnline =
//         originalOrderAmount_online -
//         discount_online -
//         loyaltyPoints_online -
//         buy1Get1_online -
//         couponDiscount_online;
//     const wallet_online = orderStatistics_online.totalValue.wallet;

//     const discount_amc = orderStatistics.totalValue.totalAdminDiscount;
//     const buy1Get1_amc =
//         orderStatistics.totalValue.totalAdminDoubleMenuItemPrice;
//     const couponDiscount_amc = orderStatistics.totalValue.totalCouponAdminCut;
//     const pointsCashback = orderStatistics.totalValue.pointsCashback;
//     const adminMarketingCashback =
//         discount_amc + buy1Get1_amc + couponDiscount_amc + pointsCashback;

//     const orderAmount = totalCash + totalOnline + adminMarketingCashback;

//     const { featuredAmount } = await this.getFeaturedAmount({
//         type: 'shop',
//         id: shopId,
//         startDate,
//         endDate,
//         paidCurrency,
//     });

//     const { refundAmount: customerRefund } = await this.getTotalRefundAmount({
//         type: 'shop',
//         id: shopId,
//         startDate,
//         endDate,
//         account: 'admin',
//         paidCurrency,
//     });

//     const { totalErrorCharge: errorCharge } = await this.getTotalErrorCharge({
//         type: 'shop',
//         id: shopId,
//         startDate,
//         endDate,
//         account: 'admin',
//         paidCurrency,
//     });

//     const freeDeliveryByShop = orderStatistics.totalValue.freeDeliveryShopCut;

//     let { adminFees: totalAdminProfit } = await this.getAdminEarning({
//         type: 'shop',
//         id: shopId,
//         startDate,
//         endDate,
//         paidCurrency,
//     });

//     //** Create summary End **/

//     //*** Calculate payout start ***/
//     const { refundAmount: shopCustomerRefund } =
//         await this.getTotalRefundAmount({
//             type: 'shop',
//             id: shopId,
//             startDate,
//             endDate,
//             account: 'shop',
//             paidCurrency,
//         });

//     const { totalErrorCharge: totalShopErrorCharge } =
//         await this.getTotalErrorCharge({
//             type: 'shop',
//             id: shopId,
//             startDate,
//             endDate,
//             account: 'shop',
//             paidCurrency,
//         });

//     const { deliveryFee: shopDeliveryFee, riderTip: shopRiderTip } =
//         await this.getShopDeliveryFee({
//             type: 'shop',
//             id: shopId,
//             startDate,
//             endDate,
//             paidCurrency,
//         });

//     const { totalAddRemoveCredit: shopAddRemoveCredit } =
//         await this.getShopAddRemoveCredit({
//             type: 'shop',
//             id: shopId,
//             startDate,
//             endDate,
//             paidCurrency,
//         });

//     const { totalShopEarning: totalShopEarning } = await this.getShopEarning({
//         type: 'shop',
//         id: shopId,
//         startDate,
//         endDate,
//         paidCurrency,
//     });

//     const { totalSellerUnsettle: totalShopUnsettle } =
//         await this.getShopUnSettleAmount({
//             type: 'shop',
//             id: shopId,
//             startDate,
//             endDate,
//             paidCurrency,
//         });

//     const totalShopProfit = totalShopUnsettle + totalShopEarning;

//     const profitBreakdown = {
//         cash: {
//             originalOrderAmount_cash,
//             discount_cash,
//             loyaltyPoints_cash,
//             buy1Get1_cash,
//             couponDiscount_cash,
//             totalCash,
//             wallet_cash,
//         },
//         online: {
//             originalOrderAmount_online,
//             discount_online,
//             loyaltyPoints_online,
//             buy1Get1_online,
//             couponDiscount_online,
//             totalOnline,
//             wallet_online,
//         },
//         AdminMarketingCashback: {
//             discount_amc,
//             buy1Get1_amc,
//             couponDiscount_amc,
//             pointsCashback,
//             adminMarketingCashback,
//         },
//         orderAmount,
//         payout: {
//             freeDeliveryByShop,
//             shopCustomerRefund,
//             shopErrorCharge: totalShopErrorCharge,
//             // pointsCashback,
//             shopDeliveryFee,
//             shopRiderTip,
//             shopVat: orderStatistics.totalValue.totalVat,
//             shopAddRemoveCredit,
//             featuredAmount,
//             payout:
//                 totalShopProfit -
//                 shopDeliveryFee -
//                 shopRiderTip -
//                 orderStatistics.totalValue.totalVat +
//                 // pointsCashback +
//                 featuredAmount -
//                 freeDeliveryByShop -
//                 shopCustomerRefund -
//                 totalShopErrorCharge -
//                 shopAddRemoveCredit,
//             totalPayout: totalShopProfit,
//         },
//         featuredAmount,
//         otherPayments: {
//             adminMarketingCashback,
//             customerRefund,
//             shopCustomerRefund,
//             freeDeliveryByShop,
//             shopDeliveryFee: shopDeliveryFee + shopRiderTip,
//             shopVat: orderStatistics.totalValue.totalVat,
//             errorCharge,
//             shopErrorCharge: totalShopErrorCharge,
//             totalOtherPayments:
//                 adminMarketingCashback +
//                 customerRefund +
//                 shopCustomerRefund +
//                 freeDeliveryByShop +
//                 errorCharge +
//                 totalShopErrorCharge -
//                 shopDeliveryFee -
//                 shopRiderTip -
//                 orderStatistics.totalValue.totalVat,
//         },
//         totalAdminProfit:
//             totalAdminProfit +
//             featuredAmount -
//             customerRefund -
//             shopAddRemoveCredit -
//             errorCharge,
//     };
//     //*** Calculate payout end ***/

//     return { profitBreakdown };
// };
const getShopAdminProfitBreakdownInBaseCurrency = async (
    shopId,
    startDate,
    endDate
) => {
    const orderStatistics = await this.getOrderStatistics({
        type: 'shop',
        id: shopId,
        startDate,
        endDate,
    });

    //** Create summary Start **/
    const orderStatistics_cash = await this.getOrderStatistics({
        type: 'shop',
        id: shopId,
        startDate,
        endDate,
        paymentMethod: 'cash',
    });
    const orderStatistics_online = await this.getOrderStatistics({
        type: 'shop',
        id: shopId,
        startDate,
        endDate,
        paymentMethod: 'online',
    });
    const originalOrderAmount_cash =
        orderStatistics_cash.totalValue.productAmount +
        orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
    const discount_cash = orderStatistics_cash.totalValue.totalDiscount;
    const loyaltyPoints_cash =
        orderStatistics_cash.totalValue.totalRewardAmount;
    const buy1Get1_cash =
        orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
    const couponDiscount_cash =
        orderStatistics_cash.totalValue.totalCouponAdminCut +
        orderStatistics_cash.totalValue.totalCouponShopCut;
    const totalCash =
        originalOrderAmount_cash -
        discount_cash -
        loyaltyPoints_cash -
        buy1Get1_cash -
        couponDiscount_cash;
    const wallet_cash = orderStatistics_cash.totalValue.wallet;

    const originalOrderAmount_online =
        orderStatistics_online.totalValue.productAmount +
        orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
    const discount_online = orderStatistics_online.totalValue.totalDiscount;
    const loyaltyPoints_online =
        orderStatistics_online.totalValue.totalRewardAmount;
    const buy1Get1_online =
        orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
    const couponDiscount_online =
        orderStatistics_online.totalValue.totalCouponAdminCut +
        orderStatistics_online.totalValue.totalCouponShopCut;
    const totalOnline =
        originalOrderAmount_online -
        discount_online -
        loyaltyPoints_online -
        buy1Get1_online -
        couponDiscount_online;
    const wallet_online = orderStatistics_online.totalValue.wallet;

    const discount_amc = orderStatistics.totalValue.totalAdminDiscount;
    const buy1Get1_amc =
        orderStatistics.totalValue.totalAdminDoubleMenuItemPrice;
    const couponDiscount_amc = orderStatistics.totalValue.totalCouponAdminCut;
    const pointsCashback = orderStatistics.totalValue.pointsCashback;
    const adminMarketingCashback =
        discount_amc + buy1Get1_amc + couponDiscount_amc + pointsCashback;

    const orderAmount = totalCash + totalOnline + adminMarketingCashback;

    const { featuredAmount } = await this.getFeaturedAmount({
        type: 'shop',
        id: shopId,
        startDate,
        endDate,
    });

    const { refundAmount: customerRefund } = await this.getTotalRefundAmount({
        type: 'shop',
        id: shopId,
        startDate,
        endDate,
        account: 'admin',
    });

    const { totalErrorCharge: errorCharge } = await this.getTotalErrorCharge({
        type: 'shop',
        id: shopId,
        startDate,
        endDate,
        account: 'admin',
    });

    const freeDeliveryByShop = orderStatistics.totalValue.freeDeliveryShopCut;

    let { adminFees: totalAdminProfit } = await this.getAdminEarning({
        type: 'shop',
        id: shopId,
        startDate,
        endDate,
    });

    //** Create summary End **/

    //*** Calculate payout start ***/
    const { refundAmount: shopCustomerRefund } =
        await this.getTotalRefundAmount({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
            account: 'shop',
        });

    const { totalErrorCharge: totalShopErrorCharge } =
        await this.getTotalErrorCharge({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
            account: 'shop',
        });

    const { deliveryFee: shopDeliveryFee, riderTip: shopRiderTip } =
        await this.getShopDeliveryFee({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
        });

    const { totalAddRemoveCredit: shopAddRemoveCredit } =
        await this.getShopAddRemoveCredit({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
        });

    const { totalShopEarning: totalShopEarning } = await this.getShopEarning({
        type: 'shop',
        id: shopId,
        startDate,
        endDate,
    });

    const { totalSellerUnsettle: totalShopUnsettle } =
        await this.getShopUnSettleAmount({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
        });

    const totalShopProfit = totalShopUnsettle + totalShopEarning;

    const profitBreakdown = {
        cash: {
            originalOrderAmount_cash,
            discount_cash,
            loyaltyPoints_cash,
            buy1Get1_cash,
            couponDiscount_cash,
            totalCash,
            wallet_cash,
        },
        online: {
            originalOrderAmount_online,
            discount_online,
            loyaltyPoints_online,
            buy1Get1_online,
            couponDiscount_online,
            totalOnline,
            wallet_online,
        },
        AdminMarketingCashback: {
            discount_amc,
            buy1Get1_amc,
            couponDiscount_amc,
            pointsCashback,
            adminMarketingCashback,
        },
        orderAmount,
        payout: {
            freeDeliveryByShop,
            shopCustomerRefund,
            shopErrorCharge: totalShopErrorCharge,
            shopDeliveryFee,
            shopRiderTip,
            // shopVat: orderStatistics.totalValue.totalVat,
            shopAddRemoveCredit,
            featuredAmount,
            // payout:
            //     totalShopProfit -
            //     shopDeliveryFee -
            //     shopRiderTip -
            //     orderStatistics.totalValue.totalVat +
            //     featuredAmount -
            //     freeDeliveryByShop -
            //     shopCustomerRefund -
            //     totalShopErrorCharge -
            //     shopAddRemoveCredit,
            payout:
                totalShopProfit -
                shopDeliveryFee -
                shopRiderTip +
                featuredAmount -
                freeDeliveryByShop -
                shopCustomerRefund -
                totalShopErrorCharge -
                shopAddRemoveCredit,
            totalPayout: totalShopProfit,
        },
        featuredAmount,
        otherPayments: {
            adminMarketingCashback,
            customerRefund,
            shopCustomerRefund,
            freeDeliveryByShop,
            shopDeliveryFee: shopDeliveryFee + shopRiderTip,
            // shopVat: orderStatistics.totalValue.totalVat,
            errorCharge,
            shopErrorCharge: totalShopErrorCharge,
            // totalOtherPayments:
            //     adminMarketingCashback +
            //     customerRefund +
            //     shopCustomerRefund +
            //     freeDeliveryByShop +
            //     errorCharge +
            //     totalShopErrorCharge -
            //     shopDeliveryFee -
            //     shopRiderTip -
            //     orderStatistics.totalValue.totalVat,
            totalOtherPayments:
                adminMarketingCashback +
                customerRefund +
                shopCustomerRefund +
                freeDeliveryByShop +
                errorCharge +
                totalShopErrorCharge -
                shopDeliveryFee -
                shopRiderTip,
        },
        adminVat: orderStatistics.totalValue.totalVat,
        totalAdminProfit:
            totalAdminProfit +
            featuredAmount -
            customerRefund -
            shopAddRemoveCredit -
            errorCharge,
    };
    //*** Calculate payout end ***/

    return { profitBreakdown };
};

const getShopAdminProfitBreakdownInSecondaryCurrency = async (
    shopId,
    startDate,
    endDate
) => {
    const orderStatistics = await this.getOrderStatistics({
        type: 'shop',
        id: shopId,
        startDate,
        endDate,
    });

    //** Create summary Start **/
    const orderStatistics_cash = await this.getOrderStatistics({
        type: 'shop',
        id: shopId,
        startDate,
        endDate,
        paymentMethod: 'cash',
    });
    const orderStatistics_online = await this.getOrderStatistics({
        type: 'shop',
        id: shopId,
        startDate,
        endDate,
        paymentMethod: 'online',
    });
    const originalOrderAmount_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_productAmount +
        orderStatistics_cash.totalValue
            .secondaryCurrency_totalDoubleMenuItemPrice;
    const discount_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_totalDiscount;
    const loyaltyPoints_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_totalRewardAmount;
    const buy1Get1_cash =
        orderStatistics_cash.totalValue
            .secondaryCurrency_totalDoubleMenuItemPrice;
    const couponDiscount_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_totalCouponAdminCut +
        orderStatistics_cash.totalValue.secondaryCurrency_totalCouponShopCut;
    const totalCash =
        originalOrderAmount_cash -
        discount_cash -
        loyaltyPoints_cash -
        buy1Get1_cash -
        couponDiscount_cash;
    const wallet_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_wallet;

    const originalOrderAmount_online =
        orderStatistics_online.totalValue.secondaryCurrency_productAmount +
        orderStatistics_online.totalValue
            .secondaryCurrency_totalDoubleMenuItemPrice;
    const discount_online =
        orderStatistics_online.totalValue.secondaryCurrency_totalDiscount;
    const loyaltyPoints_online =
        orderStatistics_online.totalValue.secondaryCurrency_totalRewardAmount;
    const buy1Get1_online =
        orderStatistics_online.totalValue
            .secondaryCurrency_totalDoubleMenuItemPrice;
    const couponDiscount_online =
        orderStatistics_online.totalValue
            .secondaryCurrency_totalCouponAdminCut +
        orderStatistics_online.totalValue.secondaryCurrency_totalCouponShopCut;
    const totalOnline =
        originalOrderAmount_online -
        discount_online -
        loyaltyPoints_online -
        buy1Get1_online -
        couponDiscount_online;
    const wallet_online =
        orderStatistics_online.totalValue.secondaryCurrency_wallet;

    const discount_amc =
        orderStatistics.totalValue.secondaryCurrency_totalAdminDiscount;
    const buy1Get1_amc =
        orderStatistics.totalValue
            .secondaryCurrency_totalAdminDoubleMenuItemPrice;
    const couponDiscount_amc =
        orderStatistics.totalValue.secondaryCurrency_totalCouponAdminCut;
    const pointsCashback =
        orderStatistics.totalValue.secondaryCurrency_pointsCashback;
    const adminMarketingCashback =
        discount_amc + buy1Get1_amc + couponDiscount_amc + pointsCashback;

    const orderAmount = totalCash + totalOnline + adminMarketingCashback;

    const { secondaryCurrency_featuredAmount: featuredAmount } =
        await this.getFeaturedAmount({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
        });

    const { secondaryCurrency_refundAmount: customerRefund } =
        await this.getTotalRefundAmount({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
            account: 'admin',
        });

    const { secondaryCurrency_totalErrorCharge: errorCharge } =
        await this.getTotalErrorCharge({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
            account: 'admin',
        });

    const freeDeliveryByShop =
        orderStatistics.totalValue.secondaryCurrency_freeDeliveryShopCut;

    let { secondaryCurrency_adminFees: totalAdminProfit } =
        await this.getAdminEarning({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
        });

    //** Create summary End **/

    //*** Calculate payout start ***/
    const { secondaryCurrency_refundAmount: shopCustomerRefund } =
        await this.getTotalRefundAmount({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
            account: 'shop',
        });

    const { totalErrorCharge: totalShopErrorCharge } =
        await this.getTotalErrorCharge({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
            account: 'shop',
        });

    const {
        secondaryCurrency_deliveryFee: shopDeliveryFee,
        secondaryCurrency_riderTip: shopRiderTip,
    } = await this.getShopDeliveryFee({
        type: 'shop',
        id: shopId,
        startDate,
        endDate,
    });

    const { secondaryCurrency_totalAddRemoveCredit: shopAddRemoveCredit } =
        await this.getShopAddRemoveCredit({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
        });

    const { secondaryCurrency_totalShopEarning: totalShopEarning } =
        await this.getShopEarning({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
        });

    const { secondaryCurrency_totalSellerUnsettle: totalShopUnsettle } =
        await this.getShopUnSettleAmount({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
        });

    const totalShopProfit = totalShopUnsettle + totalShopEarning;

    const profitBreakdown = {
        cash: {
            originalOrderAmount_cash,
            discount_cash,
            loyaltyPoints_cash,
            buy1Get1_cash,
            couponDiscount_cash,
            totalCash,
            wallet_cash,
        },
        online: {
            originalOrderAmount_online,
            discount_online,
            loyaltyPoints_online,
            buy1Get1_online,
            couponDiscount_online,
            totalOnline,
            wallet_online,
        },
        AdminMarketingCashback: {
            discount_amc,
            buy1Get1_amc,
            couponDiscount_amc,
            pointsCashback,
            adminMarketingCashback,
        },
        orderAmount,
        payout: {
            freeDeliveryByShop,
            shopCustomerRefund,
            shopErrorCharge: totalShopErrorCharge,
            shopDeliveryFee,
            shopRiderTip,
            // shopVat: orderStatistics.totalValue.secondaryCurrency_totalVat,
            shopAddRemoveCredit,
            featuredAmount,
            // payout:
            //     totalShopProfit -
            //     shopDeliveryFee -
            //     shopRiderTip -
            //     orderStatistics.totalValue.secondaryCurrency_totalVat +
            //     featuredAmount -
            //     freeDeliveryByShop -
            //     shopCustomerRefund -
            //     totalShopErrorCharge -
            //     shopAddRemoveCredit,
            payout:
                totalShopProfit -
                shopDeliveryFee -
                shopRiderTip +
                featuredAmount -
                freeDeliveryByShop -
                shopCustomerRefund -
                totalShopErrorCharge -
                shopAddRemoveCredit,
            totalPayout: totalShopProfit,
        },
        featuredAmount,
        otherPayments: {
            adminMarketingCashback,
            customerRefund,
            shopCustomerRefund,
            freeDeliveryByShop,
            shopDeliveryFee: shopDeliveryFee + shopRiderTip,
            errorCharge,
            shopErrorCharge: totalShopErrorCharge,
            totalOtherPayments:
                adminMarketingCashback +
                customerRefund +
                shopCustomerRefund +
                freeDeliveryByShop +
                errorCharge +
                totalShopErrorCharge -
                shopDeliveryFee -
                shopRiderTip,
        },
        adminVat: orderStatistics.totalValue.secondaryCurrency_totalVat,
        totalAdminProfit:
            totalAdminProfit +
            featuredAmount -
            customerRefund -
            shopAddRemoveCredit -
            errorCharge,
    };
    //*** Calculate payout end ***/

    return { profitBreakdown };
};

// const getShopProfitBreakdownInBaseCurrency = async ({
//     type,
//     id,
//     startDate,
//     endDate,
// }) => {
//     const paidCurrency = 'baseCurrency';

//     //** Calculate Shop Payout Start ***/

//     const { totalShopEarning } = await this.getShopEarning({
//         type,
//         id,
//         startDate,
//         endDate,
//         paidCurrency,
//     });

//     const { totalSellerUnsettle: totalShopUnsettle } =
//         await this.getShopUnSettleAmount({
//             type,
//             id,
//             startDate,
//             endDate,
//             paidCurrency,
//         });

//     const totalShopProfit = totalShopUnsettle + totalShopEarning;
//     //** Calculate Shop Payout End ***/

//     const orderStatistics = await this.getOrderStatistics({
//         type,
//         id,
//         startDate,
//         endDate,
//         paidCurrency,
//     });

//     // Free Delivery Shop Cut
//     const freeDeliveryShopCutByDate =
//         orderStatistics.totalValue.freeDeliveryShopCut;

//     // Free Delivery Admin Cut
//     const freeDeliveryAdminCutByDate =
//         orderStatistics.totalValue.freeDeliveryAdminCut;

//     //** Create summary Start **/
//     const orderStatistics_cash = await this.getOrderStatistics({
//         type,
//         id,
//         startDate,
//         endDate,
//         paymentMethod: 'cash',
//         paidCurrency,
//     });
//     const orderStatistics_online = await this.getOrderStatistics({
//         type,
//         id,
//         startDate,
//         endDate,
//         paymentMethod: 'online',
//         paidCurrency,
//     });
//     const originalOrderAmount_cash =
//         orderStatistics_cash.totalValue.productAmount +
//         orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
//     const discount_cash = orderStatistics_cash.totalValue.totalDiscount;
//     const loyaltyPoints_cash =
//         orderStatistics_cash.totalValue.totalRewardAmount;
//     const buy1Get1_cash =
//         orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
//     const couponDiscount_cash =
//         orderStatistics_cash.totalValue.totalCouponAdminCut +
//         orderStatistics_cash.totalValue.totalCouponShopCut;
//     const totalCash =
//         originalOrderAmount_cash -
//         discount_cash -
//         loyaltyPoints_cash -
//         buy1Get1_cash -
//         couponDiscount_cash;
//     const wallet_cash = orderStatistics_cash.totalValue.wallet;

//     const originalOrderAmount_online =
//         orderStatistics_online.totalValue.productAmount +
//         orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
//     const discount_online = orderStatistics_online.totalValue.totalDiscount;
//     const loyaltyPoints_online =
//         orderStatistics_online.totalValue.totalRewardAmount;
//     const buy1Get1_online =
//         orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
//     const couponDiscount_online =
//         orderStatistics_online.totalValue.totalCouponAdminCut +
//         orderStatistics_online.totalValue.totalCouponShopCut;
//     const totalOnline =
//         originalOrderAmount_online -
//         discount_online -
//         loyaltyPoints_online -
//         buy1Get1_online -
//         couponDiscount_online;
//     const wallet_online = orderStatistics_online.totalValue.wallet;

//     const discount_amc = orderStatistics.totalValue.totalAdminDiscount;
//     const buy1Get1_amc =
//         orderStatistics.totalValue.totalAdminDoubleMenuItemPrice;
//     const couponDiscount_amc = orderStatistics.totalValue.totalCouponAdminCut;
//     const pointsCashback = orderStatistics.totalValue.pointsCashback;
//     const adminMarketingCashback =
//         discount_amc + buy1Get1_amc + couponDiscount_amc + pointsCashback;

//     const orderAmount = totalCash + totalOnline + adminMarketingCashback;

//     let { adminFees } = await this.getAdminEarning({
//         type,
//         id,
//         startDate,
//         endDate,
//         paidCurrency,
//     });
//     adminFees += adminMarketingCashback;

//     const freeDeliveryByShop = orderStatistics.totalValue.freeDeliveryShopCut;

//     // Featured amount
//     const { featuredAmount } = await this.getFeaturedAmount({
//         type,
//         id,
//         startDate,
//         endDate,
//         paidCurrency,
//     });

//     const { refundAmount: customerRefund } = await this.getTotalRefundAmount({
//         type,
//         id,
//         startDate,
//         endDate,
//         account: 'shop',
//         paidCurrency,
//     });

//     const { totalAddRemoveCredit: shopAddRemoveCredit } =
//         await this.getShopAddRemoveCredit({
//             type,
//             id,
//             startDate,
//             endDate,
//             paidCurrency,
//         });

//     const { deliveryFee: deliveryFee_cash } = await this.getShopDeliveryFee({
//         type,
//         id,
//         startDate,
//         endDate,
//         paymentMethod: 'cash',
//         paidCurrency,
//     });

//     const { deliveryFee: deliveryFee_online, riderTip: riderTip_online } =
//         await this.getShopDeliveryFee({
//             type,
//             id,
//             startDate,
//             endDate,
//             paymentMethod: 'online',
//             paidCurrency,
//         });

//     const { totalErrorCharge: errorCharge } = await this.getTotalErrorCharge({
//         type,
//         id,
//         startDate,
//         endDate,
//         account: 'shop',
//         paidCurrency,
//     });
//     //** Create summary End **/

//     //** Calc Shop Cash In Hand Start **/
//     const { totalShopCashInHand: cashInHand } = await this.getShopCashInHand({
//         type,
//         id,
//         startDate,
//         endDate,
//         paidCurrency,
//     });
//     //** Calc Shop Cash In Hand End **/

//     const profitBreakdown = {
//         cash: {
//             originalOrderAmount_cash,
//             discount_cash,
//             loyaltyPoints_cash,
//             buy1Get1_cash,
//             couponDiscount_cash,
//             totalCash,
//             wallet_cash,
//         },
//         online: {
//             originalOrderAmount_online,
//             discount_online,
//             loyaltyPoints_online,
//             buy1Get1_online,
//             couponDiscount_online,
//             totalOnline,
//             wallet_online,
//         },
//         AdminMarketingCashback: {
//             discount_amc,
//             buy1Get1_amc,
//             couponDiscount_amc,
//             pointsCashback,
//             adminMarketingCashback,
//         },
//         orderAmount,
//         adminFees,
//         // pointsCashback,
//         totalVat: orderStatistics.totalValue.totalVat,
//         otherPayments: {
//             freeDeliveryByShop,
//             featuredAmount,
//             customerRefund,
//             shopAddRemoveCredit,
//             errorCharge,
//             totalOtherPayments:
//                 freeDeliveryByShop +
//                 featuredAmount +
//                 customerRefund +
//                 errorCharge -
//                 shopAddRemoveCredit,
//         },
//         deliveryFee: {
//             deliveryFee:
//                 deliveryFee_cash + deliveryFee_online + riderTip_online,
//             cash: deliveryFee_cash,
//             online: deliveryFee_online + riderTip_online,
//             deliveryFee_online,
//             riderTip_online,
//         },
//         cashInHand,
//         totalPaid: totalShopEarning,
//         totalUnpaid: totalShopUnsettle,
//         totalPayout: totalShopProfit - cashInHand,
//     };
//     //*** Calculate payout end ***/

//     return { profitBreakdown };
// };
const getShopProfitBreakdownInBaseCurrency = async ({
    type,
    id,
    startDate,
    endDate,
}) => {
    //** Calculate Shop Payout Start ***/
    const { totalShopEarning } = await this.getShopEarning({
        type,
        id,
        startDate,
        endDate,
    });

    const { totalSellerUnsettle: totalShopUnsettle } =
        await this.getShopUnSettleAmount({
            type,
            id,
            startDate,
            endDate,
        });

    const totalShopProfit = totalShopUnsettle + totalShopEarning;
    //** Calculate Shop Payout End ***/

    const orderStatistics = await this.getOrderStatistics({
        type,
        id,
        startDate,
        endDate,
    });

    // Free Delivery Shop Cut
    const freeDeliveryShopCutByDate =
        orderStatistics.totalValue.freeDeliveryShopCut;

    // Free Delivery Admin Cut
    const freeDeliveryAdminCutByDate =
        orderStatistics.totalValue.freeDeliveryAdminCut;

    //** Create summary Start **/
    const orderStatistics_cash = await this.getOrderStatistics({
        type,
        id,
        startDate,
        endDate,
        paymentMethod: 'cash',
    });
    const orderStatistics_online = await this.getOrderStatistics({
        type,
        id,
        startDate,
        endDate,
        paymentMethod: 'online',
    });
    const originalOrderAmount_cash =
        orderStatistics_cash.totalValue.productAmount +
        orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
    const discount_cash = orderStatistics_cash.totalValue.totalDiscount;
    const loyaltyPoints_cash =
        orderStatistics_cash.totalValue.totalRewardAmount;
    const buy1Get1_cash =
        orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
    const couponDiscount_cash =
        orderStatistics_cash.totalValue.totalCouponAdminCut +
        orderStatistics_cash.totalValue.totalCouponShopCut;
    const totalCash =
        originalOrderAmount_cash -
        discount_cash -
        loyaltyPoints_cash -
        buy1Get1_cash -
        couponDiscount_cash;
    const wallet_cash = orderStatistics_cash.totalValue.wallet;

    const originalOrderAmount_online =
        orderStatistics_online.totalValue.productAmount +
        orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
    const discount_online = orderStatistics_online.totalValue.totalDiscount;
    const loyaltyPoints_online =
        orderStatistics_online.totalValue.totalRewardAmount;
    const buy1Get1_online =
        orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
    const couponDiscount_online =
        orderStatistics_online.totalValue.totalCouponAdminCut +
        orderStatistics_online.totalValue.totalCouponShopCut;
    const totalOnline =
        originalOrderAmount_online -
        discount_online -
        loyaltyPoints_online -
        buy1Get1_online -
        couponDiscount_online;
    const wallet_online = orderStatistics_online.totalValue.wallet;

    const discount_amc = orderStatistics.totalValue.totalAdminDiscount;
    const buy1Get1_amc =
        orderStatistics.totalValue.totalAdminDoubleMenuItemPrice;
    const couponDiscount_amc = orderStatistics.totalValue.totalCouponAdminCut;
    const pointsCashback = orderStatistics.totalValue.pointsCashback;
    const adminMarketingCashback =
        discount_amc + buy1Get1_amc + couponDiscount_amc + pointsCashback;

    const orderAmount = totalCash + totalOnline + adminMarketingCashback;

    let { adminFees } = await this.getAdminEarning({
        type,
        id,
        startDate,
        endDate,
    });
    adminFees += adminMarketingCashback;

    const freeDeliveryByShop = orderStatistics.totalValue.freeDeliveryShopCut;

    // Featured amount
    const { featuredAmount } = await this.getFeaturedAmount({
        type,
        id,
        startDate,
        endDate,
    });

    const { refundAmount: customerRefund } = await this.getTotalRefundAmount({
        type,
        id,
        startDate,
        endDate,
        account: 'shop',
    });

    const { totalAddRemoveCredit: shopAddRemoveCredit } =
        await this.getShopAddRemoveCredit({
            type,
            id,
            startDate,
            endDate,
        });

    const { deliveryFee: deliveryFee_cash } = await this.getShopDeliveryFee({
        type,
        id,
        startDate,
        endDate,
        paymentMethod: 'cash',
    });

    const { deliveryFee: deliveryFee_online, riderTip: riderTip_online } =
        await this.getShopDeliveryFee({
            type,
            id,
            startDate,
            endDate,
            paymentMethod: 'online',
        });

    const { totalErrorCharge: errorCharge } = await this.getTotalErrorCharge({
        type,
        id,
        startDate,
        endDate,
        account: 'shop',
    });
    //** Create summary End **/

    //** Calc Shop Cash In Hand Start **/
    const { totalShopCashInHand: cashInHand } = await this.getShopCashInHand({
        type,
        id,
        startDate,
        endDate,
    });
    //** Calc Shop Cash In Hand End **/

    const profitBreakdown = {
        cash: {
            originalOrderAmount_cash,
            discount_cash,
            loyaltyPoints_cash,
            buy1Get1_cash,
            couponDiscount_cash,
            totalCash,
            wallet_cash,
        },
        online: {
            originalOrderAmount_online,
            discount_online,
            loyaltyPoints_online,
            buy1Get1_online,
            couponDiscount_online,
            totalOnline,
            wallet_online,
        },
        AdminMarketingCashback: {
            discount_amc,
            buy1Get1_amc,
            couponDiscount_amc,
            pointsCashback,
            adminMarketingCashback,
        },
        orderAmount,
        adminFees,
        // pointsCashback,
        totalVat: orderStatistics.totalValue.totalVat,
        otherPayments: {
            freeDeliveryByShop,
            featuredAmount,
            customerRefund,
            shopAddRemoveCredit,
            errorCharge,
            totalOtherPayments:
                freeDeliveryByShop +
                featuredAmount +
                customerRefund +
                errorCharge -
                shopAddRemoveCredit,
        },
        deliveryFee: {
            deliveryFee:
                deliveryFee_cash + deliveryFee_online + riderTip_online,
            cash: deliveryFee_cash,
            online: deliveryFee_online + riderTip_online,
            deliveryFee_online,
            riderTip_online,
        },
        cashInHand,
        totalPaid: totalShopEarning,
        totalUnpaid: totalShopUnsettle,
        totalPayout: totalShopProfit - cashInHand,
    };
    //*** Calculate payout end ***/

    return { profitBreakdown };
};

const getShopProfitBreakdownInSecondaryCurrency = async ({
    type,
    id,
    startDate,
    endDate,
}) => {
    //** Calculate Shop Payout Start ***/
    const { secondaryCurrency_totalShopEarning: totalShopEarning } =
        await this.getShopEarning({
            type,
            id,
            startDate,
            endDate,
        });

    const { secondaryCurrency_totalSellerUnsettle: totalShopUnsettle } =
        await this.getShopUnSettleAmount({
            type,
            id,
            startDate,
            endDate,
        });

    const totalShopProfit = totalShopUnsettle + totalShopEarning;
    //** Calculate Shop Payout End ***/

    const orderStatistics = await this.getOrderStatistics({
        type,
        id,
        startDate,
        endDate,
    });

    // Free Delivery Shop Cut
    const freeDeliveryShopCutByDate =
        orderStatistics.totalValue.secondaryCurrency_freeDeliveryShopCut;

    // Free Delivery Admin Cut
    const freeDeliveryAdminCutByDate =
        orderStatistics.totalValue.secondaryCurrency_freeDeliveryAdminCut;

    //** Create summary Start **/
    const orderStatistics_cash = await this.getOrderStatistics({
        type,
        id,
        startDate,
        endDate,
        paymentMethod: 'cash',
    });
    const orderStatistics_online = await this.getOrderStatistics({
        type,
        id,
        startDate,
        endDate,
        paymentMethod: 'online',
    });
    const originalOrderAmount_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_productAmount +
        orderStatistics_cash.totalValue
            .secondaryCurrency_totalDoubleMenuItemPrice;
    const discount_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_totalDiscount;
    const loyaltyPoints_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_totalRewardAmount;
    const buy1Get1_cash =
        orderStatistics_cash.totalValue
            .secondaryCurrency_totalDoubleMenuItemPrice;
    const couponDiscount_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_totalCouponAdminCut +
        orderStatistics_cash.totalValue.secondaryCurrency_totalCouponShopCut;
    const totalCash =
        originalOrderAmount_cash -
        discount_cash -
        loyaltyPoints_cash -
        buy1Get1_cash -
        couponDiscount_cash;
    const wallet_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_wallet;

    const originalOrderAmount_online =
        orderStatistics_online.totalValue.secondaryCurrency_productAmount +
        orderStatistics_online.totalValue
            .secondaryCurrency_totalDoubleMenuItemPrice;
    const discount_online =
        orderStatistics_online.totalValue.secondaryCurrency_totalDiscount;
    const loyaltyPoints_online =
        orderStatistics_online.totalValue.secondaryCurrency_totalRewardAmount;
    const buy1Get1_online =
        orderStatistics_online.totalValue
            .secondaryCurrency_totalDoubleMenuItemPrice;
    const couponDiscount_online =
        orderStatistics_online.totalValue
            .secondaryCurrency_totalCouponAdminCut +
        orderStatistics_online.totalValue.secondaryCurrency_totalCouponShopCut;
    const totalOnline =
        originalOrderAmount_online -
        discount_online -
        loyaltyPoints_online -
        buy1Get1_online -
        couponDiscount_online;
    const wallet_online =
        orderStatistics_online.totalValue.secondaryCurrency_wallet;

    const discount_amc =
        orderStatistics.totalValue.secondaryCurrency_totalAdminDiscount;
    const buy1Get1_amc =
        orderStatistics.totalValue
            .secondaryCurrency_totalAdminDoubleMenuItemPrice;
    const couponDiscount_amc =
        orderStatistics.totalValue.secondaryCurrency_totalCouponAdminCut;
    const pointsCashback =
        orderStatistics.totalValue.secondaryCurrency_pointsCashback;
    const adminMarketingCashback =
        discount_amc + buy1Get1_amc + couponDiscount_amc + pointsCashback;

    const orderAmount = totalCash + totalOnline + adminMarketingCashback;

    let { secondaryCurrency_adminFees: adminFees } = await this.getAdminEarning(
        {
            type,
            id,
            startDate,
            endDate,
        }
    );
    adminFees += adminMarketingCashback;

    const freeDeliveryByShop =
        orderStatistics.totalValue.secondaryCurrency_freeDeliveryShopCut;

    // Featured amount
    const { secondaryCurrency_featuredAmount: featuredAmount } =
        await this.getFeaturedAmount({
            type,
            id,
            startDate,
            endDate,
        });

    const { secondaryCurrency_refundAmount: customerRefund } =
        await this.getTotalRefundAmount({
            type,
            id,
            startDate,
            endDate,
            account: 'shop',
        });

    const { secondaryCurrency_totalAddRemoveCredit: shopAddRemoveCredit } =
        await this.getShopAddRemoveCredit({
            type,
            id,
            startDate,
            endDate,
        });

    const { secondaryCurrency_deliveryFee: deliveryFee_cash } =
        await this.getShopDeliveryFee({
            type,
            id,
            startDate,
            endDate,
            paymentMethod: 'cash',
        });

    const {
        secondaryCurrency_deliveryFee: deliveryFee_online,
        secondaryCurrency_riderTip: riderTip_online,
    } = await this.getShopDeliveryFee({
        type,
        id,
        startDate,
        endDate,
        paymentMethod: 'online',
    });

    const { secondaryCurrency_totalErrorCharge: errorCharge } =
        await this.getTotalErrorCharge({
            type,
            id,
            startDate,
            endDate,
            account: 'shop',
        });
    //** Create summary End **/

    //** Calc Shop Cash In Hand Start **/
    const { secondaryCurrency_totalShopCashInHand: cashInHand } =
        await this.getShopCashInHand({
            type,
            id,
            startDate,
            endDate,
        });
    //** Calc Shop Cash In Hand End **/

    const profitBreakdown = {
        cash: {
            originalOrderAmount_cash,
            discount_cash,
            loyaltyPoints_cash,
            buy1Get1_cash,
            couponDiscount_cash,
            totalCash,
            wallet_cash,
        },
        online: {
            originalOrderAmount_online,
            discount_online,
            loyaltyPoints_online,
            buy1Get1_online,
            couponDiscount_online,
            totalOnline,
            wallet_online,
        },
        AdminMarketingCashback: {
            discount_amc,
            buy1Get1_amc,
            couponDiscount_amc,
            pointsCashback,
            adminMarketingCashback,
        },
        orderAmount,
        adminFees,
        // pointsCashback,
        totalVat: orderStatistics.totalValue.secondaryCurrency_totalVat,
        otherPayments: {
            freeDeliveryByShop,
            featuredAmount,
            customerRefund,
            shopAddRemoveCredit,
            errorCharge,
            totalOtherPayments:
                freeDeliveryByShop +
                featuredAmount +
                customerRefund +
                errorCharge -
                shopAddRemoveCredit,
        },
        deliveryFee: {
            deliveryFee:
                deliveryFee_cash + deliveryFee_online + riderTip_online,
            cash: deliveryFee_cash,
            online: deliveryFee_online + riderTip_online,
            deliveryFee_online,
            riderTip_online,
        },
        cashInHand,
        totalPaid: totalShopEarning,
        totalUnpaid: totalShopUnsettle,
        totalPayout: totalShopProfit - cashInHand,
    };
    //*** Calculate payout end ***/

    return { profitBreakdown };
};

exports.getRiderCashInHand = async ({
    riderId,
    startDate,
    endDate,
    paidCurrency,
}) => {
    let config = {
        deliveryBoy: ObjectId(riderId),
        account: 'deliveryBoy',
        type: {
            $in: ['deliveryBoyOrderDeliveredCash'],
        },
    };

    if (paidCurrency) {
        config = {
            ...config,
            paidCurrency,
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

    const cashInHandAddQuery = await TransactionModel.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$receivedAmount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_receivedAmount'] },
                },
            },
        },
    ]);

    const cashInHandAdd = cashInHandAddQuery[0]
        ? cashInHandAddQuery[0].amount
        : 0;
    const secondaryCurrency_cashInHandAdd = cashInHandAddQuery[0]
        ? cashInHandAddQuery[0].secondaryCurrency_amount
        : 0;

    let config2 = {
        deliveryBoy: ObjectId(riderId),
        account: 'deliveryBoy',
        status: 'success',
        type: {
            $in: ['deliveryBoyAdminAmountReceivedCash'],
        },
    };

    if (paidCurrency) {
        config2 = {
            ...config2,
            paidCurrency,
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        config2 = {
            ...config2,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const cashInHandRemoveQuery = await TransactionModel.aggregate([
        {
            $match: config2,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const cashInHandRemove = cashInHandRemoveQuery[0]
        ? cashInHandRemoveQuery[0].amount
        : 0;
    const secondaryCurrency_cashInHandRemove = cashInHandRemoveQuery[0]
        ? cashInHandRemoveQuery[0].secondaryCurrency_amount
        : 0;

    const riderCashInHand = cashInHandAdd - cashInHandRemove;
    const secondaryCurrency_riderCashInHand =
        secondaryCurrency_cashInHandAdd - secondaryCurrency_cashInHandRemove;

    return { riderCashInHand, secondaryCurrency_riderCashInHand };
};

exports.getRiderActualCashInHand = async ({ riderId, startDate, endDate }) => {
    let config = {
        account: 'deliveryBoy',
        type: {
            $in: ['deliveryBoyOrderDeliveredCash'],
        },
    };

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

    if (riderId) {
        config.deliveryBoy = ObjectId(riderId);
    }

    const cashInHandAddQuery = await TransactionModel.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$baseCurrency_collectCash'] } },
                amount_sc: { $sum: { $sum: ['$baseCurrency_collectCash_sc'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_collectCash'] },
                },
                secondaryCurrency_amount_bc: {
                    $sum: { $sum: ['$secondaryCurrency_collectCash_bc'] },
                },
            },
        },
    ]);

    const cashInHandAdd = cashInHandAddQuery[0]
        ? cashInHandAddQuery[0].amount
        : 0;
    const secondaryCurrency_cashInHandAdd = cashInHandAddQuery[0]
        ? cashInHandAddQuery[0].secondaryCurrency_amount
        : 0;
    const cashInHandAdd_sc = cashInHandAddQuery[0]
        ? cashInHandAddQuery[0].amount_sc
        : 0;
    const secondaryCurrency_cashInHandAdd_bc = cashInHandAddQuery[0]
        ? cashInHandAddQuery[0].secondaryCurrency_amount_bc
        : 0;

    let baseCurrency_config2 = {
        account: 'deliveryBoy',
        status: 'success',
        type: {
            $in: ['deliveryBoyAdminAmountReceivedCash'],
        },
        paidCurrency: 'baseCurrency',
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        baseCurrency_config2 = {
            ...baseCurrency_config2,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    if (riderId) {
        baseCurrency_config2.deliveryBoy = ObjectId(riderId);
    }

    const baseCurrency_cashInHandRemoveQuery = await TransactionModel.aggregate(
        [
            {
                $match: baseCurrency_config2,
            },
            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    amount: { $sum: { $sum: ['$amount'] } },
                    amount_sc: {
                        $sum: { $sum: ['$secondaryCurrency_amount'] },
                    },
                },
            },
        ]
    );

    const baseCurrency_cashInHandRemove = baseCurrency_cashInHandRemoveQuery[0]
        ? baseCurrency_cashInHandRemoveQuery[0].amount
        : 0;
    const baseCurrency_cashInHandRemove_sc =
        baseCurrency_cashInHandRemoveQuery[0]
            ? baseCurrency_cashInHandRemoveQuery[0].amount_sc
            : 0;

    let secondaryCurrency_config2 = {
        account: 'deliveryBoy',
        status: 'success',
        type: {
            $in: ['deliveryBoyAdminAmountReceivedCash'],
        },
        paidCurrency: 'secondaryCurrency',
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        secondaryCurrency_config2 = {
            ...secondaryCurrency_config2,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    if (riderId) {
        secondaryCurrency_config2.deliveryBoy = ObjectId(riderId);
    }

    const secondaryCurrency_cashInHandRemoveQuery =
        await TransactionModel.aggregate([
            {
                $match: secondaryCurrency_config2,
            },
            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    secondaryCurrency_amount_bc: {
                        $sum: { $sum: ['$amount'] },
                    },
                    secondaryCurrency_amount: {
                        $sum: { $sum: ['$secondaryCurrency_amount'] },
                    },
                },
            },
        ]);
    const secondaryCurrency_cashInHandRemove =
        secondaryCurrency_cashInHandRemoveQuery[0]
            ? secondaryCurrency_cashInHandRemoveQuery[0]
                  .secondaryCurrency_amount
            : 0;
    const secondaryCurrency_cashInHandRemove_bc =
        secondaryCurrency_cashInHandRemoveQuery[0]
            ? secondaryCurrency_cashInHandRemoveQuery[0]
                  .secondaryCurrency_amount_bc
            : 0;

    const riderCashInHand = cashInHandAdd - baseCurrency_cashInHandRemove;
    const secondaryCurrency_riderCashInHand =
        secondaryCurrency_cashInHandAdd - secondaryCurrency_cashInHandRemove;
    const riderCashInHand_sc =
        cashInHandAdd_sc - baseCurrency_cashInHandRemove_sc;
    const secondaryCurrency_riderCashInHand_bc =
        secondaryCurrency_cashInHandAdd_bc -
        secondaryCurrency_cashInHandRemove_bc;

    return {
        riderCashInHand,
        secondaryCurrency_riderCashInHand,
        riderCashInHand_sc,
        secondaryCurrency_riderCashInHand_bc,
    };
};

exports.getRiderAddRemoveCredit = async ({
    id,
    startDate,
    endDate,
    paidCurrency,
    transactionIds,
}) => {
    let commonConfig = { account: 'deliveryBoy', status: 'success' };

    if (id) {
        commonConfig = {
            ...commonConfig,
            deliveryBoy: ObjectId(id),
        };
    }

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (transactionIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: transactionIds },
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    let config = {
        ...commonConfig,
        type: {
            $in: ['adminAddBalanceRider'],
        },
    };

    const creditAddQuery = await TransactionModel.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const creditAdd = creditAddQuery.length > 0 ? creditAddQuery[0].amount : 0;
    const secondaryCurrency_creditAdd =
        creditAddQuery.length > 0
            ? creditAddQuery[0].secondaryCurrency_amount
            : 0;

    let config1 = {
        ...commonConfig,
        type: {
            $in: ['adminRemoveBalanceRider'],
        },
    };

    const creditRemoveQuery = await TransactionModel.aggregate([
        {
            $match: config1,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const creditRemove =
        creditRemoveQuery.length > 0 ? creditRemoveQuery[0].amount : 0;
    const secondaryCurrency_creditRemove =
        creditRemoveQuery.length > 0
            ? creditRemoveQuery[0].secondaryCurrency_amount
            : 0;

    const totalAddRemoveCredit = creditAdd - creditRemove;
    const secondaryCurrency_totalAddRemoveCredit =
        secondaryCurrency_creditAdd - secondaryCurrency_creditRemove;

    return { totalAddRemoveCredit, secondaryCurrency_totalAddRemoveCredit };
};

exports.getRiderWeeklyReward = async ({
    id,
    startDate,
    endDate,
    paidCurrency,
    transactionIds,
}) => {
    let commonConfig = {
        account: 'deliveryBoy',
        type: 'riderGetWeeklyReward',
        status: 'success',
    };

    if (id) {
        commonConfig = {
            ...commonConfig,
            deliveryBoy: ObjectId(id),
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (transactionIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: transactionIds },
        };
    }

    const riderWeeklyRewardQuery = await TransactionModel.aggregate([
        {
            $match: commonConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const riderWeeklyReward =
        riderWeeklyRewardQuery.length > 0
            ? riderWeeklyRewardQuery[0].amount
            : 0;
    const secondaryCurrency_riderWeeklyReward =
        riderWeeklyRewardQuery.length > 0
            ? riderWeeklyRewardQuery[0].secondaryCurrency_amount
            : 0;

    return { riderWeeklyReward, secondaryCurrency_riderWeeklyReward };
};

// exports.getSalesManagerMonthlyReward = async ({
//     id,
//     startDate,
//     endDate,
//     paidCurrency,
//     transactionIds,
// }) => {
//     let commonConfig = {
//         account: 'admin',
//         type: 'salesManagerGetMonthlyReward',
//         status: 'success',
//     };

//     if (id) {
//         commonConfig = {
//             ...commonConfig,
//             admin: ObjectId(id),
//         };
//     }

//     if (startDate) {
//         commonConfig = {
//             ...commonConfig,
//             createdAt: {
//                 $gte: new Date(startDate),
//                 $lt: new Date(
//                     moment(endDate ? new Date(endDate) : new Date()).add(
//                         1,
//                         'days'
//                     )
//                 ),
//             },
//         };
//     }

//     if (paidCurrency) {
//         commonConfig = {
//             ...commonConfig,
//             paidCurrency: paidCurrency,
//         };
//     }

//     if (transactionIds) {
//         commonConfig = {
//             ...commonConfig,
//             _id: { $in: transactionIds },
//         };
//     }

//     const salesManagerMonthlyRewardQuery = await TransactionModel.aggregate([
//         {
//             $match: commonConfig,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//                 secondaryCurrency_amount: {
//                     $sum: { $sum: ['$secondaryCurrency_amount'] },
//                 },
//             },
//         },
//     ]);

//     const salesManagerMonthlyReward =
//         salesManagerMonthlyRewardQuery.length > 0
//             ? salesManagerMonthlyRewardQuery[0].amount
//             : 0;
//     const secondaryCurrency_salesManagerMonthlyReward =
//         salesManagerMonthlyRewardQuery.length > 0
//             ? salesManagerMonthlyRewardQuery[0].secondaryCurrency_amount
//             : 0;

//     return {
//         salesManagerMonthlyReward,
//         secondaryCurrency_salesManagerMonthlyReward,
//     };
// };

exports.getTotalErrorCharge = async ({
    type,
    id,
    startDate,
    endDate,
    account,
    orderType,
    paidCurrency,
    transactionIds,
}) => {
    let commonConfig = {};

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }
    if (transactionIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: transactionIds },
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    let addErrorChargeConfig = {};
    if (account === 'shop') {
        addErrorChargeConfig = {
            ...commonConfig,
            account: 'shop',
            type: {
                $in: ['replacementOrderShopCut', 'shopEndorseLoss'],
            },
        };
    }
    if (account === 'admin') {
        addErrorChargeConfig = {
            ...commonConfig,
            account: 'admin',
            type: {
                $in: ['replacementOrderAdminCut', 'adminEndorseLoss'],
            },
        };
    }

    const addErrorChargeQuery = await TransactionModel.aggregate([
        {
            $match: addErrorChargeConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const addErrorCharge =
        addErrorChargeQuery.length > 0 ? addErrorChargeQuery[0].amount : 0;
    const secondaryCurrency_addErrorCharge =
        addErrorChargeQuery.length > 0
            ? addErrorChargeQuery[0].secondaryCurrency_amount
            : 0;

    let removeErrorChargeConfig = {};
    if (account === 'shop') {
        removeErrorChargeConfig = {
            ...commonConfig,
            account: 'shop',
            type: {
                $in: ['shopGetForCancelReplacementOrder'],
            },
        };
    }
    if (account === 'admin') {
        removeErrorChargeConfig = {
            ...commonConfig,
            account: 'admin',
            type: {
                $in: ['adminGetForCancelReplacementOrder'],
            },
        };
    }

    const removeErrorChargeQuery = await TransactionModel.aggregate([
        {
            $match: removeErrorChargeConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const removeErrorCharge =
        removeErrorChargeQuery.length > 0
            ? removeErrorChargeQuery[0].amount
            : 0;
    const secondaryCurrency_removeErrorCharge =
        removeErrorChargeQuery.length > 0
            ? removeErrorChargeQuery[0].secondaryCurrency_amount
            : 0;

    const totalErrorCharge = addErrorCharge - removeErrorCharge;
    const secondaryCurrency_totalErrorCharge =
        secondaryCurrency_addErrorCharge - secondaryCurrency_removeErrorCharge;

    return {
        totalErrorCharge,
        secondaryCurrency_totalErrorCharge,
    };
};

exports.getTotalReplacementOrder = async ({
    type,
    id,
    startDate,
    endDate,
    account,
    orderType,
    paidCurrency,
    transactionIds,
}) => {
    let commonConfig = {};

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }
    if (transactionIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: transactionIds },
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    let addReplacementOrderConfig = {};
    if (account === 'shop') {
        addReplacementOrderConfig = {
            ...commonConfig,
            account: 'shop',
            type: {
                $in: ['replacementOrderShopCut'],
            },
        };
    }
    if (account === 'admin') {
        addReplacementOrderConfig = {
            ...commonConfig,
            account: 'admin',
            type: {
                $in: ['replacementOrderAdminCut'],
            },
        };
    }

    const addReplacementOrderQuery = await TransactionModel.aggregate([
        {
            $match: addReplacementOrderConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const addReplacementOrder =
        addReplacementOrderQuery.length > 0
            ? addReplacementOrderQuery[0].amount
            : 0;
    const secondaryCurrency_addReplacementOrder =
        addReplacementOrderQuery.length > 0
            ? addReplacementOrderQuery[0].secondaryCurrency_amount
            : 0;

    let removeReplacementOrderConfig = {};
    if (account === 'shop') {
        removeReplacementOrderConfig = {
            ...commonConfig,
            account: 'shop',
            type: {
                $in: ['shopGetForCancelReplacementOrder'],
            },
        };
    }
    if (account === 'admin') {
        removeReplacementOrderConfig = {
            ...commonConfig,
            account: 'admin',
            type: {
                $in: ['adminGetForCancelReplacementOrder'],
            },
        };
    }

    const removeReplacementOrderQuery = await TransactionModel.aggregate([
        {
            $match: removeReplacementOrderConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const removeReplacementOrder =
        removeReplacementOrderQuery.length > 0
            ? removeReplacementOrderQuery[0].amount
            : 0;
    const secondaryCurrency_removeReplacementOrder =
        removeReplacementOrderQuery.length > 0
            ? removeReplacementOrderQuery[0].secondaryCurrency_amount
            : 0;

    const totalReplacementOrder = addReplacementOrder - removeReplacementOrder;
    const secondaryCurrency_totalReplacementOrder =
        secondaryCurrency_addReplacementOrder -
        secondaryCurrency_removeReplacementOrder;

    return {
        totalReplacementOrder,
        secondaryCurrency_totalReplacementOrder,
    };
};

exports.getTotalEndureLoss = async ({
    type,
    id,
    startDate,
    endDate,
    account,
    orderType,
    paidCurrency,
    transactionIds,
}) => {
    let commonConfig = {};

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (orderType) {
        commonConfig = {
            ...commonConfig,
            orderType,
        };
    }
    if (transactionIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: transactionIds },
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    let endureLossConfig = {};
    if (account === 'shop') {
        endureLossConfig = {
            ...commonConfig,
            account: 'shop',
            type: {
                $in: ['shopEndorseLoss'],
            },
        };
    }
    if (account === 'admin') {
        endureLossConfig = {
            ...commonConfig,
            account: 'admin',
            type: {
                $in: ['adminEndorseLoss'],
            },
        };
    }

    const endureLossQuery = await TransactionModel.aggregate([
        {
            $match: endureLossConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const totalEndureLoss =
        endureLossQuery.length > 0 ? endureLossQuery[0].amount : 0;
    const secondaryCurrency_totalEndureLoss =
        endureLossQuery.length > 0
            ? endureLossQuery[0].secondaryCurrency_amount
            : 0;

    return {
        totalEndureLoss,
        secondaryCurrency_totalEndureLoss,
    };
};

exports.getOrderPendingAmount = async (req, res) => {
    try {
        const { orderType } = req.query;

        const totalValueQuery = await OrderModel.aggregate([
            {
                $match: {
                    orderStatus: {
                        $in: [
                            'placed',
                            'accepted_delivery_boy',
                            'preparing',
                            'ready_to_pickup',
                            'order_on_the_way',
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    baseCurrency_productAmount: {
                        $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
                    },
                    secondaryCurrency_productAmount: {
                        $sum: {
                            $sum: ['$summary.secondaryCurrency_productAmount'],
                        },
                    },
                    baseCurrency_totalDiscount: {
                        $sum: { $sum: ['$summary.baseCurrency_discount'] },
                    },
                    secondaryCurrency_totalDiscount: {
                        $sum: { $sum: ['$summary.secondaryCurrency_discount'] },
                    },
                    baseCurrency_shopDiscount: {
                        $sum: { $sum: ['$discountCut.discountShopCut'] },
                    },
                    secondaryCurrency_shopDiscount: {
                        $sum: {
                            $sum: [
                                '$discountCut.secondaryCurrency_discountShopCut',
                            ],
                        },
                    },
                    baseCurrency_adminDiscount: {
                        $sum: { $sum: ['$discountCut.discountAdminCut'] },
                    },
                    secondaryCurrency_adminDiscount: {
                        $sum: {
                            $sum: [
                                '$discountCut.secondaryCurrency_discountAdminCut',
                            ],
                        },
                    },
                    baseCurrency_totalRewardAmount: {
                        $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
                    },
                    secondaryCurrency_totalRewardAmount: {
                        $sum: {
                            $sum: ['$summary.reward.secondaryCurrency_amount'],
                        },
                    },
                    baseCurrency_shopRewardAmount: {
                        $sum: { $sum: ['$rewardRedeemCut.rewardShopCut'] },
                    },
                    secondaryCurrency_shopRewardAmount: {
                        $sum: {
                            $sum: [
                                '$rewardRedeemCut.secondaryCurrency_rewardShopCut',
                            ],
                        },
                    },
                    baseCurrency_adminRewardAmount: {
                        $sum: { $sum: ['$rewardRedeemCut.rewardAdminCut'] },
                    },
                    secondaryCurrency_adminRewardAmount: {
                        $sum: {
                            $sum: [
                                '$rewardRedeemCut.secondaryCurrency_rewardAdminCut',
                            ],
                        },
                    },
                    // Points cashback, shop get back loyalty amount adminCut
                    baseCurrency_pointsCashback: {
                        $sum: { $sum: ['$baseCurrency_rewardRedeemCashback'] },
                    },
                    secondaryCurrency_pointsCashback: {
                        $sum: {
                            $sum: ['$secondaryCurrency_rewardRedeemCashback'],
                        },
                    },
                    baseCurrency_totalDoubleMenuItemPrice: {
                        $sum: {
                            $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
                        },
                    },
                    secondaryCurrency_totalDoubleMenuItemPrice: {
                        $sum: {
                            $sum: [
                                '$summary.secondaryCurrency_doubleMenuItemPrice',
                            ],
                        },
                    },
                    baseCurrency_shopDoubleMenuItemPrice: {
                        $sum: {
                            $sum: [
                                '$doubleMenuItemPrice.doubleMenuItemPriceShop',
                            ],
                        },
                    },
                    secondaryCurrency_shopDoubleMenuItemPrice: {
                        $sum: {
                            $sum: [
                                '$doubleMenuItemPrice.secondaryCurrency_doubleMenuItemPriceShop',
                            ],
                        },
                    },
                    baseCurrency_adminDoubleMenuItemPrice: {
                        $sum: {
                            $sum: [
                                '$doubleMenuItemPrice.doubleMenuItemPriceAdmin',
                            ],
                        },
                    },
                    secondaryCurrency_adminDoubleMenuItemPrice: {
                        $sum: {
                            $sum: [
                                '$doubleMenuItemPrice.secondaryCurrency_doubleMenuItemPriceAdmin',
                            ],
                        },
                    },
                    baseCurrency_shopDoubleMenuCut: {
                        $sum: { $sum: ['$doubleMenuCut.doubleMenuShopCut'] },
                    },
                    secondaryCurrency_shopDoubleMenuCut: {
                        $sum: {
                            $sum: [
                                '$doubleMenuCut.secondaryCurrency_doubleMenuShopCut',
                            ],
                        },
                    },
                    baseCurrency_adminDoubleMenuCut: {
                        $sum: { $sum: ['$doubleMenuCut.doubleMenuAdminCut'] },
                    },
                    secondaryCurrency_adminDoubleMenuCut: {
                        $sum: {
                            $sum: [
                                '$doubleMenuCut.secondaryCurrency_doubleMenuAdminCut',
                            ],
                        },
                    },
                    baseCurrency_totalCouponDiscount: {
                        $sum: {
                            $sum: [
                                '$summary.baseCurrency_couponDiscountAmount',
                            ],
                        },
                    },
                    secondaryCurrency_totalCouponAdminCut: {
                        $sum: {
                            $sum: [
                                '$summary.secondaryCurrency_couponDiscountAmount',
                            ],
                        },
                    },
                    baseCurrency_totalAmount: {
                        $sum: { $sum: ['$summary.baseCurrency_totalAmount'] },
                    },
                    secondaryCurrency_totalAmount: {
                        $sum: {
                            $sum: ['$summary.secondaryCurrency_totalAmount'],
                        },
                    },
                    baseCurrency_totalVat: {
                        $sum: { $sum: ['$summary.baseCurrency_vat'] },
                    },
                    secondaryCurrency_totalVat: {
                        $sum: {
                            $sum: ['$summary.secondaryCurrency_vat'],
                        },
                    },
                    baseCurrency_shopVat: {
                        $sum: { $sum: ['$vatAmount.baseCurrency_vatForShop'] },
                    },
                    secondaryCurrency_shopVat: {
                        $sum: {
                            $sum: ['$vatAmount.secondaryCurrency_vatForShop'],
                        },
                    },
                    baseCurrency_adminVat: {
                        $sum: { $sum: ['$vatAmount.baseCurrency_vatForAdmin'] },
                    },
                    secondaryCurrency_adminVat: {
                        $sum: {
                            $sum: ['$vatAmount.secondaryCurrency_vatForAdmin'],
                        },
                    },
                    baseCurrency_freeDeliveryShopCut: {
                        $sum: {
                            $sum: [
                                '$freeDeliveryCut.baseCurrency_freeDeliveryShopCut',
                            ],
                        },
                    },
                    secondaryCurrency_freeDeliveryShopCut: {
                        $sum: {
                            $sum: [
                                '$freeDeliveryCut.secondaryCurrency_freeDeliveryShopCut',
                            ],
                        },
                    },
                    baseCurrency_freeDeliveryAdminCut: {
                        $sum: {
                            $sum: [
                                '$freeDeliveryCut.baseCurrency_freeDeliveryAdminCut',
                            ],
                        },
                    },
                    secondaryCurrency_freeDeliveryAdminCut: {
                        $sum: {
                            $sum: [
                                '$freeDeliveryCut.secondaryCurrency_freeDeliveryAdminCut',
                            ],
                        },
                    },
                    baseCurrency_shopEarnings: {
                        $sum: { $sum: ['$baseCurrency_shopEarnings'] },
                    },
                    secondaryCurrency_shopEarnings: {
                        $sum: { $sum: ['$secondaryCurrency_shopEarnings'] },
                    },

                    baseCurrency_totalDeliveryFee: {
                        $sum: { $sum: ['$summary.baseCurrency_riderFee'] },
                    },
                    secondaryCurrency_totalDeliveryFee: {
                        $sum: { $sum: ['$summary.secondaryCurrency_riderFee'] },
                    },
                    baseCurrency_riderTip: {
                        $sum: { $sum: ['$summary.baseCurrency_riderTip'] },
                    },
                    secondaryCurrency_riderTip: {
                        $sum: { $sum: ['$summary.secondaryCurrency_riderTip'] },
                    },
                    baseCurrency_riderFeeWithFreeDelivery: {
                        $sum: {
                            $sum: [
                                '$summary.baseCurrency_riderFeeWithFreeDelivery',
                            ],
                        },
                    },
                    secondaryCurrency_riderFeeWithFreeDelivery: {
                        $sum: {
                            $sum: [
                                '$summary.secondaryCurrency_riderFeeWithFreeDelivery',
                            ],
                        },
                    },
                    baseCurrency_adminOrderEarnings: {
                        $sum: {
                            $sum: [
                                '$adminCharge.baseCurrency_adminChargeFromOrder',
                            ],
                        },
                    },
                    secondaryCurrency_adminOrderEarnings: {
                        $sum: {
                            $sum: [
                                '$adminCharge.secondaryCurrency_adminChargeFromOrder',
                            ],
                        },
                    },
                    baseCurrency_adminRiderEarnings: {
                        $sum: {
                            $sum: [
                                '$adminCharge.baseCurrency_adminChargeFromDelivery',
                            ],
                        },
                    },
                    secondaryCurrency_adminRiderEarnings: {
                        $sum: {
                            $sum: [
                                '$adminCharge.secondaryCurrency_adminChargeFromDelivery',
                            ],
                        },
                    },
                    baseCurrency_adminEarnings: {
                        $sum: {
                            $sum: [
                                '$adminCharge.baseCurrency_totalAdminCharge',
                            ],
                        },
                    },
                    secondaryCurrency_adminEarnings: {
                        $sum: {
                            $sum: [
                                '$adminCharge.secondaryCurrency_totalAdminCharge',
                            ],
                        },
                    },
                    baseCurrency_riderEarnings: {
                        $sum: { $sum: ['$baseCurrency_riderFee'] },
                    },
                    secondaryCurrency_riderEarnings: {
                        $sum: { $sum: ['$secondaryCurrency_riderFee'] },
                    },
                },
            },
        ]);
        if (totalValueQuery.length < 1) {
            totalValueQuery.push({
                baseCurrency_productAmount: 0,
                secondaryCurrency_productAmount: 0,
                baseCurrency_totalDiscount: 0,
                secondaryCurrency_totalDiscount: 0,
                baseCurrency_shopDiscount: 0,
                secondaryCurrency_shopDiscount: 0,
                baseCurrency_adminDiscount: 0,
                secondaryCurrency_adminDiscount: 0,
                baseCurrency_totalRewardAmount: 0,
                secondaryCurrency_totalRewardAmount: 0,
                baseCurrency_shopRewardAmount: 0,
                secondaryCurrency_shopRewardAmount: 0,
                baseCurrency_adminRewardAmount: 0,
                secondaryCurrency_adminRewardAmount: 0,
                baseCurrency_pointsCashback: 0,
                secondaryCurrency_pointsCashback: 0,
                baseCurrency_totalDoubleMenuItemPrice: 0,
                secondaryCurrency_totalDoubleMenuItemPrice: 0,
                baseCurrency_shopDoubleMenuItemPrice: 0,
                secondaryCurrency_shopDoubleMenuItemPrice: 0,
                baseCurrency_adminDoubleMenuItemPrice: 0,
                secondaryCurrency_adminDoubleMenuItemPrice: 0,
                baseCurrency_shopDoubleMenuCut: 0,
                secondaryCurrency_shopDoubleMenuCut: 0,
                baseCurrency_adminDoubleMenuCut: 0,
                secondaryCurrency_adminDoubleMenuCut: 0,
                baseCurrency_totalCouponDiscount: 0,
                secondaryCurrency_totalCouponAdminCut: 0,
                baseCurrency_totalAmount: 0,
                secondaryCurrency_totalAmount: 0,
                baseCurrency_totalVat: 0,
                secondaryCurrency_totalVat: 0,
                baseCurrency_shopVat: 0,
                secondaryCurrency_shopVat: 0,
                baseCurrency_adminVat: 0,
                secondaryCurrency_adminVat: 0,
                baseCurrency_freeDeliveryShopCut: 0,
                secondaryCurrency_freeDeliveryShopCut: 0,
                baseCurrency_freeDeliveryAdminCut: 0,
                secondaryCurrency_freeDeliveryAdminCut: 0,
                baseCurrency_shopEarnings: 0,
                secondaryCurrency_shopEarnings: 0,
                baseCurrency_totalDeliveryFee: 0,
                secondaryCurrency_totalDeliveryFee: 0,
                baseCurrency_riderTip: 0,
                secondaryCurrency_riderTip: 0,
                baseCurrency_riderFeeWithFreeDelivery: 0,
                secondaryCurrency_riderFeeWithFreeDelivery: 0,
                baseCurrency_adminOrderEarnings: 0,
                secondaryCurrency_adminOrderEarnings: 0,
                baseCurrency_adminRiderEarnings: 0,
                secondaryCurrency_adminRiderEarnings: 0,
                baseCurrency_adminEarnings: 0,
                secondaryCurrency_adminEarnings: 0,
                baseCurrency_riderEarnings: 0,
                secondaryCurrency_riderEarnings: 0,
            });
        }

        const totalButlerValueQuery = await ButlerModel.aggregate([
            {
                $match: {
                    orderStatus: {
                        $in: [
                            'placed',
                            'accepted_delivery_boy',
                            'order_on_the_way',
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    baseCurrency_butlerDeliveryFee: {
                        $sum: {
                            $sum: ['$summary.baseCurrency_riderFee'],
                        },
                    },
                    secondaryCurrency_butlerDeliveryFee: {
                        $sum: {
                            $sum: ['$summary.secondaryCurrency_riderFee'],
                        },
                    },
                    baseCurrency_butlerVat: {
                        $sum: {
                            $sum: ['$summary.baseCurrency_vat'],
                        },
                    },
                    secondaryCurrency_butlerVat: {
                        $sum: {
                            $sum: ['$summary.secondaryCurrency_vat'],
                        },
                    },
                    baseCurrency_butlerRiderEarnings: {
                        $sum: {
                            $sum: ['$baseCurrency_riderFee'],
                        },
                    },
                    secondaryCurrency_butlerRiderEarnings: {
                        $sum: {
                            $sum: ['$secondaryCurrency_riderFee'],
                        },
                    },
                    baseCurrency_adminButlerProfit: {
                        $sum: {
                            $sum: [
                                '$adminCharge.baseCurrency_adminChargeFromDelivery',
                            ],
                        },
                    },
                    secondaryCurrency_adminButlerProfit: {
                        $sum: {
                            $sum: [
                                '$adminCharge.secondaryCurrency_adminChargeFromDelivery',
                            ],
                        },
                    },
                },
            },
        ]);
        if (totalButlerValueQuery.length < 1) {
            totalButlerValueQuery.push({
                baseCurrency_butlerDeliveryFee: 0,
                secondaryCurrency_butlerDeliveryFee: 0,
                secondaryCurrency_butlerVat: 0,
                baseCurrency_butlerVat: 0,
                baseCurrency_butlerRiderEarnings: 0,
                secondaryCurrency_butlerRiderEarnings: 0,
                baseCurrency_adminButlerProfit: 0,
                secondaryCurrency_adminButlerProfit: 0,
            });
        }

        const normalOngoingOrderCount = await OrderModel.countDocuments({
            orderStatus: {
                $in: [
                    'placed',
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            },
        });
        const butlerOngoingOrderCount = await ButlerModel.countDocuments({
            orderStatus: {
                $in: ['placed', 'accepted_delivery_boy', 'order_on_the_way'],
            },
        });

        const totalOngoingOrder =
            normalOngoingOrderCount + butlerOngoingOrderCount;

        const totalOngoingOrderAmount =
            totalValueQuery[0].baseCurrency_totalAmount +
            totalValueQuery[0].baseCurrency_totalVat +
            totalValueQuery[0].baseCurrency_riderTip -
            totalValueQuery[0].baseCurrency_totalDiscount -
            totalValueQuery[0].baseCurrency_totalRewardAmount -
            totalValueQuery[0].baseCurrency_totalCouponDiscount +
            totalButlerValueQuery[0].baseCurrency_butlerDeliveryFee +
            totalButlerValueQuery[0].baseCurrency_butlerVat;

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                totalOngoingOrder,
                totalOngoingOrderAmount,
                ...totalValueQuery[0],
                ...totalButlerValueQuery[0],
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSubscriptionEarning = async ({
    startDate,
    endDate,
    paidCurrency,
}) => {
    let commonConfig = {
        paymentStatus: 'paid',
    };

    if (paidCurrency) {
        commonConfig.paidCurrency = paidCurrency;
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const subscriptionEarningQuery = await SubscriptionModel.aggregate([
        {
            $match: commonConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                baseCurrency_subscriptionFee: {
                    $sum: { $sum: ['$baseCurrency_subscriptionFee'] },
                },
                secondaryCurrency_subscriptionFee: {
                    $sum: { $sum: ['$secondaryCurrency_subscriptionFee'] },
                },
            },
        },
    ]);

    if (subscriptionEarningQuery.length < 1) {
        subscriptionEarningQuery.push({
            baseCurrency_subscriptionFee: 0,
            secondaryCurrency_subscriptionFee: 0,
        });
    }

    return { ...subscriptionEarningQuery[0] };
};

exports.getSubscriptionSpent = async ({
    startDate,
    endDate,
    paidCurrency,
    userId,
    subscriptionId,
}) => {
    let commonConfig = {
        orderStatus: 'delivered',
        subscription: { $exists: true },
    };

    if (paidCurrency) {
        commonConfig.paidCurrency = paidCurrency;
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    if (userId) {
        commonConfig.user = ObjectId(userId);
    }

    if (subscriptionId) {
        commonConfig.subscription = ObjectId(subscriptionId);
    }

    const subscriptionSpentQuery = await OrderModel.aggregate([
        {
            $match: commonConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                baseCurrency_discount: {
                    $sum: { $sum: ['$subscriptionLoss.baseCurrency_discount'] },
                },
                secondaryCurrency_discount: {
                    $sum: {
                        $sum: ['$subscriptionLoss.secondaryCurrency_discount'],
                    },
                },
                baseCurrency_doubleMenuDiscount: {
                    $sum: {
                        $sum: [
                            '$subscriptionLoss.baseCurrency_doubleMenuDiscount',
                        ],
                    },
                },
                secondaryCurrency_doubleMenuDiscount: {
                    $sum: {
                        $sum: [
                            '$subscriptionLoss.secondaryCurrency_doubleMenuDiscount',
                        ],
                    },
                },
                baseCurrency_doubleMenuLoss: {
                    $sum: {
                        $sum: ['$subscriptionLoss.baseCurrency_doubleMenuLoss'],
                    },
                },
                secondaryCurrency_doubleMenuLoss: {
                    $sum: {
                        $sum: [
                            '$subscriptionLoss.secondaryCurrency_doubleMenuLoss',
                        ],
                    },
                },
                baseCurrency_freeDelivery: {
                    $sum: {
                        $sum: ['$subscriptionLoss.baseCurrency_freeDelivery'],
                    },
                },
                secondaryCurrency_freeDelivery: {
                    $sum: {
                        $sum: [
                            '$subscriptionLoss.secondaryCurrency_freeDelivery',
                        ],
                    },
                },
            },
        },
    ]);

    if (subscriptionSpentQuery.length < 1) {
        subscriptionSpentQuery.push({
            baseCurrency_discount: 0,
            secondaryCurrency_discount: 0,
            baseCurrency_doubleMenuDiscount: 0,
            secondaryCurrency_doubleMenuDiscount: 0,
            baseCurrency_doubleMenuLoss: 0,
            secondaryCurrency_doubleMenuLoss: 0,
            baseCurrency_freeDelivery: 0,
            secondaryCurrency_freeDelivery: 0,
        });
    }

    return { ...subscriptionSpentQuery[0] };
};

//*** Calc financial separately ***/
exports.getTotalAdminProfit = async (startDate, endDate, paidCurrency) => {
    try {
        //*** Calc total order profit start ***/
        const {
            adminFees: orderProfitFromRestaurant,
            secondaryCurrency_adminFees:
                secondaryCurrency_orderProfitFromRestaurant,
        } = await this.getAdminEarning({
            startDate,
            endDate,
            orderType: 'food',
        });
        const {
            adminFees: orderProfitFromGrocery,
            secondaryCurrency_adminFees:
                secondaryCurrency_orderProfitFromGrocery,
        } = await this.getAdminEarning({
            startDate,
            endDate,
            orderType: 'grocery',
        });
        const {
            adminFees: orderProfitFromPharmacy,
            secondaryCurrency_adminFees:
                secondaryCurrency_orderProfitFromPharmacy,
        } = await this.getAdminEarning({
            startDate,
            endDate,
            orderType: 'pharmacy',
        });

        const totalOrderProfit =
            orderProfitFromRestaurant +
            orderProfitFromGrocery +
            orderProfitFromPharmacy;
        const secondaryCurrency_totalOrderProfit =
            secondaryCurrency_orderProfitFromRestaurant +
            secondaryCurrency_orderProfitFromGrocery +
            secondaryCurrency_orderProfitFromPharmacy;
        //*** Calc total order profit end ***/

        //*** Calc total delivery profit start ***/
        const {
            adminDeliveryProfit: deliveryProfitFromRestaurant,
            secondaryCurrency_adminDeliveryProfit:
                secondaryCurrency_deliveryProfitFromRestaurant,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
            orderType: 'food',
        });

        const {
            adminDeliveryProfit: deliveryProfitFromGrocery,
            secondaryCurrency_adminDeliveryProfit:
                secondaryCurrency_deliveryProfitFromGrocery,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
            orderType: 'grocery',
        });
        const {
            adminDeliveryProfit: deliveryProfitFromPharmacy,
            secondaryCurrency_adminDeliveryProfit:
                secondaryCurrency_deliveryProfitFromPharmacy,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
            orderType: 'pharmacy',
        });

        const {
            adminButlerProfit: deliveryProfitFromButler,
            secondaryCurrency_adminButlerProfit:
                secondaryCurrency_deliveryProfitFromButler,
        } = await this.getButlerFinancial({
            startDate,
            endDate,
        });

        const totalDeliveryProfit =
            deliveryProfitFromRestaurant +
            deliveryProfitFromGrocery +
            deliveryProfitFromPharmacy +
            deliveryProfitFromButler;
        const secondaryCurrency_totalDeliveryProfit =
            secondaryCurrency_deliveryProfitFromRestaurant +
            secondaryCurrency_deliveryProfitFromGrocery +
            secondaryCurrency_deliveryProfitFromPharmacy +
            secondaryCurrency_deliveryProfitFromButler;
        //*** Calc total delivery profit end ***/

        //*** Calc total refund start ***/
        const {
            refundAmount: refundFromRestaurant,
            baseCurrency_adminDeliveryRefund: deliveryRefundFromRestaurant,
            secondaryCurrency_refundAmount:
                secondaryCurrency_refundFromRestaurant,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_deliveryRefundFromRestaurant,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'food',
        });
        const {
            refundAmount: refundFromGrocery,
            baseCurrency_adminDeliveryRefund: deliveryRefundFromGrocery,
            secondaryCurrency_refundAmount: secondaryCurrency_refundFromGrocery,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_deliveryRefundFromGrocery,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'grocery',
        });
        const {
            refundAmount: refundFromPharmacy,
            baseCurrency_adminDeliveryRefund: deliveryRefundFromPharmacy,
            secondaryCurrency_refundAmount:
                secondaryCurrency_refundFromPharmacy,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_deliveryRefundFromPharmacy,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'pharmacy',
        });

        const refundFromDelivery =
            deliveryRefundFromRestaurant +
            deliveryRefundFromGrocery +
            deliveryRefundFromPharmacy;
        const secondaryCurrency_refundFromDelivery =
            secondaryCurrency_deliveryRefundFromRestaurant +
            secondaryCurrency_deliveryRefundFromGrocery +
            secondaryCurrency_deliveryRefundFromPharmacy;
        const totalRefund =
            refundFromRestaurant +
            refundFromGrocery +
            refundFromPharmacy +
            refundFromDelivery;
        const secondaryCurrency_totalRefund =
            secondaryCurrency_refundFromRestaurant +
            secondaryCurrency_refundFromGrocery +
            secondaryCurrency_refundFromPharmacy +
            secondaryCurrency_refundFromDelivery;
        //*** Calc total refund end ***/

        //*** Calc featured amount end ***/
        const {
            featuredAmount: featuredAmountFromRestaurant,
            secondaryCurrency_featuredAmount:
                secondaryCurrency_featuredAmountFromRestaurant,
        } = await this.getFeaturedAmount({
            startDate,
            endDate,
            orderType: 'food',
        });
        const {
            featuredAmount: featuredAmountFromGrocery,
            secondaryCurrency_featuredAmount:
                secondaryCurrency_featuredAmountFromGrocery,
        } = await this.getFeaturedAmount({
            startDate,
            endDate,
            orderType: 'grocery',
        });
        const {
            featuredAmount: featuredAmountFromPharmacy,
            secondaryCurrency_featuredAmount:
                secondaryCurrency_featuredAmountFromPharmacy,
        } = await this.getFeaturedAmount({
            startDate,
            endDate,
            orderType: 'pharmacy',
        });

        const totalFeaturedAmount =
            featuredAmountFromRestaurant +
            featuredAmountFromGrocery +
            featuredAmountFromPharmacy;
        const secondaryCurrency_totalFeaturedAmount =
            secondaryCurrency_featuredAmountFromRestaurant +
            secondaryCurrency_featuredAmountFromGrocery +
            secondaryCurrency_featuredAmountFromPharmacy;

        //*** Calc featured amount end ***/

        //*** Calc admin pay start ***/
        const {
            totalAdminPay: adminPay,
            secondaryCurrency_totalAdminPay: secondaryCurrency_adminPay,
        } = await this.getAdminPay({
            startDate,
            endDate,
        });
        //*** Calc admin pay end ***/

        //*** Calc add remove credit start ***/
        const {
            totalAddRemoveCredit: addRemoveCreditFromRestaurant,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_addRemoveCreditFromRestaurant,
        } = await this.getShopAddRemoveCredit({
            startDate,
            endDate,
            orderType: 'food',
        });
        const {
            totalAddRemoveCredit: addRemoveCreditFromGrocery,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_addRemoveCreditFromGrocery,
        } = await this.getShopAddRemoveCredit({
            startDate,
            endDate,
            orderType: 'grocery',
        });
        const {
            totalAddRemoveCredit: addRemoveCreditFromPharmacy,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_addRemoveCreditFromPharmacy,
        } = await this.getShopAddRemoveCredit({
            startDate,
            endDate,
            orderType: 'pharmacy',
        });

        const {
            totalAddRemoveCredit: addRemoveCreditFromRider,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_addRemoveCreditFromRider,
        } = await this.getRiderAddRemoveCredit({
            startDate,
            endDate,
        });

        const totalAddRemoveCredit =
            addRemoveCreditFromRestaurant +
            addRemoveCreditFromGrocery +
            addRemoveCreditFromPharmacy +
            addRemoveCreditFromRider;
        const secondaryCurrency_totalAddRemoveCredit =
            secondaryCurrency_addRemoveCreditFromRestaurant +
            secondaryCurrency_addRemoveCreditFromGrocery +
            secondaryCurrency_addRemoveCreditFromPharmacy +
            secondaryCurrency_addRemoveCreditFromRider;
        //*** Calc add remove credit end ***/

        //*** Calc error charge start ***/
        const {
            totalErrorCharge: errorChargeFromRestaurant,
            secondaryCurrency_totalErrorCharge:
                secondaryCurrency_errorChargeFromRestaurant,
        } = await this.getTotalErrorCharge({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'food',
        });
        const {
            totalErrorCharge: errorChargeFromGrocery,
            secondaryCurrency_totalErrorCharge:
                secondaryCurrency_errorChargeFromGrocery,
        } = await this.getTotalErrorCharge({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'grocery',
        });
        const {
            totalErrorCharge: errorChargeFromPharmacy,
            secondaryCurrency_totalErrorCharge:
                secondaryCurrency_errorChargeFromPharmacy,
        } = await this.getTotalErrorCharge({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'pharmacy',
        });

        const totalErrorCharge =
            errorChargeFromRestaurant +
            errorChargeFromGrocery +
            errorChargeFromPharmacy;
        const secondaryCurrency_totalErrorCharge =
            secondaryCurrency_errorChargeFromRestaurant +
            secondaryCurrency_errorChargeFromGrocery +
            secondaryCurrency_errorChargeFromPharmacy;
        //*** Calc error charge end ***/

        //*** Calc subscription earning start ***/
        const {
            baseCurrency_subscriptionFee: totalSubscriptionEarning,
            secondaryCurrency_subscriptionFee:
                secondaryCurrency_totalSubscriptionEarning,
        } = await this.getSubscriptionEarning({ startDate, endDate });
        //*** Calc subscription earning end ***/

        //*** Calc rider weekly and sales monthly reward start ***/
        const { riderWeeklyReward, secondaryCurrency_riderWeeklyReward } =
            await this.getRiderWeeklyReward({
                startDate,
                endDate,
            });
        //*** Calc rider weekly and sales monthly reward end ***/

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                profitFromRestaurant:
                    orderProfitFromRestaurant +
                    featuredAmountFromRestaurant -
                    refundFromRestaurant -
                    addRemoveCreditFromRestaurant -
                    errorChargeFromRestaurant,
                profitFromGrocery:
                    orderProfitFromGrocery +
                    featuredAmountFromGrocery -
                    refundFromGrocery -
                    addRemoveCreditFromGrocery -
                    errorChargeFromGrocery,
                profitFromPharmacy:
                    orderProfitFromPharmacy +
                    featuredAmountFromPharmacy -
                    refundFromPharmacy -
                    addRemoveCreditFromPharmacy -
                    errorChargeFromPharmacy,
                profitFromButler: deliveryProfitFromButler,
                profitFromDelivery:
                    deliveryProfitFromRestaurant +
                    deliveryProfitFromGrocery +
                    deliveryProfitFromPharmacy -
                    addRemoveCreditFromRider -
                    riderWeeklyReward -
                    deliveryRefundFromRestaurant -
                    deliveryRefundFromGrocery -
                    deliveryRefundFromPharmacy,
                totalSubscriptionEarning,
                adminPay,
                totalProfit:
                    totalOrderProfit +
                    totalDeliveryProfit +
                    totalFeaturedAmount +
                    totalSubscriptionEarning -
                    adminPay -
                    totalRefund -
                    totalAddRemoveCredit -
                    totalErrorCharge -
                    riderWeeklyReward,
            };
        } else {
            result = {
                profitFromRestaurant:
                    secondaryCurrency_orderProfitFromRestaurant +
                    secondaryCurrency_featuredAmountFromRestaurant -
                    secondaryCurrency_refundFromRestaurant -
                    secondaryCurrency_addRemoveCreditFromRestaurant -
                    secondaryCurrency_errorChargeFromRestaurant,
                profitFromGrocery:
                    secondaryCurrency_orderProfitFromGrocery +
                    secondaryCurrency_featuredAmountFromGrocery -
                    secondaryCurrency_refundFromGrocery -
                    secondaryCurrency_addRemoveCreditFromGrocery -
                    secondaryCurrency_errorChargeFromGrocery,
                profitFromPharmacy:
                    secondaryCurrency_orderProfitFromPharmacy +
                    secondaryCurrency_featuredAmountFromPharmacy -
                    secondaryCurrency_refundFromPharmacy -
                    secondaryCurrency_addRemoveCreditFromPharmacy -
                    secondaryCurrency_errorChargeFromPharmacy,
                profitFromButler: secondaryCurrency_deliveryProfitFromButler,
                profitFromDelivery:
                    secondaryCurrency_deliveryProfitFromRestaurant +
                    secondaryCurrency_deliveryProfitFromGrocery +
                    secondaryCurrency_deliveryProfitFromPharmacy -
                    secondaryCurrency_addRemoveCreditFromRider -
                    secondaryCurrency_riderWeeklyReward -
                    secondaryCurrency_deliveryRefundFromRestaurant -
                    secondaryCurrency_deliveryRefundFromGrocery -
                    secondaryCurrency_deliveryRefundFromPharmacy,
                totalSubscriptionEarning:
                    secondaryCurrency_totalSubscriptionEarning,
                adminPay: secondaryCurrency_adminPay,
                totalProfit:
                    secondaryCurrency_totalOrderProfit +
                    secondaryCurrency_totalDeliveryProfit +
                    secondaryCurrency_totalFeaturedAmount +
                    secondaryCurrency_totalSubscriptionEarning -
                    secondaryCurrency_adminPay -
                    secondaryCurrency_totalRefund -
                    secondaryCurrency_totalAddRemoveCredit -
                    secondaryCurrency_totalErrorCharge -
                    secondaryCurrency_riderWeeklyReward,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getAdminDeliveryProfit = async (startDate, endDate, paidCurrency) => {
    try {
        //*** Calc total delivery profit start ***/
        const {
            adminDeliveryProfit: deliveryProfitFromRestaurant,
            secondaryCurrency_adminDeliveryProfit:
                secondaryCurrency_deliveryProfitFromRestaurant,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
            orderType: 'food',
        });

        const {
            adminDeliveryProfit: deliveryProfitFromGrocery,
            secondaryCurrency_adminDeliveryProfit:
                secondaryCurrency_deliveryProfitFromGrocery,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
            orderType: 'grocery',
        });
        const {
            adminDeliveryProfit: deliveryProfitFromPharmacy,
            secondaryCurrency_adminDeliveryProfit:
                secondaryCurrency_deliveryProfitFromPharmacy,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
            orderType: 'pharmacy',
        });

        const {
            adminButlerProfit: deliveryProfitFromButler,
            secondaryCurrency_adminButlerProfit:
                secondaryCurrency_deliveryProfitFromButler,
        } = await this.getButlerFinancial({
            startDate,
            endDate,
        });

        const totalDeliveryProfit =
            deliveryProfitFromRestaurant +
            deliveryProfitFromGrocery +
            deliveryProfitFromPharmacy +
            deliveryProfitFromButler;
        const secondaryCurrency_totalDeliveryProfit =
            secondaryCurrency_deliveryProfitFromRestaurant +
            secondaryCurrency_deliveryProfitFromGrocery +
            secondaryCurrency_deliveryProfitFromPharmacy +
            secondaryCurrency_deliveryProfitFromButler;
        //*** Calc total delivery profit end ***/

        //*** Calc total refund start ***/
        const {
            baseCurrency_adminDeliveryRefund: deliveryRefundFromRestaurant,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_deliveryRefundFromRestaurant,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'food',
        });
        const {
            baseCurrency_adminDeliveryRefund: deliveryRefundFromGrocery,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_deliveryRefundFromGrocery,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'grocery',
        });
        const {
            baseCurrency_adminDeliveryRefund: deliveryRefundFromPharmacy,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_deliveryRefundFromPharmacy,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'pharmacy',
        });

        const refundFromDelivery =
            deliveryRefundFromRestaurant +
            deliveryRefundFromGrocery +
            deliveryRefundFromPharmacy;
        const secondaryCurrency_refundFromDelivery =
            secondaryCurrency_deliveryRefundFromRestaurant +
            secondaryCurrency_deliveryRefundFromGrocery +
            secondaryCurrency_deliveryRefundFromPharmacy;
        //*** Calc total refund end ***/

        //*** Calc add remove credit start ***/
        const {
            totalAddRemoveCredit: addRemoveCreditFromRider,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_addRemoveCreditFromRider,
        } = await this.getRiderAddRemoveCredit({
            startDate,
            endDate,
        });

        //*** Calc add remove credit end ***/

        //*** Calc rider weekly and sales monthly reward start ***/
        const { riderWeeklyReward, secondaryCurrency_riderWeeklyReward } =
            await this.getRiderWeeklyReward({
                startDate,
                endDate,
            });
        //*** Calc rider weekly and sales monthly reward end ***/

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                deliveryProfitFromRestaurant:
                    deliveryProfitFromRestaurant - deliveryRefundFromRestaurant,
                deliveryProfitFromGrocery:
                    deliveryProfitFromGrocery - deliveryRefundFromGrocery,
                deliveryProfitFromPharmacy:
                    deliveryProfitFromPharmacy - deliveryRefundFromPharmacy,
                deliveryProfitFromButler,
                addRemoveCreditFromRider,
                riderWeeklyReward,
                totalDeliveryProfit:
                    totalDeliveryProfit -
                    refundFromDelivery -
                    addRemoveCreditFromRider -
                    riderWeeklyReward,
            };
        } else {
            result = {
                deliveryProfitFromRestaurant:
                    secondaryCurrency_deliveryProfitFromRestaurant -
                    secondaryCurrency_deliveryRefundFromRestaurant,
                deliveryProfitFromGrocery:
                    secondaryCurrency_deliveryProfitFromGrocery -
                    secondaryCurrency_deliveryRefundFromGrocery,
                deliveryProfitFromPharmacy:
                    secondaryCurrency_deliveryProfitFromPharmacy -
                    secondaryCurrency_deliveryRefundFromPharmacy,
                deliveryProfitFromButler:
                    secondaryCurrency_deliveryProfitFromButler,
                addRemoveCreditFromRider:
                    secondaryCurrency_addRemoveCreditFromRider,
                riderWeeklyReward: secondaryCurrency_riderWeeklyReward,
                totalDeliveryProfit:
                    secondaryCurrency_totalDeliveryProfit -
                    secondaryCurrency_refundFromDelivery -
                    secondaryCurrency_addRemoveCreditFromRider -
                    secondaryCurrency_riderWeeklyReward,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getAdminRefund = async (startDate, endDate, paidCurrency) => {
    try {
        //*** Calc total refund start ***/
        const {
            refundAmount: refundFromRestaurant,
            baseCurrency_adminDeliveryRefund: deliveryRefundFromRestaurant,
            secondaryCurrency_refundAmount:
                secondaryCurrency_refundFromRestaurant,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_deliveryRefundFromRestaurant,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'food',
        });

        const {
            refundAmount: refundFromGrocery,
            baseCurrency_adminDeliveryRefund: deliveryRefundFromGrocery,
            secondaryCurrency_refundAmount: secondaryCurrency_refundFromGrocery,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_deliveryRefundFromGrocery,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'grocery',
        });

        const {
            refundAmount: refundFromPharmacy,
            baseCurrency_adminDeliveryRefund: deliveryRefundFromPharmacy,
            secondaryCurrency_refundAmount:
                secondaryCurrency_refundFromPharmacy,
            secondaryCurrency_adminDeliveryRefund:
                secondaryCurrency_deliveryRefundFromPharmacy,
        } = await this.getTotalRefundAmount({
            startDate,
            endDate,
            account: 'admin',
            orderType: 'pharmacy',
        });

        const refundFromDelivery =
            deliveryRefundFromRestaurant +
            deliveryRefundFromGrocery +
            deliveryRefundFromPharmacy;
        const secondaryCurrency_refundFromDelivery =
            secondaryCurrency_deliveryRefundFromRestaurant +
            secondaryCurrency_deliveryRefundFromGrocery +
            secondaryCurrency_deliveryRefundFromPharmacy;
        const totalRefund =
            refundFromRestaurant +
            refundFromGrocery +
            refundFromPharmacy +
            refundFromDelivery;
        const secondaryCurrency_totalRefund =
            secondaryCurrency_refundFromRestaurant +
            secondaryCurrency_refundFromGrocery +
            secondaryCurrency_refundFromPharmacy +
            secondaryCurrency_refundFromDelivery;
        //*** Calc total refund end ***/

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                refundFromRestaurant,
                refundFromGrocery,
                refundFromPharmacy,
                refundFromDelivery,
                totalRefund,
            };
        } else {
            result = {
                refundFromRestaurant: secondaryCurrency_refundFromRestaurant,
                refundFromGrocery: secondaryCurrency_refundFromGrocery,
                refundFromPharmacy: secondaryCurrency_refundFromPharmacy,
                refundFromDelivery: secondaryCurrency_refundFromDelivery,
                totalRefund: secondaryCurrency_totalRefund,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getTotalMarketingSpent = async (startDate, endDate, paidCurrency) => {
    try {
        //*** Calc marketing spent start ***/
        const { totalValue: marketingSpentObj } = await this.getOrderStatistics(
            {
                startDate,
                endDate,
            }
        );

        const { featuredAmount, secondaryCurrency_featuredAmount } =
            await this.getFeaturedAmount({
                startDate,
                endDate,
            });

        const discountByShop = marketingSpentObj.totalShopDiscount;
        const discountByAdmin = marketingSpentObj.totalAdminDiscount;

        const loyaltyPointByShop = marketingSpentObj.totalShopRewardAmount;
        const loyaltyPointByAdmin = marketingSpentObj.totalAdminRewardAmount;

        const buy1Get1ByShop = marketingSpentObj.totalShopDoubleMenuItemPrice;
        const buy1Get1ByAdmin = marketingSpentObj.totalAdminDoubleMenuItemPrice;

        const couponDiscountByShop = marketingSpentObj.totalCouponShopCut;
        const couponDiscountByAdmin = marketingSpentObj.totalCouponAdminCut;

        const freeDeliveryByShop = marketingSpentObj.freeDeliveryShopLoss;
        const freeDeliveryByAdmin = marketingSpentObj.freeDeliveryAdminCut;

        const marketingSpentByShop =
            discountByShop +
            loyaltyPointByShop +
            buy1Get1ByShop +
            couponDiscountByShop +
            freeDeliveryByShop +
            featuredAmount;

        const marketingSpentByAdmin =
            discountByAdmin +
            loyaltyPointByAdmin +
            buy1Get1ByAdmin +
            couponDiscountByAdmin +
            freeDeliveryByAdmin;

        const totalMarketingSpent =
            marketingSpentByShop + marketingSpentByAdmin;

        const secondaryCurrency_discountByShop =
            marketingSpentObj.secondaryCurrency_totalShopDiscount;
        const secondaryCurrency_discountByAdmin =
            marketingSpentObj.secondaryCurrency_totalAdminDiscount;

        const secondaryCurrency_loyaltyPointByShop =
            marketingSpentObj.secondaryCurrency_totalShopRewardAmount;
        const secondaryCurrency_loyaltyPointByAdmin =
            marketingSpentObj.secondaryCurrency_totalAdminRewardAmount;

        const secondaryCurrency_buy1Get1ByShop =
            marketingSpentObj.secondaryCurrency_totalShopDoubleMenuItemPrice;
        const secondaryCurrency_buy1Get1ByAdmin =
            marketingSpentObj.secondaryCurrency_totalAdminDoubleMenuItemPrice;

        const secondaryCurrency_couponDiscountByShop =
            marketingSpentObj.secondaryCurrency_totalCouponShopCut;
        const secondaryCurrency_couponDiscountByAdmin =
            marketingSpentObj.secondaryCurrency_totalCouponAdminCut;

        const secondaryCurrency_freeDeliveryByShop =
            marketingSpentObj.secondaryCurrency_freeDeliveryShopLoss;
        const secondaryCurrency_freeDeliveryByAdmin =
            marketingSpentObj.secondaryCurrency_freeDeliveryAdminCut;

        const secondaryCurrency_marketingSpentByShop =
            secondaryCurrency_discountByShop +
            secondaryCurrency_loyaltyPointByShop +
            secondaryCurrency_buy1Get1ByShop +
            secondaryCurrency_couponDiscountByShop +
            secondaryCurrency_freeDeliveryByShop +
            secondaryCurrency_featuredAmount;

        const secondaryCurrency_marketingSpentByAdmin =
            secondaryCurrency_discountByAdmin +
            secondaryCurrency_loyaltyPointByAdmin +
            secondaryCurrency_buy1Get1ByAdmin +
            secondaryCurrency_couponDiscountByAdmin +
            secondaryCurrency_freeDeliveryByAdmin;

        const secondaryCurrency_totalMarketingSpent =
            secondaryCurrency_marketingSpentByShop +
            secondaryCurrency_marketingSpentByAdmin;

        //*** Calc marketing spent end ***/

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                marketingSpentByShop,
                marketingSpentByAdmin,
                totalMarketingSpent,
            };
        } else {
            result = {
                marketingSpentByShop: secondaryCurrency_marketingSpentByShop,
                marketingSpentByAdmin: secondaryCurrency_marketingSpentByAdmin,
                totalMarketingSpent: secondaryCurrency_totalMarketingSpent,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getAdminMarketingSpent = async (startDate, endDate, paidCurrency) => {
    try {
        //*** Calc marketing spent start ***/
        const { totalValue: marketingSpentObj } = await this.getOrderStatistics(
            {
                startDate,
                endDate,
            }
        );

        const discount = marketingSpentObj.totalAdminDiscount;

        const loyaltyPoint = marketingSpentObj.totalAdminRewardAmount;

        const buy1Get1 = marketingSpentObj.totalAdminDoubleMenuItemPrice;

        const couponDiscount = marketingSpentObj.totalCouponAdminCut;

        const freeDelivery = marketingSpentObj.freeDeliveryAdminCut;

        const totalMarketingSpent =
            discount + loyaltyPoint + buy1Get1 + couponDiscount + freeDelivery;

        const secondaryCurrency_discount =
            marketingSpentObj.secondaryCurrency_totalAdminDiscount;

        const secondaryCurrency_loyaltyPoint =
            marketingSpentObj.secondaryCurrency_totalAdminRewardAmount;

        const secondaryCurrency_buy1Get1 =
            marketingSpentObj.secondaryCurrency_totalAdminDoubleMenuItemPrice;

        const secondaryCurrency_couponDiscount =
            marketingSpentObj.secondaryCurrency_totalCouponAdminCut;

        const secondaryCurrency_freeDelivery =
            marketingSpentObj.secondaryCurrency_freeDeliveryAdminCut;

        const secondaryCurrency_totalMarketingSpent =
            secondaryCurrency_discount +
            secondaryCurrency_loyaltyPoint +
            secondaryCurrency_buy1Get1 +
            secondaryCurrency_couponDiscount +
            secondaryCurrency_freeDelivery;

        //*** Calc marketing spent end ***/

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                discount,
                loyaltyPoint,
                buy1Get1,
                couponDiscount,
                freeDelivery,
                totalMarketingSpent,
            };
        } else {
            result = {
                discount: secondaryCurrency_discount,
                loyaltyPoint: secondaryCurrency_loyaltyPoint,
                buy1Get1: secondaryCurrency_buy1Get1,
                couponDiscount: secondaryCurrency_couponDiscount,
                freeDelivery: secondaryCurrency_freeDelivery,
                totalMarketingSpent: secondaryCurrency_totalMarketingSpent,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getShopMarketingSpent = async (startDate, endDate, paidCurrency) => {
    try {
        //*** Calc marketing spent start ***/
        const { totalValue: marketingSpentObj } = await this.getOrderStatistics(
            {
                startDate,
                endDate,
            }
        );

        const { featuredAmount, secondaryCurrency_featuredAmount } =
            await this.getFeaturedAmount({
                startDate,
                endDate,
            });

        const discount = marketingSpentObj.totalShopDiscount;

        const loyaltyPoint = marketingSpentObj.totalShopRewardAmount;

        const buy1Get1 = marketingSpentObj.totalShopDoubleMenuItemPrice;

        const couponDiscount = marketingSpentObj.totalCouponShopCut;

        const freeDelivery = marketingSpentObj.freeDeliveryShopLoss;

        const totalMarketingSpent =
            discount +
            loyaltyPoint +
            buy1Get1 +
            couponDiscount +
            freeDelivery +
            featuredAmount;

        const secondaryCurrency_discount =
            marketingSpentObj.secondaryCurrency_totalShopDiscount;

        const secondaryCurrency_loyaltyPoint =
            marketingSpentObj.secondaryCurrency_totalShopRewardAmount;

        const secondaryCurrency_buy1Get1 =
            marketingSpentObj.secondaryCurrency_totalShopDoubleMenuItemPrice;

        const secondaryCurrency_couponDiscount =
            marketingSpentObj.secondaryCurrency_totalCouponShopCut;

        const secondaryCurrency_freeDelivery =
            marketingSpentObj.secondaryCurrency_freeDeliveryShopLoss;

        const secondaryCurrency_totalMarketingSpent =
            secondaryCurrency_discount +
            secondaryCurrency_loyaltyPoint +
            secondaryCurrency_buy1Get1 +
            secondaryCurrency_couponDiscount +
            secondaryCurrency_freeDelivery +
            secondaryCurrency_featuredAmount;

        //*** Calc marketing spent end ***/

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                discount,
                loyaltyPoint,
                buy1Get1,
                couponDiscount,
                freeDelivery,
                featuredAmount,
                totalMarketingSpent,
            };
        } else {
            result = {
                discount: secondaryCurrency_discount,
                loyaltyPoint: secondaryCurrency_loyaltyPoint,
                buy1Get1: secondaryCurrency_buy1Get1,
                couponDiscount: secondaryCurrency_couponDiscount,
                freeDelivery: secondaryCurrency_freeDelivery,
                featuredAmount: secondaryCurrency_featuredAmount,
                totalMarketingSpent: secondaryCurrency_totalMarketingSpent,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getFreeDeliveryByAdmin = async (startDate, endDate, paidCurrency) => {
    try {
        const { totalValue: marketingSpentObj } = await this.getOrderStatistics(
            {
                startDate,
                endDate,
            }
        );

        const freeDelivery = marketingSpentObj.freeDeliveryAdminCut;

        const secondaryCurrency_freeDelivery =
            marketingSpentObj.secondaryCurrency_freeDeliveryAdminCut;

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                freeDelivery,
            };
        } else {
            result = {
                freeDelivery: secondaryCurrency_freeDelivery,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getFreeDeliveryByShop = async (startDate, endDate, paidCurrency) => {
    try {
        //*** Calc marketing spent start ***/
        const { totalValue: marketingSpentObj } = await this.getOrderStatistics(
            { startDate, endDate }
        );

        const freeDelivery = marketingSpentObj.freeDeliveryShopLoss;

        const secondaryCurrency_freeDelivery =
            marketingSpentObj.secondaryCurrency_freeDeliveryShopLoss;

        //*** Calc marketing spent end ***/

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                freeDelivery,
            };
        } else {
            result = {
                freeDelivery: secondaryCurrency_freeDelivery,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getAdminMarketingCashback = async (
    startDate,
    endDate,
    paidCurrency
) => {
    try {
        const { totalValue: marketingSpentObj } = await this.getOrderStatistics(
            { startDate, endDate }
        );

        const discount = marketingSpentObj.totalAdminDiscount;
        const buy1Get1 = marketingSpentObj.totalAdminDoubleMenuItemPrice;
        const couponDiscount = marketingSpentObj.totalCouponAdminCut;
        const pointsCashback = marketingSpentObj.pointsCashback;

        const secondaryCurrency_discount =
            marketingSpentObj.secondaryCurrency_totalAdminDiscount;
        const secondaryCurrency_buy1Get1 =
            marketingSpentObj.secondaryCurrency_totalAdminDoubleMenuItemPrice;
        const secondaryCurrency_couponDiscount =
            marketingSpentObj.secondaryCurrency_totalCouponAdminCut;
        const secondaryCurrency_pointsCashback =
            marketingSpentObj.secondaryCurrency_pointsCashback;

        const adminMarketingCashback =
            discount + buy1Get1 + couponDiscount + pointsCashback;

        const secondaryCurrency_adminMarketingCashback =
            secondaryCurrency_discount +
            secondaryCurrency_buy1Get1 +
            secondaryCurrency_couponDiscount +
            secondaryCurrency_pointsCashback;

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                discount,
                buy1Get1,
                couponDiscount,
                pointsCashback,
                adminMarketingCashback,
            };
        } else {
            result = {
                discount: secondaryCurrency_discount,
                buy1Get1: secondaryCurrency_buy1Get1,
                couponDiscount: secondaryCurrency_couponDiscount,
                pointsCashback: secondaryCurrency_pointsCashback,
                adminMarketingCashback:
                    secondaryCurrency_adminMarketingCashback,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getTotalDeliveryFees = async (startDate, endDate, paidCurrency) => {
    try {
        const {
            orderAmount,
            userPayDeliveryFee,
            secondaryCurrency_orderAmount,
            secondaryCurrency_userPayDeliveryFee,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
        });

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                totalDeliveryFees: orderAmount + userPayDeliveryFee,
            };
        } else {
            result = {
                totalDeliveryFees:
                    secondaryCurrency_orderAmount +
                    secondaryCurrency_userPayDeliveryFee,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getTotalRiderTips = async ({ startDate, endDate, paidCurrency }) => {
    try {
        const {
            userPayRiderTip: totalRiderTips,
            secondaryCurrency_userPayRiderTip: secondaryCurrency_totalRiderTips,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
        });

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                totalRiderTips,
            };
        } else {
            result = {
                totalRiderTips: secondaryCurrency_totalRiderTips,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getTotalButlerOrderAmount = async ({
    startDate,
    endDate,
    paidCurrency,
}) => {
    try {
        const {
            orderAmount: totalButlerOrderAmount,
            secondaryCurrency_orderAmount:
                secondaryCurrency_totalButlerOrderAmount,
        } = await this.getButlerFinancial({
            startDate,
            endDate,
        });

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                totalButlerOrderAmount,
            };
        } else {
            result = {
                totalButlerOrderAmount:
                    secondaryCurrency_totalButlerOrderAmount,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getTotalProfitFromButler = async ({
    startDate,
    endDate,
    paidCurrency,
}) => {
    try {
        const {
            adminButlerProfit: totalProfitFromButler,
            secondaryCurrency_adminButlerProfit:
                secondaryCurrency_totalProfitFromButler,
        } = await this.getButlerFinancial({
            startDate,
            endDate,
        });

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                totalProfitFromButler,
            };
        } else {
            result = {
                totalProfitFromButler: secondaryCurrency_totalProfitFromButler,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getTotalRiderPayout = async ({ startDate, endDate, paidCurrency }) => {
    try {
        const {
            riderPayout,
            riderPayoutForButler,
            secondaryCurrency_riderPayout,
            secondaryCurrency_riderPayoutForButler,
        } = await this.getDeliveryFinancial({
            startDate,
            endDate,
            isShopRiderSubscriptionLossAdjust: false,
        });

        const totalRiderPayout = riderPayout + riderPayoutForButler;
        const secondaryCurrency_totalRiderPayout =
            secondaryCurrency_riderPayout +
            secondaryCurrency_riderPayoutForButler;

        // Calculate rider add remove credit start
        const {
            totalAddRemoveCredit: riderAddRemoveCredit,
            secondaryCurrency_totalAddRemoveCredit:
                secondaryCurrency_riderAddRemoveCredit,
        } = await this.getRiderAddRemoveCredit({
            startDate,
            endDate,
        });
        // Calculate rider add remove credit end

        // Calculate rider weekly reward start
        const {
            riderWeeklyReward,
            secondaryCurrency_riderWeeklyReward:
                secondaryCurrency_riderWeeklyReward,
        } = await this.getRiderWeeklyReward({
            startDate,
            endDate,
        });
        // Calculate rider weekly reward end

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                totalRiderPayout:
                    totalRiderPayout + riderAddRemoveCredit + riderWeeklyReward,
            };
        } else {
            result = {
                totalRiderPayout:
                    secondaryCurrency_totalRiderPayout +
                    secondaryCurrency_riderAddRemoveCredit +
                    secondaryCurrency_riderWeeklyReward,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

exports.getTotalShopPayout = async (startDate, endDate, paidCurrency) => {
    try {
        const {
            totalShopEarning: totalShopEarningForRestaurant,
            secondaryCurrency_totalShopEarning:
                secondaryCurrency_totalShopEarningForRestaurant,
        } = await this.getShopEarning({
            orderType: 'food',
            startDate,
            endDate,
        });
        const {
            totalShopEarning: totalShopEarningForGrocery,
            secondaryCurrency_totalShopEarning:
                secondaryCurrency_totalShopEarningForGrocery,
        } = await this.getShopEarning({
            orderType: 'grocery',
            startDate,
            endDate,
        });
        const {
            totalShopEarning: totalShopEarningForPharmacy,
            secondaryCurrency_totalShopEarning:
                secondaryCurrency_totalShopEarningForPharmacy,
        } = await this.getShopEarning({
            orderType: 'pharmacy',
            startDate,
            endDate,
        });

        const {
            totalSellerUnsettle: totalShopUnsettleForRestaurant,
            secondaryCurrency_totalSellerUnsettle:
                secondaryCurrency_totalShopUnsettleForRestaurant,
        } = await this.getShopUnSettleAmount({
            orderType: 'food',
            startDate,
            endDate,
        });
        const {
            totalSellerUnsettle: totalShopUnsettleForGrocery,
            secondaryCurrency_totalSellerUnsettle:
                secondaryCurrency_totalShopUnsettleForGrocery,
        } = await this.getShopUnSettleAmount({
            orderType: 'grocery',
            startDate,
            endDate,
        });
        const {
            totalSellerUnsettle: totalShopUnsettleForPharmacy,
            secondaryCurrency_totalSellerUnsettle:
                secondaryCurrency_totalShopUnsettleForPharmacy,
        } = await this.getShopUnSettleAmount({
            orderType: 'pharmacy',
            startDate,
            endDate,
        });

        const {
            totalShopCashInHand: totalShopCashInHandForRestaurant,
            secondaryCurrency_totalShopCashInHand:
                secondaryCurrency_totalShopCashInHandForRestaurant,
        } = await this.getShopCashInHand({
            orderType: 'food',
            startDate,
            endDate,
        });
        const {
            totalShopCashInHand: totalShopCashInHandForGrocery,
            secondaryCurrency_totalShopCashInHand:
                secondaryCurrency_totalShopCashInHandForGrocery,
        } = await this.getShopCashInHand({
            orderType: 'grocery',
            startDate,
            endDate,
        });
        const {
            totalShopCashInHand: totalShopCashInHandForPharmacy,
            secondaryCurrency_totalShopCashInHand:
                secondaryCurrency_totalShopCashInHandForPharmacy,
        } = await this.getShopCashInHand({
            orderType: 'pharmacy',
            startDate,
            endDate,
        });

        const totalPayoutForRestaurant =
            totalShopUnsettleForRestaurant +
            totalShopEarningForRestaurant -
            totalShopCashInHandForRestaurant;
        const totalPayoutForGrocery =
            totalShopUnsettleForGrocery +
            totalShopEarningForGrocery -
            totalShopCashInHandForGrocery;
        const totalPayoutForPharmacy =
            totalShopUnsettleForPharmacy +
            totalShopEarningForPharmacy -
            totalShopCashInHandForPharmacy;

        const secondaryCurrency_totalPayoutForRestaurant =
            secondaryCurrency_totalShopUnsettleForRestaurant +
            secondaryCurrency_totalShopEarningForRestaurant -
            secondaryCurrency_totalShopCashInHandForRestaurant;
        const secondaryCurrency_totalPayoutForGrocery =
            secondaryCurrency_totalShopUnsettleForGrocery +
            secondaryCurrency_totalShopEarningForGrocery -
            secondaryCurrency_totalShopCashInHandForGrocery;
        const secondaryCurrency_totalPayoutForPharmacy =
            secondaryCurrency_totalShopUnsettleForPharmacy +
            secondaryCurrency_totalShopEarningForPharmacy -
            secondaryCurrency_totalShopCashInHandForPharmacy;

        let result = {};
        if (paidCurrency === 'baseCurrency') {
            result = {
                totalPayoutForRestaurant,
                totalPayoutForGrocery,
                totalPayoutForPharmacy,
                totalShopPayout:
                    totalPayoutForRestaurant +
                    totalPayoutForGrocery +
                    totalPayoutForPharmacy,
            };
        } else {
            result = {
                totalPayoutForRestaurant:
                    secondaryCurrency_totalPayoutForRestaurant,
                totalPayoutForGrocery: secondaryCurrency_totalPayoutForGrocery,
                totalPayoutForPharmacy:
                    secondaryCurrency_totalPayoutForPharmacy,
                totalShopPayout:
                    secondaryCurrency_totalPayoutForRestaurant +
                    secondaryCurrency_totalPayoutForGrocery +
                    secondaryCurrency_totalPayoutForPharmacy,
            };
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

// exports.getCashFlowSummary = async (req, res) => {
//     try {
//         const transactions = await TransactionModel.find({
//             type: {
//                 $in: [
//                     'adminSettlebalanceShop',
//                     'deliveryBoyAdminAmountReceivedCash',
//                     'userPayForOrder',
//                     'userTopUpBalance',
//                     'topUpAdminWallet',
//                 ],
//             },
//             status: 'success',
//         }).lean();

//         let baseCurrency_BOBCashflowIn = 0;
//         let secondaryCurrency_BOBCashflowIn = 0;
//         let secondaryCurrency_BOBCashflowOut = 0;
//         let baseCurrency_BankLebanonCashflowIn = 0;
//         let baseCurrency_BankDubaiCashflowIn = 0;
//         let baseCurrency_LyxaPayCashflowOut = 0;

//         transactions.forEach(trx => {
//             switch (trx.type) {
//                 case 'adminSettlebalanceShop':
//                     secondaryCurrency_BOBCashflowOut +=
//                         trx.secondaryCurrency_amount;
//                     break;
//                 case 'deliveryBoyAdminAmountReceivedCash':
//                     if (trx.paidCurrency === 'baseCurrency') {
//                         baseCurrency_BOBCashflowIn += trx.amount;
//                     } else {
//                         secondaryCurrency_BOBCashflowIn +=
//                             trx.secondaryCurrency_amount;
//                     }
//                     break;
//                 case 'userPayForOrder':
//                 case 'userTopUpBalance':
//                     baseCurrency_BankLebanonCashflowIn += trx.amount;
//                     break;
//                 case 'topUpAdminWallet':
//                     baseCurrency_LyxaPayCashflowOut += trx.amount;
//                     break;
//             }
//         });

//         successResponse(res, {
//             message: 'Successfully fetched',
//             data: {
//                 baseCurrency_BOBCashflowIn,
//                 secondaryCurrency_BOBCashflowIn,
//                 secondaryCurrency_BOBCashflowOut,
//                 baseCurrency_BankLebanonCashflowIn,
//                 baseCurrency_BankDubaiCashflowIn,
//                 baseCurrency_LyxaPayCashflowOut,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
exports.getCashFlowSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let commonConfig = {
            type: {
                $in: [
                    'adminSettlebalanceShop',
                    'deliveryBoyAmountSettle',
                    'deliveryBoyAdminAmountReceivedCash',
                    'userPayForOrder',
                    'userTopUpBalance',
                    'topUpAdminWallet',
                ],
            },
            status: 'success',
        };

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            commonConfig.createdAt = {
                $gte: startDateTime,
                $lte: endDateTime,
            };
        }

        const pipeline = [
            {
                $match: commonConfig,
            },
            {
                $group: {
                    _id: null,
                    baseCurrency_BOBCashflowIn: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        {
                                            $eq: [
                                                '$type',
                                                'deliveryBoyAdminAmountReceivedCash',
                                            ],
                                        },
                                        {
                                            $eq: [
                                                '$paidCurrency',
                                                'baseCurrency',
                                            ],
                                        },
                                    ],
                                },
                                '$amount',
                                0,
                            ],
                        },
                    },
                    secondaryCurrency_BOBCashflowIn: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        {
                                            $eq: [
                                                '$type',
                                                'deliveryBoyAdminAmountReceivedCash',
                                            ],
                                        },
                                        {
                                            $ne: [
                                                '$paidCurrency',
                                                'baseCurrency',
                                            ],
                                        },
                                    ],
                                },
                                '$secondaryCurrency_amount',
                                0,
                            ],
                        },
                    },
                    secondaryCurrency_BOBCashflowOut: {
                        $sum: {
                            $cond: [
                                {
                                    $in: [
                                        '$type',
                                        [
                                            'adminSettlebalanceShop',
                                            'deliveryBoyAmountSettle',
                                        ],
                                    ],
                                },
                                '$secondaryCurrency_amount',
                                0,
                            ],
                        },
                    },
                    baseCurrency_BankLebanonCashflowIn: {
                        $sum: {
                            $cond: [
                                {
                                    $in: [
                                        '$type',
                                        ['userPayForOrder', 'userTopUpBalance'],
                                    ],
                                },
                                '$amount',
                                0,
                            ],
                        },
                    },
                    baseCurrency_LyxaPayCashflowOut: {
                        $sum: {
                            $cond: [
                                { $eq: ['$type', 'topUpAdminWallet'] },
                                '$amount',
                                0,
                            ],
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    baseCurrency_BOBCashflowIn: 1,
                    secondaryCurrency_BOBCashflowIn: 1,
                    secondaryCurrency_BOBCashflowOut: 1,
                    baseCurrency_BankLebanonCashflowIn: 1,
                    baseCurrency_LyxaPayCashflowOut: 1,
                },
            },
        ];

        const {
            baseCurrency_BOBCashflowIn = 0,
            secondaryCurrency_BOBCashflowIn = 0,
            secondaryCurrency_BOBCashflowOut = 0,
            baseCurrency_BankLebanonCashflowIn = 0,
            baseCurrency_LyxaPayCashflowOut = 0,
        } = (await TransactionModel.aggregate(pipeline))[0] || {};

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                baseCurrency_BOBCashflowIn,
                secondaryCurrency_BOBCashflowIn,
                secondaryCurrency_BOBCashflowOut,
                baseCurrency_BankLebanonCashflowIn,
                baseCurrency_BankDubaiCashflowIn: 0,
                baseCurrency_LyxaPayCashflowOut,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
