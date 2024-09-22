const { errorHandler } = require('../helpers/apiResponse');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
// const STATIC_DIR = `./database/backup/`;
const { Storage } = require('@google-cloud/storage');

const storage = new Storage({
    projectId: 'for-poc-325210',
    keyFilename: './lyxa-db-backup-gcp-service-key.json',
});
const bucketName = 'lyxa-db-backup';
const bucket = storage.bucket(bucketName);

exports.backupAllData = async (req, res) => {
    try {
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.backupCollection = async (req, res) => {
    try {
        const allBackUp = req.body.allBackUp || false;
        let collections = [];

        if (allBackUp) {
            collections = getAllModelFiles();
        } else {
            collections = req.body.collections;
        }

        // check colloection is array or not
        if (!Array.isArray(collections)) {
            return res.status(400).json({
                success: false,
                message: 'Collection must be array',
            });
        }

        // check collection is empty or not
        if (collections.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Collection must be not empty',
            });
        }

        const databaseFolder = fs.readdirSync(
            path.join(__dirname, '../../database')
        );
        databaseFolder.sort((a, b) => {
            return new Date(a) - new Date(b);
        });

        // delete old backup folder
        if (
            databaseFolder.length >= 3 &&
            databaseFolder.at(-1) !== moment().format('MMMM-DD-YYYY')
        ) {
            const oldFolder = databaseFolder[0];
            fs.rmdirSync(path.join(__dirname, `../../database/${oldFolder}`), {
                recursive: true,
            });
        }

        const backupDir = `./database/${moment().format('MMMM-DD-YYYY')}/`;
        const backupDirHave = fs.existsSync(backupDir);
        if (!backupDirHave) {
            fs.mkdirSync(backupDir);
        }

        for (i = 0; i < collections.length; i++) {
            const fileName = collections[i];
            const Model = require(`../models/${fileName}`);
            const data = await Model.find();
            const newData = [];
            // for (const element of data) {
            //     const item = element;
            //     newData.push({
            //         ...item._doc,
            //         _id: { "$oid": item._id },
            //         createdAt: { "$date": item.createdAt },
            //         updatedAt: { "$date": item.updatedAt }
            //     })
            // }

            const dataString = JSON.stringify(data);
            const file = backupDir + fileName;
            fs.writeFileSync(file, dataString);
            // console.log(`Backup ${fileName} successfully`);

            //*** Backup database upload to google bucket storage Start ***/
            const gcsFilePath = `${moment().format(
                'MMMM-DD-YYYY'
            )}/${fileName}`; // Modify the path as needed
            await bucket.upload(file, {
                destination: gcsFilePath,
                gzip: true, // Optional: Compress the file before uploading
            });
            //*** Backup database upload to google bucket storage End ***/
        }

        return res.status(200).json({
            success: true,
            message: `Backup successfully`,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllCollections = async (req, res) => {
    try {
        // get all files in models folder and remove subSchema.js file
        const files = getAllModelFiles();

        // filter files to get only .js files
        const models = files.filter(file => file.endsWith('.js'));

        const databaseFolder = fs.readdirSync(
            path.join(__dirname, '../../database')
        );
        databaseFolder.sort((a, b) => {
            return new Date(a) - new Date(b);
        });

        let folderGet =
            databaseFolder.at(-1) || moment().format('MMMM-DD-YYYY');
        const collections = models.map(model => {
            const { size, mtime, ctime } = fileInfo(
                path.join(__dirname, `../../database/${folderGet}/${model}`)
            );
            return {
                name: model
                    .split('.')[0]
                    .replace(/([A-Z])/g, ' $1')
                    .replace('Model', '')
                    .trim(),
                size: size,
                modifyTime: mtime
                    ? moment(mtime).format('MMMM Do YYYY, h:mm:ss a')
                    : null,
                fileName: model,
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                tables: collections,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllCollectionsFromStorageBucket = async (req, res) => {
    try {
        const folderGet = await getLatestBackupFolder(bucketName);
        console.log(folderGet);

        if (!folderGet) {
            console.log('No backup found in GCS bucket.');
            return res.status(200).json({
                success: false,
                message: `No backup found in GCS bucket`,
            });
        }

        // get all files in models folder and remove subSchema.js file
        const files = getAllModelFiles();

        const collections = [];

        for (const fileName of files) {
            const gcsFilePath = `${folderGet}/${fileName}`;

            // Download the file from GCS bucket
            const bucket = storage.bucket(bucketName);
            const file = bucket.file(gcsFilePath);

            const [metadata] = await file.getMetadata();
            const size = metadata.size;
            const modifyTime = metadata.updated
                ? moment(metadata.updated).format('MMMM Do YYYY, h:mm:ss a')
                : null;
            const name = fileName
                .split('.')[0]
                .replace(/([A-Z])/g, ' $1')
                .replace('Model', '')
                .trim();

            collections.push({
                name,
                size,
                modifyTime,
                fileName,
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                tables: collections,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

function fileInfo(path) {
    if (fs.existsSync(path)) {
        const { size, mtime, ctime } = fs.statSync(path);
        return { mtime, size, ctime };
    } else {
        return { mtime: null, size: null, ctime: null };
    }
}

const getAllModelFiles = () => {
    const files = fs.readdirSync(path.join(__dirname, '../models'));
    const index = files.indexOf('subSchema.js');
    if (index > -1) {
        files.splice(index, 1);
    }

    // also remove AdminModel
    const indexAdminModel = files.indexOf('AdminModel.js');
    if (indexAdminModel > -1) {
        files.splice(indexAdminModel, 1);
    }
    return files;
};

exports.deleteAllCollections = async (req, res) => {
    try {
        // get all files in models folder and remove subSchema.js file
        const files = getAllModelFiles();
        for (let i = 0; i < files.length; i++) {
            const fileName = files[i];
            const Model = require(`../models/${fileName}`);
            // delete all data in collection
            await Model.deleteMany();
        }

        return res.status(200).json({
            success: true,
            message: `Deleted all collection successfully`,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.reStoreCollection = async (req, res) => {
    try {
        const { collectionName } = req.body;
        const Model = require(`../models/${collectionName}`);
        const databaseFolder = fs.readdirSync(
            path.join(__dirname, '../../database')
        );
        databaseFolder.sort((a, b) => {
            return new Date(a) - new Date(b);
        });
        let folderGet =
            databaseFolder.at(-1) || moment().format('MMMM-DD-YYYY');
        const data = fs.readFileSync(
            path.join(
                __dirname,
                `../../database/${folderGet}/${collectionName}`
            )
        );
        const newData = JSON.parse(data);
        await Model.deleteMany();
        await Model.insertMany(newData);
        return res.status(200).json({
            success: true,
            message: `Restore ${collectionName} successfully`,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.reStoreAllCollection = async (req, res) => {
    try {
        const files = getAllModelFiles();

        const databaseFolder = fs.readdirSync(
            path.join(__dirname, '../../database')
        );
        databaseFolder.sort((a, b) => {
            return new Date(a) - new Date(b);
        });
        let folderGet =
            databaseFolder.at(-1) || moment().format('MMMM-DD-YYYY');
        for (i = 0; i < files.length; i++) {
            const fileName = files[i];
            const Model = require(`../models/${fileName}`);

            // check file exits
            if (
                fs.existsSync(
                    path.join(
                        __dirname,
                        `../../database/${folderGet}/${fileName}`
                    )
                )
            ) {
                const data = fs.readFileSync(
                    path.join(
                        __dirname,
                        `../../database/${folderGet}/${fileName}`
                    )
                );
                const newData = JSON.parse(data);
                await Model.deleteMany();
                await Model.insertMany(newData);
            } else {
            }
        }
        return res.status(200).json({
            success: true,
            message: `Restore all collection successfully`,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.reStoreCollectionFromStorageBucket = async (req, res) => {
    try {
        const { collectionName } = req.body;

        const folderGet = await getLatestBackupFolder(bucketName);
        console.log(folderGet);

        if (!folderGet) {
            console.log('No backup found in GCS bucket.');
            return res.status(200).json({
                success: false,
                message: `No backup found in GCS bucket`,
            });
        }

        const Model = require(`../models/${collectionName}`);

        const gcsFilePath = `${folderGet}/${collectionName}`;

        // Download the file from GCS bucket
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(gcsFilePath);

        const [fileContent] = await file.download();

        // Restore data in the database
        const newData = JSON.parse(fileContent);
        await Model.deleteMany();
        await Model.insertMany(newData);

        return res.status(200).json({
            success: true,
            message: `Restore collection successfully`,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.reStoreAllCollectionFromStorageBucket = async (req, res) => {
    try {
        // const bucketName = 'your-gcs-bucket-name'; // Replace with your GCS bucket name
        const folderGet = await getLatestBackupFolder(bucketName);
        console.log(folderGet);

        if (!folderGet) {
            console.log('No backup found in GCS bucket.');
            return res.status(200).json({
                success: false,
                message: `No backup found in GCS bucket`,
            });
        }

        const files = getAllModelFiles();

        for (const fileName of files) {
            const Model = require(`../models/${fileName}`);

            const gcsFilePath = `${folderGet}/${fileName}`;

            // Download the file from GCS bucket
            const bucket = storage.bucket(bucketName);
            const file = bucket.file(gcsFilePath);

            const [fileContent] = await file.download();

            // Restore data in the database
            const newData = JSON.parse(fileContent);
            await Model.deleteMany();
            await Model.insertMany(newData);
        }

        return res.status(200).json({
            success: true,
            message: `Restore all collection successfully`,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Function to get the latest backup folder from GCS bucket
const getLatestBackupFolder = async bucketName => {
    const [files] = await storage.bucket(bucketName).getFiles({
        prefix: `${moment().format('MMMM-DD-YYYY')}/`,
        delimiter: '/',
    });

    if (files.length === 0) {
        return null;
    }

    // Sort files by name (timestamp) in descending order
    files.sort((a, b) => b.name.localeCompare(a.name));

    // Extract folder name from the latest file
    const latestFile = files[0];
    const folderPath = path.dirname(latestFile.name);
    const folderName = folderPath.substring(''.length);

    return folderName;
};

exports.deleteCollection = async (req, res) => {
    try {
        const { collectionName } = req.body;
        const Model = require(`../models/${collectionName}`);
        await Model.deleteMany();
        return res.status(200).json({
            success: true,
            message: `Delete ${collectionName} successfully`,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.autoBackupCollection = async () => {
    try {
        const collections = getAllModelFiles();

        const databaseFolder = fs.readdirSync(
            path.join(__dirname, '../../database')
        );
        databaseFolder.sort((a, b) => {
            return new Date(a) - new Date(b);
        });

        // delete old backup folder
        if (
            databaseFolder.length >= 3 &&
            databaseFolder.at(-1) !== moment().format('MMMM-DD-YYYY')
        ) {
            const oldFolder = databaseFolder[0];
            fs.rmdirSync(path.join(__dirname, `../../database/${oldFolder}`), {
                recursive: true,
            });
        }

        const backupDir = `./database/${moment().format('MMMM-DD-YYYY')}/`;
        const backupDirHave = fs.existsSync(backupDir);
        if (!backupDirHave) {
            fs.mkdirSync(backupDir);
        }

        for (i = 0; i < collections.length; i++) {
            const fileName = collections[i];
            const Model = require(`../models/${fileName}`);
            const data = await Model.find();
            const newData = [];
            // for (const element of data) {
            //     const item = element;
            //     newData.push({
            //         ...item._doc,
            //         _id: { "$oid": item._id },
            //         createdAt: { "$date": item.createdAt },
            //         updatedAt: { "$date": item.updatedAt }
            //     })
            // }
            const dataString = JSON.stringify(data);
            const file = backupDir + fileName;
            fs.writeFileSync(file, dataString);
            // console.log(`Backup ${fileName} successfully`);

            //*** Backup database upload to google bucket storage Start ***/
            const gcsFilePath = `${moment().format(
                'MMMM-DD-YYYY'
            )}/${fileName}`; // Modify the path as needed
            await bucket.upload(file, {
                destination: gcsFilePath,
                gzip: true, // Optional: Compress the file before uploading
            });
            //*** Backup database upload to google bucket storage End ***/
        }

        return {
            success: true,
            message: `Backup successfully`,
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
        };
    }
};
