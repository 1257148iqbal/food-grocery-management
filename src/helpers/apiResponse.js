exports.successResponse = async (res, { message, data = null }) => {
    let object = { status: true, message };
    if (data) {
        object.data = data;
    }
    return res.json(object);
};

exports.errorHandler = async (res, error) => {
    console.log(error);
    return res.status(500).json({
        status: false,
        message: error.message,
        error: error.message,
    });
};

exports.validationError = (res, msg) =>
    res.status(400).json({
        status: false,
        message: msg,
        error: msg,
    });

exports.errorResponse = (res, msg) =>
    res.status(200).json({
        status: false,
        message: msg,
        error: msg,
    });

    exports.errorResponseWithCode = (res, msg,code) =>{
        return res.status(code || 400).json({
            status: false,
            message: msg,
            error: msg,
        });
    }
exports.unauthorizedResponse = (res, msg) =>
    res.status(401).json({
        status: false,
        message: msg,
        error: msg,
    });

exports.scriptResponse = (res, msg) => {
    console.log(msg);

    return res.send(
        `<script> window.location.href = "lyxauserapp://${msg}"; </script>`
    );
};
