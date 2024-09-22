const Repository = require('../helpers/repository');
const OrderModel = require('../models/OrderModel');

class OrderRepository extends Repository {
    constructor() {
        super(OrderModel);
    }
}

const orderRepository = new OrderRepository();
module.exports = { orderRepository };
