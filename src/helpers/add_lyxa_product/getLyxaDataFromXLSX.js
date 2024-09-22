const XLSX = require('xlsx');
const fs = require('fs');
const { cellAddresses: colNames } = require('../add_shop_product/colList');
const {
    getNutritionValidation,
    sameColumnSameData,
} = require('../add_shop_product/getDataFromExcel');
const AppSetting = require('../../models/AppSetting.js');
const { shopType, productType } = require('./sheet2');
const { uploadProgressBarLyxa } = require('./../../config/socket');
const NutritionModel = require('../../models/NutritionModel');

const deleteFile = filePath => {
    fs.access(filePath, fs.constants.F_OK, err => {
        if (err) {
            console.error(`File does not exist: ${filePath}`);
            return;
        }
        // File exists, proceed to delete it
        fs.unlink(filePath, err => {
            if (err) {
                console.error(`Error deleting the file: ${err}`);
                return;
            }
            console.log(
                'File deleted successfully from this directory: ' + filePath
            );
        });
    });
};

const getCellValue = (worksheet, cell) => {
    const cellObject = worksheet[cell];
    let data = cellObject && cellObject.v !== undefined
        ? typeof cellObject.v === 'string' && cellObject.v.trim() === ''
            ? null
            : cellObject.v
        : null;
    if (data!==null && typeof data === 'string')    data = data.trim();
    return data;
};

const isEmptyRow = (worksheet, rowNum) => {
    for (let i = 0; i < colNames.length; i++) {
        const header1 = getCellValue(worksheet, `${colNames[i]}1`);
        const header2 = getCellValue(worksheet, `${colNames[i]}2`);
        if (header1 === null && header2 === null) break;
        const data = getCellValue(worksheet, `${colNames[i]}${rowNum}`);
        if (data !== null) return false;
    }
    return true;
};

exports.numberOfRows = async filePath => {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    let totalRow = 0;
    const nutritionNamesList = await NutritionModel.find(
        { status: 'active' },
        'name'
    ).exec();
    const nutrition = nutritionNamesList.map(doc => doc.name);

    const nutritionColStartIdx = colNames.indexOf('R');
    let nutritionInExcelCount = 0;

    let misMatch = false;

    for (let i = nutritionColStartIdx; i < colNames.length; i+=2) {
        const header2 = getCellValue(worksheet, `${colNames[i]}2`);
        if (header2 === null) break;
        nutritionInExcelCount++;
        if (!nutrition.includes(header2)) {
            misMatch = true;
            break;
        }
    }

    for (let i = 3; i <= 50000; i++) {
        if (!isEmptyRow(worksheet, i)) totalRow++;
        else break;
    }

    if (nutritionInExcelCount !== nutrition.length) misMatch = true;
    if (misMatch || totalRow === 0) deleteFile(filePath);
    return { misMatch, totalRow };
};

// For global product add
exports.getLyxaDataFromXLSX = async (filePath, progressBarData, uniqueKey) => {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const unitResult = await AppSetting.findOne({}).select('units').exec();
    const unitListFromDB = unitResult.units;

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Using the first sheet in the workbook
    const worksheet = workbook.Sheets[sheetName];

    // Header name mapping
    const headerMapping = {
        name: 'Name',
        type: 'Shop Type',
        barcodeNumber: 'Unique Barcode',
        storedTemperature: 'Stored Temperature',
        images: 'Product Photo',
        productType: 'Product Type',
        dietary: 'Dietary', // This will be a collection of dietary preferences
    };
    // Extract all data, starting from row 3
    const getAllData = worksheet => {
        const data = [];
        let rowNum = 3; // Start from row 3

        while (true) {
            const dietaryList = [];

            const row = {
                name: getCellValue(worksheet, `A${rowNum}`),
                type: getCellValue(worksheet, `B${rowNum}`),
                barcodeNumber: getCellValue(worksheet, `C${rowNum}`),
                storedTemperature: getCellValue(worksheet, `D${rowNum}`),
                images: getCellValue(worksheet, `E${rowNum}`),
                productType: getCellValue(worksheet, `F${rowNum}`),
            };

            if (isEmptyRow(worksheet, rowNum)) break;

            if (row.type === null || row.type === undefined)
                row.type = 'grocery';
            if (row.productType === null || row.productType === undefined)
                row.productType = 'other';
            if (typeof row.type === 'string') row.type = row.type.toLowerCase();
            if (typeof row.productType === 'string')
                row.productType = row.productType.toLowerCase();

            // Set barcodeNumber to '0000000' if it's undefined, null, or empty
            if (row.barcodeNumber === null || row.barcodeNumber === undefined) {
                row.barcodeNumber = '0000000';
            } else {
                row.barcodeNumber = row.barcodeNumber.toString().trim();
            }

            if (row.name !== null || row.name !== undefined)
                row.name = row.name?.toString();

            if (row.type !== 'pharmacy') {
                if (getCellValue(worksheet, `G${rowNum}`) === 'Yes')
                    dietaryList.push('gluten-free');
                if (getCellValue(worksheet, `H${rowNum}`) === 'Yes')
                    dietaryList.push('low-cal');
                if (getCellValue(worksheet, `I${rowNum}`) === 'Yes')
                    dietaryList.push('vegetarian');
                if (getCellValue(worksheet, `J${rowNum}`) === 'Yes')
                    dietaryList.push('vegan');
                if (getCellValue(worksheet, `K${rowNum}`) === 'Yes')
                    dietaryList.push('keto');
                if (getCellValue(worksheet, `L${rowNum}`) === 'Yes')
                    dietaryList.push('lactose-free');
                if (getCellValue(worksheet, `M${rowNum}`) === 'Yes')
                    dietaryList.push('high-protein');

                row.dietary = dietaryList;
            }

            if (
                row.storedTemperature === null ||
                row.storedTemperature === undefined
            )
                delete row.storedTemperature;
            data.push(row);
            rowNum++;

            // progress bar
            uploadProgressBarLyxa(uniqueKey, 0, progressBarData, 'reading...');
        }
        return data;
    };

    // Get all data from the worksheet
    const productList = getAllData(worksheet);

    deleteFile(filePath);

    const missingRowData = [];
    const barcodeList = [];
    const nameList = [];
    const notNumberList = [];

    const invalidShopType = [];
    const invalidProductType = [];

    productList.forEach((item, index) => {
        const curRowData = [];
        for (const [key, value] of Object.entries(item)) {
            if (key === 'images') continue; // ignore image upload
            if (
                value === null ||
                value === undefined ||
                (typeof value === 'string' && value.length === 0)
            ) {
                curRowData.push(headerMapping[key] || key);
            }
            if (
                key === 'storedTemperature' &&
                value !== null &&
                value !== undefined &&
                typeof value !== 'number'
            )
                notNumberList.push(index + 3);

            if (value && key === 'type' && !shopType.includes(value))
                invalidShopType.push(index + 3);
            if (value && key === 'productType' && !productType.includes(value))
                invalidProductType.push(index + 3);
        }

        if (curRowData.length > 0) {
            missingRowData.push(
                `Row ${index + 3} has missing [${curRowData.join(', ')}]`
            );
        }
        barcodeList.push(item.barcodeNumber);
        nameList.push(item.name?.toString()?.toLowerCase());

        // progress bar
        uploadProgressBarLyxa(uniqueKey, 0, progressBarData, 'validating...');
    });

    // Validate nutrition data
    const nutritionColStartIdx = colNames.indexOf('R');
    const atLeastOneNutrition = [];
    for (let i = 0; i < productList.length; i++) {
        let nutrition = getNutritionValidation(
            worksheet,
            i + 3,
            unitListFromDB,
            missingRowData,
            atLeastOneNutrition,
            ['N', 'O', 'P', 'Q'],
            nutritionColStartIdx
        );
        productList[i] = {
            ...productList[i],
            ...nutrition,
        };

        // progress bar
        uploadProgressBarLyxa(uniqueKey, 0, progressBarData, 'validating...');
    }
    sameColumnSameData(nameList, 'Names', null, 3, missingRowData);
    sameColumnSameData(barcodeList, 'Barcodes', '0000000', 3, missingRowData);

    if (notNumberList.length) {
        missingRowData.push(
            `Stored Temperature of Rows [${notNumberList}] are not numbers`
        );
    }
    if (invalidShopType.length > 0) {
        missingRowData.push(
            `Shop Type of Rows [${invalidShopType.join(
                ', '
            )}] are not valid (Column B)`
        );
    }

    if (invalidProductType.length > 0) {
        missingRowData.push(
            `Product Type of Rows [${invalidProductType.join(
                ', '
            )}] are not valid (Column F)`
        );
    }

    if (atLeastOneNutrition.length) {
        missingRowData.push(
            `Rows [${atLeastOneNutrition.join(
                ', '
            )}] must contain at least 1 nutrition`
        );
    }

    return { productList, missingRowData };
};

