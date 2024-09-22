const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ExcelFile = new Schema(
    {
        refModel: {
            type: String,
            required: true,
            enum: ['shop', 'admin'],
        },
        refId: {
            type: Schema.Types.ObjectId,
            // required: true,
            refPath: 'refModel',
        },
        filename: String,
        xlsxData: Buffer,
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('excel_file', ExcelFile);
