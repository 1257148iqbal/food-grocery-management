const CounterModel = require('../models/CounterModel');

exports.autoIncrement = async (uniqueId) => {
    return CounterModel.findOneAndUpdate(
        { uniqueId: uniqueId },
        { $inc: { seq_value: 1 } },
        { new: true, upsert: true },
    );
};
