const express = require('express');
const router = express.Router();
const productController = require('../../../controllers/ProductController');
const ImportProdcutController = require('../../../controllers/ImportProdcutController');
const {
    productAddValidation,
    ProductUpdateValidation,
} = require('../../../validation/productValidation');
const upload = require('../../../helpers/fileHelper');
const uploadProductExcel = require('../../../helpers/fileHelperExcelProduct');
// const uploadTemplate = require('../../../helpers/fileHelperTemplate');
/**
 * /admins
 * @url http://localhost:5001/admin/product
 *
 *
 */

router.get('/', productController.getProducts);
router.get('/subcategory', productController.getProductsBySubcategory);
router.get('/category', productController.getProductsByCategory);
router.get(
    '/category-wise-products',
    productController.getCategoryWiseProducts
);
router.post('/add', productController.addProduct);
router.post('/update', productController.updateProducts);
router.post('/add-deal', productController.updateProductsDeals);
router.post('/delete-deal', productController.deleteDealsInProductFromAdmin);
router.post('/delete', productController.deleteProductById);
router.post('/status', productController.productStatusChange);
router.get('/product-details', productController.getProductsDetails);
router.get('/for-seller', productController.productListForSeller);
router.post('/bulk-add', productController.addProduct);
router.post('/sort', productController.sortProducts);
router.post('/update-stock', productController.updateProductStockStatus);
// Check is the product in another product addon
router.get('/addons-check', productController.getProductAddonsCheck);

// router.post('/import', ImportProdcutController.download);
router.get('/download-template', ImportProdcutController.downloadTemplate);
router.post(
    '/import',
    upload.single('file'),
    ImportProdcutController.readProductFile
);

// Global product feature for grocery and pharmacy
router.get('/global-product', productController.getGlobalProducts);
router.get('/global-product/shop', productController.getGlobalProductShops);


// Previously Lyxa product was uploaded through this api
router.post('/add-global-product', productController.addGlobalProduct);


router.post(
    '/upload-global-product', 
    uploadProductExcel('global').single('file'),
    productController.uploadGlobalProduct
);

router.get('/download', productController.downloadTemplate);

// To upload excel template through postman - Deprecated Api
// router.post(
//     '/upload-template',
//     uploadTemplate.single('file'),
//     productController.uploadTemplate
// );

// This api works.. 
router.get('/download-add-shop-product-template', productController.downloadTemplateShop);

router.post(
    '/upload-shop-product-excel', 
    uploadProductExcel('shop').single('file'),
    productController.uploadShopProduct
);

router.post('/update-global-product', productController.updateGlobalProduct);
router.post(
    '/delete-global-product',
    productController.deleteGlobalProductById
);
router.get('/check-global-product', productController.checkGlobalProduct);

module.exports = router;
