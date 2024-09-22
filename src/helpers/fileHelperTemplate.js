const fs = require('fs');
const multer = require('multer');

const dir = 'public/files/excel-files';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Use original filename
    },
});


const uploadTemplate = multer({ storage });
module.exports = uploadTemplate;