// const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs").promises;
const NutritionModel = require('../../models/NutritionModel');
const ExcelFileModel = require('../../models/ExcelFileModel');
const {cellAddresses: colAddresses} = require('./../add_shop_product/colList');

const { mergeCellsAndSetValue, changeCellValues } = require("../add_shop_product/excelManipulation");

const {operationSheet2} = require('./sheet2');


async function deleteFileIfExists(filePath) {
    try {
        await fs.access(filePath);
        console.log(`File ${filePath} exists. Proceeding to delete it...\n`);
        await fs.unlink(filePath);
        console.log(`File ${filePath} successfully deleted\n`);
    } catch (error) {
        if (error.code === "ENOENT") {
            console.log(`File ${filePath} does not exist`);
        } else {
            console.error(
                `Error accessing or deleting file ${filePath}:`,
                error,
            );
        }
    }
}

const getUniqueIdentifierByTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    const uniqueIdentifier = `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
    return uniqueIdentifier;
}

const generateExcelForLyxaProductAdd = async () => {
    // const nutrition = ["Protein", "Fat", "Sugar", "Salt"];
    const uniqueId = getUniqueIdentifierByTime();

    const fileName = "addLyxaProductTemplate_Excel.xlsx";
    const outputFileName = "addLyxaProduct.xlsx";

    const filePath = path.join(__dirname, fileName);
    
    const excelFileDir = '../../../../public/files/excel-files'
    const outputFilePath = path.join(`${__dirname}${excelFileDir}`, `${uniqueId}_${outputFileName}`);

    const namesList = await NutritionModel.find({status: 'active'}, 'name').exec();
    const nutrition = namesList.map(doc => doc.name);

    const nutritionRow = [];
    let value = "Nutrition";


    const cellAddresses = [];

    const nutritionStartCol = colAddresses.indexOf('R');

    for (let i = nutritionStartCol; i < colAddresses.length; i++) {
        cellAddresses.push(`${colAddresses[i]}2`);
    }

    // colAddresses.forEach((item) => {
    //     cellAddresses.push(`${item}2`);
    // });

    nutrition.forEach((item) => {
        nutritionRow.push(item, "Unit");
    });

    let startCell = `${colAddresses[nutritionStartCol]}1`;
    let endCell = `${colAddresses[nutritionStartCol + nutritionRow.length - 1]}1`;
    
    
    await mergeCellsAndSetValue(
        filePath,
        outputFilePath,
        "Sheet1",
        [startCell],
        [endCell],
        [value],
        true,
    );
    
    await changeCellValues(
        outputFilePath,
        "Sheet1",
        cellAddresses,
        nutritionRow,
        outputFilePath,
    );

    await operationSheet2(outputFilePath);  // do operations on the same file and update

    try {
        const isExist = await ExcelFileModel.findOne({
            refModel: 'admin',
            filename: { 
                $regex: new RegExp(outputFileName, 'i') 
            }
        });

        if (isExist) {
            await ExcelFileModel.deleteOne({ _id: isExist._id });
        }

        const xlsxData = await fs.readFile(outputFilePath);

        const newFile = new ExcelFileModel({
            refModel: 'admin',
            filename: outputFileName, // Save original filename
            xlsxData: xlsxData,
        });
        
        await newFile.save();
        await deleteFileIfExists(outputFilePath);

    } catch (err) {
        console.error(err);
    }
};

module.exports = {
    generateExcelForLyxaProductAdd,
}