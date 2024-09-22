const { start } = require('repl');
const path = require('path');
const {
    mergeCellsAndSetValue,
    changeCellValues,
} = require('./excelManipulation');
const fs = require('fs').promises;
const AppSetting = require('../../models/AppSetting');
const SubCategoryModel = require('../../models/SubCategoryModel');
const CategoryModel = require('../../models/CategoryModel');

const {getCatWithSub} = require('./getCatWithSub');

const productType = ['Meat', 'Chicken', 'Fish', 'Vegetarian', 'Other'].map(item =>
    item.toLowerCase()
);

const shopType = ['grocery'].map(item => item.toLowerCase());

// const categoryWithSub = [
//     {
//         category: 'Oil',
//         subCategories: ['Oil Test'],
//     },
// ];

async function deleteFileIfExists(filePath) {
    try {
        await fs.access(filePath);
        console.log(`File ${filePath} exists. Proceeding to delete it...`);
        await fs.unlink(filePath);
        console.log(`File ${filePath} successfully deleted`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`File ${filePath} does not exist`);
        } else {
            console.error(
                `Error accessing or deleting file ${filePath}:`,
                error
            );
        }
    }
}

const cellListForSameCol = (list, colName, startRow) => {
    const cellList = [];
    list.forEach((item, index) => {
        cellList.push(`${colName}${startRow + index}`);
    });
    return cellList;
};

const operationSheet2 = async (filePath, outputFilePath, shopId) => {
    // const unit = ['gm', 'kg', 'mL', 'liter'];
    const unitResult = await AppSetting.findOne({}).select('units').exec();
    const unit = unitResult.units;

    const startCellList = [];
    const endCellList = [];
    const category = []; // list
    const subCategories = []; // list
    const subCategoryCellList = [];
    const {categoryWithSub} = await getCatWithSub(shopId);
    let counter = 2;

    categoryWithSub.forEach((item, index) => {
        startCellList.push(`A${counter}`);
        endCellList.push(`A${counter + item.subCategories.length - 1}`);
        category.push(item.category);
        subCategories.push(...item.subCategories);
        counter += item.subCategories.length;
    });

    subCategories.forEach((item, index) => {
        subCategoryCellList.push(`B${index + 2}`);
    });

    await mergeCellsAndSetValue(
        filePath,
        outputFilePath,
        'Sheet2',
        startCellList,
        endCellList,
        category
    );

    await changeCellValues(
        outputFilePath,
        'Sheet2',
        subCategoryCellList,
        subCategories,
        outputFilePath
    );

    const unitCellList = cellListForSameCol(unit, 'D', 2);

    await changeCellValues(
        outputFilePath,
        'Sheet2',
        unitCellList,
        unit,
        outputFilePath
    );

    const productTypeCellList = cellListForSameCol(productType, 'E', 2);

    await changeCellValues(
        outputFilePath,
        'Sheet2',
        productTypeCellList,
        productType,
        outputFilePath
    );

    // await deleteFileIfExists(tmpFilePath);
};

// const inputFilePath = path.join(__dirname, "/addShopProduct.xlsx");

// const outputFilePath = path.join(__dirname, "/output.xlsx");

// operationSheet2(outputFilePath, outputFilePath);

module.exports = {
    operationSheet2,
    productType,
    shopType,
};
