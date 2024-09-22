const express = require('express');
const flutterWaveController = require('../../controllers/FlutterWaveController');
const router = express.Router();
const shortid = require('shortid');
const ShopModel = require('../../models/ShopModel');
const ProductModel = require('../../models/ProductModel');
const DeliveryBoyModel = require('../../models/DeliveryBoyModel');
const UserModel = require('../../models/UserModel');
/**
 * /admin
 * @url http://localhost:5001/test
 *
 */

router.get('/flutter-wave-card-charge', flutterWaveController.cardCharge);
router.get('/fetch_transactions', flutterWaveController.fetch_transactions);
router.get('/flutterWaveStandard', flutterWaveController.flutterWaveStandard);

router.post('/ftw-card-step-1', flutterWaveController.flwCardStep1);
router.post('/ftw-card-step-2', flutterWaveController.flwCardStep2);
router.post('/ftw-card-step-3', flutterWaveController.flwCardStep3);

router.get('/addid', async (req, res) => {
    // update all shops with autoGenId

    // get all shops
    const shops = await ShopModel.find({});
    for (let i = 0; i < shops.length; i++) {
        const shop = shops[i];
        const shopId = shop._id;
        const autoGenId = shortid.generate();
        await ShopModel.updateOne({ _id: shopId }, { autoGenId });
    }

    // update all products with autoGenId
    const products = await ProductModel.find({});
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const productId = product._id;
        const autoGenId = shortid.generate();
        await ProductModel.updateOne({ _id: productId }, { autoGenId });
    }

    // update all deliveryBoy with autoGenId
    const deliveryBoys = await DeliveryBoyModel.find({});
    for (let i = 0; i < deliveryBoys.length; i++) {
        const deliveryBoy = deliveryBoys[i];
        const deliveryBoyId = deliveryBoy._id;
        const autoGenId = shortid.generate();
        await DeliveryBoyModel.updateOne({ _id: deliveryBoyId }, { autoGenId });
    }

    // update all users with autoGenId
    const users = await UserModel.find({});
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const userId = user._id;
        const autoGenId = shortid.generate();
        await UserModel.updateOne({ _id: userId }, { autoGenId });
    }

    return res.json({ message: 'done' });
});

module.exports = router;
