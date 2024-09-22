const ExcelJS = require("exceljs");
const path = require("path");
const { start } = require("repl");
const fs = require("fs").promises;
const NutritionModel = require('../../models/NutritionModel');
const ExcelFileModel = require('../../models/ExcelFileModel');
const mongoose = require('mongoose');
const {cellAddresses: colAddresses} = require('./colList');

const { mergeCellsAndSetValue, changeCellValues } = require("./excelManipulation");

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

exports.generateExcelForShopProductAdd = async (shopId) => {
    // const nutrition = ["Protein", "Fat", "Sugar", "Salt"];
    const uniqueId = getUniqueIdentifierByTime();

    const fileName = "addShopProductTemplate_Excel.xlsx";
    const outputFileName = "addShopProduct.xlsx";

    const filePath = path.join(__dirname, fileName);
    
    const excelFileDir = '../../../../public/files/excel-files'
    const outputFilePath = path.join(`${__dirname}${excelFileDir}`, `${uniqueId}_${outputFileName}`);
    // const outputFilePath = path.join(__dirname, `${uniqueId}_${outputFileName}`);

    const nutritionNamesList = await NutritionModel.find({status: 'active'}, 'name').exec();
    const nutrition = nutritionNamesList.map(doc => doc.name);

    const nutritionRow = [];
    const sheetName = "Sheet1";
    let value = "Nutrition";

    const cellAddressesNutrition = [];
    const nutritionColStartIdx = colAddresses.indexOf('AA');
    
    for(let i = nutritionColStartIdx; i < colAddresses.length; i++)
        cellAddressesNutrition.push(`${colAddresses[i]}2`);
    

    nutrition.forEach((item) => {
        nutritionRow.push(item, "Unit");
    });

    let startCell = `${colAddresses[nutritionColStartIdx]}1`;
    let endCell = `${colAddresses[nutritionColStartIdx + nutritionRow.length - 1]}1`;
    
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
        sheetName,
        cellAddressesNutrition,
        nutritionRow,
        outputFilePath,
    );

    await operationSheet2(outputFilePath, outputFilePath, shopId);

    try {
        const isExist = await ExcelFileModel.findOne({
            refModel: 'shop',
            refId: mongoose.Types.ObjectId(shopId),
            filename: { 
                $regex: new RegExp(outputFileName, 'i') 
            }
        });

        if (isExist) {
            await ExcelFileModel.deleteOne({ _id: isExist._id });
        }

        const xlsxData = await fs.readFile(outputFilePath);

        const newFile = new ExcelFileModel({
            refModel: 'shop',
            refId: mongoose.Types.ObjectId(shopId),
            filename: outputFileName, // Save original filename
            xlsxData: xlsxData,
        });
        
        await newFile.save();
        await deleteFileIfExists(outputFilePath);

    } catch (err) {
        console.error(err);
    }
};



// mergeCellsAndSetValues(filePath, sheetName, startRow, endRow, startCol, endCol, value, outputFilePath)
//     .then(() => {
//         console.log(`Cells from ${startCol}${startRow} to ${endCol}${endRow} merged successfully and output to ${outputFilePath}`);
//     })
//     .catch(err => {
//         console.error('Error merging cells:', err);
//     });

// const outputFilePath2 = path.join(__dirname,'output2.xlsx');

// changeCellValues(outputFilePath, sheetName, cellAddresses, nutritionRow, outputFilePath2)
//     .then(() => {
//         console.log(`Values of cells ${cellAddresses.join(', ')} changed successfully and output to ${outputFilePath}`);
//     })
//     .catch(err => {
//         console.error('Error changing cell values:', err);
//     });
