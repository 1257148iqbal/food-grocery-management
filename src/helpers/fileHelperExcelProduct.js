/*
const multer = require('multer');
const fs = require('fs');

const dir = 'public/files/excel-files';

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}


const excelFilter = (req, file, cb) => {
    if (
        file.mimetype.includes('excel') ||
        file.mimetype.includes('spreadsheetml')
    ) {
        cb(null, true);
    } else {
        cb('Please upload only excel file.', false);
    }
};

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/files/excel-files');
    },
    filename: (req, file, cb) => {
        // console.log(file.originalname);
        cb(null, `${Date.now()}-global-product-${file.originalname}`);
    },
});

var uploadGlobalProduct = multer({ storage: storage, fileFilter: excelFilter });

module.exports = uploadGlobalProduct;
*/

const multer = require('multer');
const fs = require('fs');

const dir = 'public/files/excel-files';

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

const excelFilter = (req, file, cb) => {
    if (
        file.mimetype.includes('excel') ||
        file.mimetype.includes('spreadsheetml')
    ) {
        cb(null, true);
    } else {
        cb('Please upload only excel file.', false);
    }
};

const getStorage = (type) => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'public/files/excel-files');
        },
        filename: (req, file, cb) => {
            // const prefix = type === 'shop' ? 'shop-product' : 'global-product';
            cb(null, `${Date.now()}-${type}-${file.originalname}`);
        },
    });
};

const uploadProductExcel = (type) => {
    return multer({ storage: getStorage(type), fileFilter: excelFilter });
};

module.exports = uploadProductExcel;
