const ExcelJS = require("exceljs");
const path = require("path");
const { start } = require("repl");
const fs = require("fs").promises;



exports.mergeCellsAndSetValue = async(
    inputFilePath,
    outputFilePath,
    sheetName,
    startCell,
    endCell,
    value,
    isWrite = true
) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(inputFilePath);
    const worksheet = workbook.getWorksheet(sheetName);

    if (!worksheet) {
        console.error(`Sheet ${sheetName} not found!`);
        return;
    }

    for (let i = 0; i < startCell.length; i++) {
        worksheet.mergeCells(`${startCell[i]}:${endCell[i]}`);
        worksheet.getCell(startCell[i]).value = value[i];
    }
    
    if (isWrite) {
        await workbook.xlsx.writeFile(outputFilePath);
    }

    console.log(
        `Cells ${startCell}:${endCell} merged and value set to "${value}". Output saved to ${outputFilePath}\n`,
    );
}

exports.changeCellValues = async(
    filePath,
    sheetName,
    cellAddressesList,
    newValues,
    outputFilePath,
    isWrite = true
) => {
    let cellAddresses = cellAddressesList;

    while (cellAddresses.length > newValues.length) {
        cellAddresses.pop();
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(sheetName);

    if (cellAddresses.length !== newValues.length) {
        throw new Error(
            "Cell addresses array and new values array must have the same length",
        );
    }

    cellAddresses.forEach((cellAddress, index) => {
        const cell = worksheet.getCell(cellAddress);
        cell.value = newValues[index];
    });

    if (isWrite)    await workbook.xlsx.writeFile(outputFilePath);
}