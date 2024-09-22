const XLSX = require('xlsx');
const fs = require('fs').promises;
const { cellAddresses: colNames } = require('./colList');

const AppSetting = require('../../models/AppSetting.js');
const SubCategoryModel = require('../../models/SubCategoryModel');
const CategoryModel = require('../../models/CategoryModel');
const ShopCategory = require('../../models/ShopCategory');
const NutritionModel = require('../../models/NutritionModel');

const {productType, shopType} = require('./sheet2');
const {uploadProgressBar} = require('./../../config/socket');
const {getCatWithSub} = require('./getCatWithSub');


const sameColumnSameData = (
    colData,
    colName,
    skippedData,
    rowStartingFrom,
    missingRowData
) => {
    const tmpArray = new Array(colData.length + 10).fill(null).map(() => []);
    const errorRowList = [];
    colData.forEach((item, index) => {
        if (item && item !== skippedData) {
            const firstOccurrence = colData.indexOf(item);
            if (firstOccurrence !== index) {
                if (!tmpArray[firstOccurrence + rowStartingFrom].length) {
                    tmpArray[firstOccurrence + rowStartingFrom].push(
                        firstOccurrence + rowStartingFrom
                    );
                    errorRowList.push(firstOccurrence + rowStartingFrom);
                }
                tmpArray[firstOccurrence + rowStartingFrom].push(
                    index + rowStartingFrom
                );
            }
        }
    });
    errorRowList.forEach(item => {
        missingRowData.push(`Rows [${tmpArray[item].join(', ')}] have same ${colName}`);
    });
}

const getCategorySubcategoryIds = (categoryName, subcategoryName, categoryWithSubCategoryPlusId) => {
    const wrongCombination = {
        categoryId: null,
        subcategoryId: null,
    }

    if (!categoryName || !subcategoryName)  return wrongCombination;

    if (categoryWithSubCategoryPlusId[categoryName] === undefined)          return wrongCombination;
    if (!Array.isArray(categoryWithSubCategoryPlusId[categoryName]))        return wrongCombination;
    if (!Array.isArray(categoryWithSubCategoryPlusId[categoryName][1]))     return wrongCombination;
    if (!Array.isArray(categoryWithSubCategoryPlusId[categoryName][2]))     return wrongCombination;

    let index = categoryWithSubCategoryPlusId[categoryName][2].indexOf(subcategoryName);
    
    if(index < 0)   return wrongCombination;
    return {
        categoryId: categoryWithSubCategoryPlusId[categoryName][0][0],
        subcategoryId: categoryWithSubCategoryPlusId[categoryName][1][index],
    };
}


const getCellValue = (worksheet, cell) => {
    const cellObject = worksheet[cell];
    // return cellObject && cellObject.v !== undefined ? cellObject.v : null;
    let data = cellObject && cellObject.v !== undefined ? typeof cellObject.v === 'string' && cellObject.v.trim() === '' ? null : cellObject.v
     : null;

    if (data!==null && typeof data === 'string')    data = data.trim();
    return data;
};

const deleteFile = async (filePath, shopId) => {
    try {
        await fs.access(filePath); // Check if the file exists
        await fs.unlink(filePath); // Delete the file
        console.log(
            'File deleted successfully from this directory: ' + filePath
        );
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('File does not exist, nothing to delete.');
        } else {
            console.error(`Error deleting the file: ${err}`);
        }
    }
};

const isEmptyNutrition = (worksheet, rowNum, nutritionColStartIdx) => {
    for (let i = nutritionColStartIdx; i < colNames.length; i++) {
        const currentColHeader = getCellValue(worksheet, `${colNames[i]}2`);
        if(!currentColHeader)   break;
        const data = getCellValue(worksheet, `${colNames[i]}${rowNum}`);
        if (data!==null)    return false;
    }
    return true;
}

const isEmptyOtherCellsWithoutNutrition = (worksheet, rowNum) => {
    const otherCellsColList = [
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", 
        "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V"
    ];
    for (let i = 0; i < otherCellsColList.length; i++) {
        const data = getCellValue(worksheet, `${otherCellsColList[i]}${rowNum}`);
        if (data!==null)    return false;
    }
    return true;
}


const getNonEmptyRowCount = async (filePath) => {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; 
    const worksheet = workbook.Sheets[sheetName];  
    const nutritionColStartIdx = colNames.indexOf("AA");
    let totalRow = 0;

    const nutritionNamesList = await NutritionModel.find(
        { status: 'active' },
        'name'
    ).exec();
    const nutrition = nutritionNamesList.map(doc => doc.name);

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
        if (!isEmptyOtherCellsWithoutNutrition(worksheet, i)
            || !isEmptyNutrition(worksheet, i, nutritionColStartIdx)) totalRow++;
        else break;
    }

    if (nutritionInExcelCount !== nutrition.length) misMatch = true;
    if (misMatch || totalRow === 0) deleteFile(filePath, shopId);
    
    return { misMatch, totalRow };
}

const getNutritionValidation = (
    worksheet,
    rowNum,
    unitListFromDB,
    missingRowData,
    atLeastOneNutrition,
    mainNutritionColList,
    nutritionColStartIdx
) => {

    let mainNutrition = {};
    const missingCurrentRowData = []; // Row ${rowNum} has missing columns         .
    let unitNotInDB = []; // Row ${rowNum} containing columns        units are not in Database.
    const mustNumbers = []; // Row ${rowNum} having columns        must be numbers.

    mainNutrition.nutritionServingSize = getCellValue(worksheet, `${mainNutritionColList[0]}${rowNum}`); // number // pack size
    mainNutrition.nutritionServingUnit = getCellValue(worksheet, `${mainNutritionColList[1]}${rowNum}`); // must be in db // unit
    mainNutrition.nutritionPerUnit = getCellValue(worksheet, `${mainNutritionColList[2]}${rowNum}`); // number // serving size
    mainNutrition.nutritionCalories = getCellValue(worksheet, `${mainNutritionColList[3]}${rowNum}`); // number // calories

    if (
        mainNutrition.nutritionServingSize === null ||
        mainNutrition.nutritionServingSize === undefined
    )
        missingCurrentRowData.push(`${mainNutritionColList[0]}`);
    else if (typeof mainNutrition.nutritionServingSize !== "number")
        mustNumbers.push(`${mainNutritionColList[0]}`);

    if (
        mainNutrition.nutritionServingUnit === null ||
        mainNutrition.nutritionServingUnit === undefined
    )
        missingCurrentRowData.push(`${mainNutritionColList[1]}`);
    else {
        // mainNutrition.nutritionServingUnit = typeof mainNutrition.nutritionServingUnit ===
        // 'string' ? mainNutrition.nutritionServingUnit.toLowerCase() : mainNutrition.nutritionServingUnit;
        if (!unitListFromDB.includes(mainNutrition.nutritionServingUnit))
            unitNotInDB.push(`${mainNutritionColList[1]}`);
    }

    if (
        mainNutrition.nutritionPerUnit === null ||
        mainNutrition.nutritionPerUnit === undefined
    )
        missingCurrentRowData.push(`${mainNutritionColList[2]}`);
    else if (typeof mainNutrition.nutritionPerUnit !== "number")
        mustNumbers.push(`${mainNutritionColList[2]}`);

    if (
        mainNutrition.nutritionCalories === null ||
        mainNutrition.nutritionCalories === undefined
    )
        missingCurrentRowData.push(`${mainNutritionColList[3]}`);
    else if (typeof mainNutrition.nutritionCalories !== "number")
        mustNumbers.push(`${mainNutritionColList[3]}`);

    const nutrition = [];

    for (let col = nutritionColStartIdx; col + 1 < colNames.length;  col += 2) {
        let nutritionCol = colNames[col];
        let unitCol = colNames[col + 1];

        let nutritionHeader = getCellValue(worksheet, `${colNames[col]}2`);
        let unitHeader = getCellValue(worksheet, `${colNames[col + 1]}2`);
        if (!nutritionHeader && !unitHeader) break;
        let name = nutritionHeader;
        let unitQuantity = getCellValue(worksheet, `${nutritionCol}${rowNum}`); // number
        let unit = getCellValue(worksheet, `${unitCol}${rowNum}`); // must be in unitListFromDB

        if (unit === null && unitQuantity === null) continue;

        if (unit === null || unit === undefined)
            missingCurrentRowData.push(`${unitCol}`);
        else {
            // unit = typeof unit === 'string' ? unit.toLowerCase() : unit;
            if (!unitListFromDB.includes(unit)) {
                unitNotInDB.push(unitCol);
            }
        }

        if (unitQuantity === null || unitQuantity === undefined)
            missingCurrentRowData.push(nutritionCol);
        else if (typeof unitQuantity !== "number") {
            mustNumbers.push(nutritionCol);
        }

        nutrition.push({
            name,
            unitQuantity,
            unit,
        });
    }

    if (nutrition.length > 0) mainNutrition.nutrition = nutrition;

    for (const key in mainNutrition) {
        if (mainNutrition[key] === null || mainNutrition[key] === undefined) {
            delete mainNutrition[key];
        }
    }

    if (Object.keys(mainNutrition).length && missingCurrentRowData.length > 0)
        missingRowData.push(
            `Row [${rowNum}] has missing columns: [${missingCurrentRowData.join(
                ", ",
            )}]`,
        );

    if (Object.keys(mainNutrition).length && unitNotInDB.length > 0)
        missingRowData.push(
            `Row [${rowNum}] containing columns: [${unitNotInDB.join(
                ", ",
            )}] units are not in Database.`,
        );

    if (Object.keys(mainNutrition).length && mustNumbers.length > 0) {
        missingRowData.push(
            `Row [${rowNum}] having columns: [${mustNumbers.join(
                ", ",
            )}] must be numbers.`,
        );
    }

    if (Object.keys(mainNutrition).length && !nutrition.length) {
        atLeastOneNutrition.push(rowNum);
    }

    return mainNutrition;
};


const getCategoryToMaxQuantityValidation = async (
    worksheet, 
    rowNum, 
    unitListFromDB, 
    missingRowData, 
    colS_valid,
    shopId, 
    categoryWithSubCategoryPlusId
    ) => {
        let data = {};    
        // N to V
        // if (Object.keys(mainNutrition).length && missingCurrentRowData.length > 0)
        //     missingRowData.push(
        //         `Row [${rowNum}] has missing columns: [${missingCurrentRowData.join(
        //             ', '
        //         )}]`
        //     );
        
        const missingCurrentRowData = [];
        const mustNumbers = [];


        let categoryData = getCellValue(worksheet, `N${rowNum}`);
        if (!categoryData)      missingCurrentRowData.push("N");
        let subcategoryData = getCellValue(worksheet, `O${rowNum}`);
        if (!subcategoryData)   missingCurrentRowData.push("O");

        
        let {categoryId, subcategoryId } = getCategorySubcategoryIds(categoryData, subcategoryData, categoryWithSubCategoryPlusId);

        let seoDescription = getCellValue(worksheet, `P${rowNum}`);
        if (!seoDescription)  seoDescription = "";

        let price = getCellValue(worksheet, `Q${rowNum}`);

        if (price === null) missingCurrentRowData.push("Q");
        if (price!==null && typeof price !== 'number') {
            mustNumbers.push('Q');
        }
        if (price!==null && price <= 0) {
            missingRowData.push(`Row ${rowNum} must have price greater than zero (Column Q)`);
        }

        let isStockEnabled = false;
        let stockQuantity = getCellValue(worksheet, `R${rowNum}`);

        if (stockQuantity && typeof stockQuantity !== 'number') 
            mustNumbers.push('R');
        else if (stockQuantity && typeof stockQuantity === 'number')
            isStockEnabled = true;



        let unit = getCellValue(worksheet, `S${rowNum}`);
        let unitQuantity = getCellValue(worksheet, `T${rowNum}`);

        /*
        if (unit === null || unit === undefined) {
            // unit = "";
            // unitQuantity = "";
            if (unitQuantity !== null) {
                missingCurrentRowData.push('S');
                if (typeof unitQuantity !== 'number'){
                    mustNumbers.push('T');
                }
            } 

        }
        else {
            // unit = typeof unit === 'string' ? unit.toLowerCase() : unit;
            if (!unitListFromDB.includes(unit)) {
                colS_valid.push(rowNum);
                // missingRowData.push(`Row ${rowNum} column S unit not found in database`);
                // unitNotInDB.push(unitCol);
            } 
            
            if (unitQuantity === null || unitQuantity === undefined) {
                missingCurrentRowData.push('T');
            }
            else if (typeof unitQuantity !== 'number') 
                mustNumbers.push('T');
        }
        */
        if (unit === null || unit === undefined) {
            if (unitQuantity !== null) {
                missingCurrentRowData.push('S');
                if (typeof unitQuantity !== 'number'){
                    mustNumbers.push('T');
                }
            } 

        }
        else {
            // unit = typeof unit === 'string' ? unit.toLowerCase() : unit;
            if (!unitListFromDB.includes(unit)) {
                colS_valid.push(rowNum);
                // missingRowData.push(`Row ${rowNum} column S unit not found in database`);
                // unitNotInDB.push(unitCol);
            } 
            
            if (unitQuantity === null || unitQuantity === undefined) {
                missingCurrentRowData.push('T');
            }
            else if (typeof unitQuantity !== 'number') 
                mustNumbers.push('T');
        }
        
        let isEnabledMaximumQuantity = false;

        let orderQuantityLimit = getCellValue(worksheet, `U${rowNum}`);

        if (orderQuantityLimit === null) {
            orderQuantityLimit = "";
        }
        else if (typeof orderQuantityLimit === 'number' && orderQuantityLimit > 0) {
            isEnabledMaximumQuantity = true;
        }
        else if (typeof orderQuantityLimit !== 'number') {
            mustNumbers.push('U');
        }

        let note = getCellValue(worksheet, `V${rowNum}`);
        if (note === null)  note = "";

        data.category = categoryId;
        data.subCategory = subcategoryId;

        data = {
            ...data, 
            seoDescription,
            price,
            isStockEnabled,
            stockQuantity,
            unit,
            unitQuantity,
            isEnabledMaximumQuantity,
            orderQuantityLimit,
            note,
        }
        if (!isStockEnabled)  delete data.stockQuantity;
        if (unit === "") delete data.unitQuantity;
        if (isEnabledMaximumQuantity === false) delete data.orderQuantityLimit;


        if (missingCurrentRowData.length > 0) {
            missingRowData.push(
                `Row [${rowNum}] has missing columns: [${missingCurrentRowData.join(
                    ', '
                )}]`
            );
        }

        if (mustNumbers.length > 0) {
            missingRowData.push(
                `Row [${rowNum}] having columns: [${mustNumbers.join(
                    ', '
                )}] must be numbers.`
            );
        }
        
        if (categoryData && subcategoryData && (!categoryId || !subcategoryId)) {
            missingRowData.push(
                `Row [${rowNum}] has combination of invalid category and subcategory. [Column: N, O]`
            );
        }

        return data;
}


// For shop product add
const getShopProductDataFromXLSX = async (filePath, shopId, sellerId, progressBarData, uniqueKey) => {
    // if (!fs.existsSync(filePath)) {
    //     throw new Error(`File not found: ${filePath}`);
    // }

    try {
        await fs.access(filePath);
        const unitResult = await AppSetting.findOne({}).select('units').exec();
        const unitListFromDB = unitResult.units;

        const { categoryWithSubCategoryPlusId } = await getCatWithSub(shopId);
        const workbook = XLSX.readFile(filePath);

        // Specify the sheet name or index
        const sheetName = workbook.SheetNames[0]; // Using the first sheet in the workbook
        const worksheet = workbook.Sheets[sheetName];        // Header name mapping
        const headerMapping = {
            name: 'Name',
            type: 'Shop Type',
            barcodeNumber: 'Unique Barcode',
            storedTemperature: 'Stored Temperature',
            images: 'Product Photo',
            productType: 'Product Type',
            dietary: 'Dietary', // This will be a collection of dietary preferences
        };

        const nutritionColStartIdx = colNames.indexOf('AA');
        // Extract all data, starting from row 3
        const getAllData = worksheet => {
            const data = [];
            let rowNum = 3; // Start from row 3
            let cellValue = getCellValue(worksheet, `A${rowNum}`);

            while (true) {
                const dietaryList = [];

                let row = {
                    name: getCellValue(worksheet, `A${rowNum}`),
                    type: getCellValue(worksheet, `B${rowNum}`),
                    barcodeNumber: getCellValue(worksheet, `C${rowNum}`),
                    storedTemperature: getCellValue(worksheet, `D${rowNum}`),
                    images: getCellValue(worksheet, `E${rowNum}`),
                    productType: getCellValue(worksheet, `F${rowNum}`),
                };

                if (
                    isEmptyOtherCellsWithoutNutrition(worksheet, rowNum) &&
                    isEmptyNutrition(worksheet, rowNum, nutritionColStartIdx)
                )
                    break;

                if (row.type === null || row.type === undefined)
                    row.type = 'grocery';

                if (row.productType === null || row.productType === undefined)
                    row.productType = 'other';

                if (typeof row.type === 'string')
                    row.type = row.type.toLowerCase();

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

                if (row.type === 'grocery') {
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

                // for (const key in row) {
                //     if (typeof row[key] === 'string') {
                //         row[key] = row[key].trim();
                //     }
                // }
                if (
                    row.storedTemperature === null ||
                    row.storedTemperature === undefined
                )
                    delete row.storedTemperature;
                data.push(row);
                rowNum++;
                cellValue = getCellValue(worksheet, `A${rowNum}`);

                // progress bar
                uploadProgressBar(shopId, uniqueKey, 0, progressBarData, "reading... 1");

            }
            return data;
        };

        // Get all data from the worksheet
        const productList = getAllData(worksheet);

        // Check for missing values and log rows with missing data
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
                if (key === 'storedTemperature') {
                    if ( value !== null && value !== undefined && typeof value !== 'number' )   notNumberList.push(index + 3);
                }
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
            uploadProgressBar(shopId, uniqueKey, 0, progressBarData, "validatiing... 2");

        });

        if (notNumberList.length) {
            missingRowData.push(
                `Stored Temperature of Rows [${notNumberList.join(', ')}] are not numbers`
            );
        }

        sameColumnSameData(nameList, 'Names', null, 3, missingRowData);
        sameColumnSameData(
            barcodeList,
            'Barcodes',
            '0000000',
            3,
            missingRowData
        );

        const atLeastOneNutrition = [];
        const colS_validation = [];

        for (let i = 0; i < productList.length; i++) {
            let nutrition = getNutritionValidation(
                worksheet,
                i + 3,
                unitListFromDB,
                missingRowData,
                atLeastOneNutrition,
                ["W", "X", "Y", "Z"],
                nutritionColStartIdx
            );
            
            let otherData = await getCategoryToMaxQuantityValidation(
                worksheet, 
                i + 3,
                unitListFromDB,
                missingRowData,
                colS_validation,
                shopId, 
                categoryWithSubCategoryPlusId
            )

            let extraField = {
                shop: shopId,
                updatedBy: "shop",
                productVisibility: true,
                status: 'active',
                seller: sellerId,
                isDrinkIncluded: false,
                priceType: 'price',
                portionPrices: [],
                pricePerUnit: {},
                freeDelivery: false,
                isFeatured: false,
            }

            productList[i] = {
                ...productList[i],
                ...extraField,
                ...otherData,
                ...nutrition,
            };

            // Progress bar
            uploadProgressBar(shopId, uniqueKey, 0, progressBarData, "validatiing...3");

        }
        if (colS_validation.length) {
            missingRowData.push(`Rows [${colS_validation.join(', ')}] having units are not in database (Column S)`);
        }

        if (invalidShopType.length > 0) {
            missingRowData.push(`Shop Type of Rows [${invalidShopType.join(', ')}] are not valid (Column B)`);
        }

        if (invalidProductType.length > 0) {
            missingRowData.push(
                `Product Type of Rows [${invalidProductType.join(', ')}] are not valid (Column F)`
            );
        }
        
        if (atLeastOneNutrition.length) {
            missingRowData.push(`Rows [${atLeastOneNutrition.join(', ')}] must contain at least 1 nutrition`);
        }

        // console.log('======== Parsed Product List from Excel ========');
        // productList.forEach(item => {
        //     console.log(item, '\n');
        // });
        // console.log('======== Parsed Product List from Excel ========');

        deleteFile(filePath, shopId);

        // console.log('\n\n============ Excel Validation ==============');
        // console.log(missingRowData);
        // console.log('============ Excel Validation ==============\n\n');

        return { productList, missingRowData };
    } catch (err) {
        console.log(err);
    }
};


module.exports = {
    getCategorySubcategoryIds,
    getShopProductDataFromXLSX,
    getCategoryToMaxQuantityValidation,
    getNonEmptyRowCount,
    getNutritionValidation,
    sameColumnSameData,
};
