const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../../../helpers/apiResponse');

const HealthyCornerAppSettingsDB = require('../../../models/HealthyCornerModels/superAdminAppSettingsModel')


exports.editHealthyCornerSettings = async (req,res)=>{
try {
    const type = req.body.type
    const suitedFor = req.body.suitedFor
    const dietContains = req.body.dietContains
    const categories = req.body.categories

    await type.map((item)=>{
        if(item=='suitedFor'){
            HealthyCornerAppSettingsDB.findOneAndUpdate(
                {
                  $set: {
                    suitedFor: suitedFor
                  }
                }
              ).then().catch();
        }
        if(item=='dietContains'){
            HealthyCornerAppSettingsDB.findOneAndUpdate({
            $set: {
                dietContains: dietContains
            }
            }).then().catch();
        }
        if(item=='categories'){
            HealthyCornerAppSettingsDB.findOneAndUpdate({
            $set: {
                categories: categories
            }
            }).then().catch();
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

exports.getHealthyCornerAppSettings = async (req, res) => {
    try {   
        const data = await HealthyCornerAppSettingsDB.findOne().then((data) => {return data})
    
        await successResponse(res, {
            message: 'Settings fetched successfully',
            data: data,
        });
    }
    catch (err) {
        errorHandler(res, err);
    }

}
