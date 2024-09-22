// const { start } = require('repl');
const path = require('path');
const {
    mergeCellsAndSetValue,
    changeCellValues,
} = require('../add_shop_product/excelManipulation');

const fs = require('fs').promises;
const AppSetting = require('../../models/AppSetting');


const productType = ['Meat', 'Chicken', 'Fish', 'Vegetarian', 'Other'].map(item =>
    item.toLowerCase()
);

const shopType = ['Grocery', 'Pharmacy'].map(item => item.toLowerCase());



const cellListForSameCol = (list, colName, startRow) => {
    const cellList = [];
    list.forEach((item, index) => {
        cellList.push(`${colName}${startRow + index}`);
    });
    return cellList;
};

const operationSheet2 = async (outputFilePath) => {
    // const unit = ['gm', 'kg', 'mL', 'liter'];
    const unitResult = await AppSetting.findOne({}).select('units').exec();
    const unit = unitResult.units;


    const shopTypeCellList = cellListForSameCol(shopType, 'A', 2);    
    await changeCellValues(
        outputFilePath,
        'Sheet2',
        shopTypeCellList,
        shopType,
        outputFilePath
    );
    
    const unitCellList = cellListForSameCol(unit, 'B', 2);
    await changeCellValues(
        outputFilePath,
        'Sheet2',
        unitCellList,
        unit,
        outputFilePath
    );

    const productTypeCellList = cellListForSameCol(productType, 'C', 2);
    await changeCellValues(
        outputFilePath,
        'Sheet2',
        productTypeCellList,
        productType,
        outputFilePath
    );

};

module.exports = {
    operationSheet2,
    shopType,
    productType,
};
