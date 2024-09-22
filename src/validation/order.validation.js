const Joi = require('joi');

const orderIsResolvedValidation = (req, res, next) => {
    const schema = Joi.object({
        isResolved: Joi.boolean().required(),
        orderId: Joi.string(),
    });
    const validationResult = schema.validate(req.body);
    if (validationResult.error)
        return res
            .status(400)
            .json({ error: validationResult.error.details[0].message });
    next();
};

module.exports = {
    orderIsResolvedValidation,
};
