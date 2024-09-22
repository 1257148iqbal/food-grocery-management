const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../../../helpers/apiResponse');

const HealthyCornerAppSettingsDB = require('../../../models/HealthyCornerModels/dietCentersAppSettingsModel')

exports.editHealthyCornerSettings = async (req,res)=>{
try {
    const type = req.body.type
    const ingredients = req.body.ingredients

    await type.map((item)=>{
        if(item=='ingredients'){
            HealthyCornerAppSettingsDB.findOneAndUpdate(
                {
                  $set: {
                    ingredients: ingredients
                  }
                }
              ).then().catch();
        }
    })

    const data = await HealthyCornerAppSettingsDB.findOne().then((data) => {return data})
    
    await successResponse(res, {
        message: 'Settings updated successfully',
        data: data,
    });
}catch (err) {
    errorHandler(res, err);
}    
}   