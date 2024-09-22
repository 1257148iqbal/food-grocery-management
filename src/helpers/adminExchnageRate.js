const AppSetting = require("../models/AppSetting");

exports.adminExchangeRate = async ()=> {
    const appSetting = await AppSetting.findOne({}).select('adminExchangeRate');
  
    return appSetting?.adminExchangeRate || 0;
}
