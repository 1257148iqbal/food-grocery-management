const {
    validationError,
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const processFile = require('../middleware/uploadSingleImage');
const { format } = require('util');
const { Storage } = require('@google-cloud/storage');
const moment = require('moment');
const path = require('path');
const sharp = require('sharp'); // Import Sharp
const { makeSlug } = require('../helpers/utility');
const storage = new Storage({
    projectId: 'for-poc-325210',
    keyFilename: './google-service-account-key.json',
});
const bucket = storage.bucket('lyxa-bucket');

exports.singleImageUpload = async (req, res) => {
    try {
        await processFile(req, res);
        if (!req.file) {
            return errorResponse(res, 'Please Select a file!');
        }

        // Generate a new filename with a unique identifier
        let nameWithoutExt = path.parse(req.file.originalname).name;
        const extension = path.extname(req.file.originalname);
        let newFilename = `${nameWithoutExt}-${
            process.env.WEBSITE_NAME
        }-${moment().format('DDMMYYHmmss')}-${Math.floor(Math.random() * 100)}`;
        newFilename = makeSlug(newFilename) + extension;

        // Create a Sharp pipeline to resize and process the image
        const imageFormat = extension.toLowerCase();
        let pipeline;

        switch (imageFormat) {
            case '.png':
                pipeline = sharp(req.file.buffer).png({ quality: 80 });
                break;
            case '.webp':
                pipeline = sharp(req.file.buffer).webp({ quality: 80 });
                break;
            default:
                pipeline = sharp(req.file.buffer).jpeg({ quality: 80 });
        }

        // const pipeline = sharp(req.file.buffer).jpeg({ quality: 80 }); // Define your desired dimensions and fit

        const blob = bucket.file(newFilename);
        const blobStream = blob.createWriteStream({
            resumable: false,
        });

        blobStream.on('error', err => {
            return errorHandler(res, err);
        });

        blobStream.on('finish', async data => {
            const publicUrl = format(
                `https://storage.googleapis.com/${bucket.name}/${blob.name}`
            );

            try {
                // Make the uploaded image public
                await bucket.file(blob.name).makePublic();

                successResponse(res, {
                    message: 'File uploaded successfully!',
                    data: {
                        name: blob.name,
                        url: publicUrl,
                    },
                });
            } catch (err) {
                console.log('log-err', err);
                return res.status(500).json({
                    status: false,
                    message: `Uploaded the file successfully: ${req.file.originalname}, but public access is denied!`,
                    data: {
                        url: publicUrl,
                    },
                });
            }
        });

        pipeline.pipe(blobStream); // Pipe the processed image to the blobStream
    } catch (err) {
        console.log(err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(500).send({
                message: 'File size cannot be larger than 5MB!',
            });
        }
        return errorHandler(res, err);
    }
};

// exports.singleImageUpload = async (req, res) => {
//     try {
//         await processFile(req, res);
//         if (!req.file) {
//             return validationError(res, 'Please Select a file!');
//         }

//         let nameWithoutExt = path.parse(req.file.originalname).name;
//         const extension = path.extname(req.file.originalname);
//         let newFilename = `${nameWithoutExt}-${
//             process.env.WEBSITE_NAME
//         }-${moment().format('DDMMYYHmmss')}-${Math.floor(Math.random() * 100)}`;
//         newFilename = makeSlug(newFilename) + extension;

//         // console.log(newFilename);

//         const blob = bucket.file(newFilename);
//         const blobStream = blob.createWriteStream({
//             resumable: false,
//         });

//         blobStream.on('error', err => {
//             return errorHandler(res, err);
//         });

//         blobStream.on('finish', async data => {
//             const publicUrl = format(
//                 `https://storage.googleapis.com/${bucket.name}/${blob.name}`
//             );

//             try {
//                 // await bucket.file(req.file.originalname).makePublic();
//                 // console.log(blob.name);
//                 await bucket.file(blob.name).makePublic();
//                 successResponse(res, {
//                     message: 'File uploaded successfully!',
//                     data: {
//                         name: blob.name,
//                         url: publicUrl,
//                     },
//                 });
//             } catch (err) {
//                 console.log('log-err', err);
//                 return res.status(500).json({
//                     status: false,
//                     message: `Uploaded the file successfully: ${req.file.originalname}, but public access is denied!`,
//                     data: {
//                         url: publicUrl,
//                     },
//                 });
//             }
//         });
//         blobStream.end(req.file.buffer);
//     } catch (err) {
//         console.log(err);
//         if (err.code === 'LIMIT_FILE_SIZE') {
//             return res.status(500).send({
//                 message: 'File size cannot be larger than 2MB!',
//             });
//         }
//         return errorHandler(res, err);
//     }
// };

exports.getListFiles = async (req, res) => {
    try {
        const [files] = await bucket.getFiles();
        let fileInfos = [];

        files.forEach(file => {
            fileInfos.push({
                name: file.name,
                url: file.metadata.mediaLink,
            });
        });

        res.status(200).send(fileInfos);
    } catch (err) {
        console.log(err);

        res.status(500).send({
            message: 'Unable to read list of files!',
        });
    }
};

exports.download = async (req, res) => {
    try {
        const [metaData] = await bucket.file(req.params.name).getMetadata();
        res.redirect(metaData.mediaLink);
    } catch (err) {
        res.status(500).send({
            message: 'Could not download the file. ' + err,
        });
    }
};

exports.imageDownload = async (req, res) => {
    try {
        const { imageUrl } = req.query;

        const response = await fetch(imageUrl);
        const blob = await response.blob();

        res.contentType(response.headers.get('content-type'));

        res.status(200).send(blob);
    } catch (err) {
        res.status(500).send({
            message: 'Could not download the file. ' + err,
        });
    }
};
