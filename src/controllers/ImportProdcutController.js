// const XLSX = require("xlsx");
// const ProductModel = require("../models/ProductModel")

// exports.index = async (req, res) => {
//     const product = await ProductModel.findAll();
//     return res.render('index', { product });
// }

// exports.import = async (req, res) => {
//     const wb = XLSX.readFile(filePath);
//     const sheets = wb.SheetNames;

//     if(sheets.length > 0) {
//         const data = XLSX.utils.sheet_to_json(wb.Sheets[sheets[0]]);
//         const movies = data.map(row => ({
//             name: row['name'],
//             price: row['price'],
//             quantity: row['quantity'],
//             type: row['type']
//         }))
//         await Movie.bulkCreate(movies);
//     }
//     return res.redirect('/');
// }

// exports.export = async (req, res) => {
//     const movies = await Movie.findAll({
//         attributes: [
//             'id',
//             'movie',
//             'category',
//             'director',
//             'rating'
//         ],
//         raw: true
//     });

//     const headings = [
//         ['Id', 'Movie', 'Category', 'Director', 'Rating']
//     ];

//     const wb = XLSX.utils.book_new();
//     const ws = XLSX.utils.json_to_sheet(movies, {
//         origin: 'A2',
//         skipHeader: true
//     });
//     XLSX.utils.sheet_add_aoa(ws, headings);
//     XLSX.utils.book_append_sheet(wb, ws, 'Movies');

//     const buffer = XLSX.write(wb, { bookType: 'csv', type: 'buffer' });
//     res.attachment('movies.csv');

//     return res.send(buffer);

// }

const ProductModel = require('../models/ProductModel');
const excelJS = require('exceljs');
const {
    errorHandler,
    validationError,
    errorResponse,
} = require('../helpers/apiResponse');
const CategoryModel = require('../models/CategoryModel');
const readXlsxFile = require('read-excel-file/node');
const processFile = require('../middleware/uploadSingleImage');
const ShopModel = require('../models/ShopModel');
const SellerModel = require('../models/SellerModel');

const download = async (req, res) => {
    const { id } = req.body;

    const product = await ProductModel.findById(id);

    let singleProduct = [
        {
            id: product._id,
            price: product.price,
            discountPrice: product.discountPrice,
            unit: product.unit,
            quantity: product.quantity,
            type: product.type,
        },
    ];

    // products.forEach((product) => {

    //     product.push({
    //     id: product._id,
    //     title: product.name,
    //     description: product.name,

    //   });
    // });

    let workbook = new excelJS.Workbook();
    let worksheet = workbook.addWorksheet('singleProduct');

    worksheet.columns = [
        { header: 'Id', key: 'id', width: 30 },
        { header: 'Price', key: 'price', width: 15 },
        { header: 'DiscountPrice', key: 'discountPrice', width: 25 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Type', key: 'type', width: 15 },
    ];
    // Add Array Rows
    worksheet.addRows(singleProduct);

    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
        'Content-Disposition',
        'attachment; filename=' + 'tutorials.xlsx'
    );

    return workbook.xlsx.write(res).then(function () {
        res.status(200).end();
    });
};

const downloadTemplate = async (req, res) => {
    try {
        const { sellerId } = req.query;
        const seller = await SellerModel.findById(sellerId);
        const sellerType = seller.sellerType;
        // 'food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'
        const categories = await CategoryModel.find({ type: sellerType });
        let workbook = new excelJS.Workbook();

        // product sheet
        let productSheet = workbook.addWorksheet('Product');
        productSheet.getRow(1).font = { bold: true };
        productSheet.columns = [
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Price', key: 'price', width: 10 },
            { header: 'Description', key: 'description', width: 20 },
            { header: 'Category', key: 'category', width: 20 },
        ];

        // category sheet
        let categoryWorksheet = workbook.addWorksheet('Category');
        categoryWorksheet.getRow(1).font = { bold: true };
        categoryWorksheet.columns = [
            { header: 'Name', key: 'name', width: 100 },
        ];
        categoryWorksheet.getRow(1).alignment = {
            vertical: 'middle',
            horizontal: 'left',
        };
        categories.forEach(category => {
            categoryWorksheet.addRow(category);
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + 'product.xlsx'
        );

        return workbook.xlsx.write(res).then(function () {
            res.status(200).end();
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

const downloadProductTemplate = async (req, res) => {
    try {
        const categories = await CategoryModel.find().limit(10);

        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet('My Users');
        const path = './files';

        worksheet.columns = [
            // { header: 'S no.', key: 's_no', width: 10 },
            { header: 'Product Name', key: 'name', width: 20 },
            { header: 'price', key: 'price', width: 20 },
            { header: 'Email Id', key: 'email', width: 20 },
            { header: 'Gender', key: 'gender', width: 20 },
            { header: 'Type User', key: 'type', width: 20 },
        ];

        worksheet.getCell('F1').dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"One,Two,Three,Four"'],
        };

        let counter = 1;

        // User.forEach(user => {
        //     // user.s_no = counter
        //     worksheet.addRow(user)
        //     counter++
        // })

        worksheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true };
        });

        const listCategories = categories.map(category => category.name);

        worksheet
            .getColumn('E')
            .eachCell({ includeEmpty: true }, function (cell, rowNumber) {
                cell.dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: listCategories,
                };
            });

        try {
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=users.xlsx`
            );

            return workbook.xlsx.write(res).then(() => {
                res.status(200);
            });

            // await workbook.xlsx.writeFile(`${path}/users.xlsx`).then(() => {
            //   res.send({
            //     status: "success",
            //     message: "file successfully downloaded",
            //     path: `${path}/users.xlsx`,
            //   });
            // });
        } catch (err) {
            res.send({
                status: 'error',
                message: 'Something went wrong',
            });
        }
    } catch (err) {
        errorHandler(res, err);
    }
};

const exportUser = async (req, res) => {
    const categories = await CategoryModel.find().limit(10);
    const listCategories = categories.map(category => category._doc.name);

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet('My Users');
    const path = './files';

    worksheet.columns = [
        // { header: 'S no.', key: 's_no', width: 10 },
        { header: 'Name', key: 'name' },
    ];

    categories.forEach(user => {
        worksheet.addRow(user);
    });

    try {
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename=users.xlsx`);

        return workbook.xlsx.write(res).then(() => {
            res.status(200);
        });

        // await workbook.xlsx.writeFile(`${path}/users.xlsx`).then(() => {
        //   res.send({
        //     status: "success",
        //     message: "file successfully downloaded",
        //     path: `${path}/users.xlsx`,
        //   });
        // });
    } catch (err) {
        res.send({
            status: 'error',
            message: 'Something went wrong',
        });
    }
};

async function generateTemplate() {
    let workbook = new excelJS.Workbook();
    let worksheet = workbook.addWorksheet('Products Data');
    let titleRow = worksheet.addRow([this.title]);
    // Set font, size and style in title row.
    titleRow.font = {
        name: 'Comic Sans MS',
        family: 4,
        size: 16,
        underline: 'double',
        bold: true,
    };
    // Blank Row
    worksheet.addRow([]);
    //Add Header Row
    let headerRow = worksheet.addRow(this.header);
    // Cell Style : Fill and Border
    headerRow.eachCell((cell, number) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF00' },
            bgColor: { argb: 'FF0000FF' },
        };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
    });
    // Add Data and Conditional Formatting
    // let joineddropdownlist = '"' + this.dropdownlist.join(',') + '"';
    // console.log(joineddropdownlist);
    // for (let i = 4; i < 100; i++) {
    //     worksheet.getCell('C' + i).dataValidation = {
    //         type: 'list',
    //         allowBlank: true,
    //         formulae: [joineddropdownlist], //'"One,Two,Three,Four"'
    //     };
    // }
    workbook.xlsx.writeBuffer().then(data => {
        let blob = new Blob([data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        fs.saveAs(blob, 'Template.xlsx');
    });
}

const readProductFile = async (req, res) => {
    try {
        const { shopId } = req.body;
        const shop = await ShopModel.findOne({ _id: shopId }).populate(
            'seller'
        );
        if (!shop) {
            return errorResponse(res, 'Shop not found');
        }
        if (req.file == undefined) {
            return errorResponse(res, 'Please upload a file!');
        }
        let path = req.file.path;
        readXlsxFile(path).then(async rows => {
            // console.log(rows);
            // skip header
            rows.shift();
            let products = [];
            for (let i = 0; i < rows.length; i++) {
                let row = rows[i];
                // console.log(row);
                const categoryName = row[3];
                const category = await CategoryModel.findOne({
                    name: categoryName,
                });
                if (category) {
                    let product__ = {
                        seller: shop.seller._id,
                        name: row[0],
                        price: row[1],
                        description: row[2],
                        type: shop.shopType,
                        delivery: shop.delivery,
                        category: category?._id,
                        shop: shopId,
                        isIt: 'product',
                        images: row[5],
                        productVisibility: true,
                        status: 'active',
                        foodType: shop.seller.foodType,
                    };
                    products.push(product__);
                }
            }

            // console.log(products);

            // create products from products
            const newProduct = await ProductModel.create(products);

            res.status(200).json({
                message:
                    'Uploaded the file successfully: ' + req.file.originalname,
                data: {
                    products,
                },
            });
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            message: 'Could not upload the file: ' + req.file.originalname,
        });
    }
};

module.exports = {
    download,
    downloadTemplate,
    downloadProductTemplate,
    exportUser,
    generateTemplate,
    readProductFile,
};
