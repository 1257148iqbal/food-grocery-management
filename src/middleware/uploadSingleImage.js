const util = require('util');
const Multer = require('multer');
const moment = require('moment');
const path = require('path');
const { makeSlug } = require('../helpers/utility');

// var storage_multer = Multer.diskStorage({
//   filename: function (req, file, callback) {
//     const { imageName } = req.body
//     // const type = file.mimetype.split('/')[1]
//     var nameWithoutExt = path.parse(file.originalname).name
//     var extension = path.extname(file.originalname)
//     if (imageName) {
//       nameWithoutExt = imageName;
//     }
//     // Math.floor(Math.random() * 1000)
//     let newFilename = `${nameWithoutExt}-${process.env.WEBSITE_NAME}-${moment().format('DDMMYYHmmss')}-${Math.floor(Math.random() * 100)}`;
//     newFilename = makeSlug(newFilename);
//     callback(null, newFilename + extension);
//   },
// });

const isImage = (req, file, callback) => {
    file.mimetype.startsWith('image')
        ? callback(null, true)
        : callback(new Error('Only image is Allow...'));
};

const multerFilter = (req, file, callback) => {
    isImage(req, file, callback);
    // callback(null, true);
};

const limit = {
    files: 1, // allow only 1 file per request
    fileSize: 1024 * 1024 * 5, // allow up to 5 MB files
};

let processImage = Multer({
    storage: Multer.memoryStorage(),
    fileFilter: multerFilter,
    limits: limit,
}).single('image');

module.exports = util.promisify(processImage);
