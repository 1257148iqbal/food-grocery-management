const ShopModel = require('../models/ShopModel');
const OrderDeliveryCharge = require('../models/OrderDeliveryCharge');

exports.calculateDropShareFromDeliveryCharge = async (orderDeliveryCharge) => {
    const distance = Number(orderDeliveryCharge.distance);
    let share = {
        deliveryBoy: 0,
        drop: 0
    };
    let charges = orderDeliveryCharge.dropChargeId.deliveryRange;
    for(let i=0; i<charges.length; i++ ){
        let e = charges[i];
        if(distance >= Number(e.from) && distance <= Number(e.to)){
            share.drop = Number(e.charge) - Number(e.deliveryPersonCut);
            share.deliveryBoy = Number(e.deliveryPersonCut);
            break;
        }
    }
    return share;
}
