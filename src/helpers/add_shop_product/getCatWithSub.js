const ShopCategory = require('../../models/ShopCategory');
const SubCategoryModel = require('../../models/SubCategoryModel');



exports.getCatWithSub = async (shopId) => {
    
    const shopCategories = await ShopCategory.find({
        shop: shopId,
        status: "active",
        type: "grocery",
    });
    const categoryWithSub = [];
    /*
        [
            category: []
            subCategory: []
        ]
    */

    const categoryWithSubCategoryPlusId = {};
    /*
        {
            "category1_Name": [[category1_Id], [subCategoryId1, subCategoryId2................], [subCategory1, subCategory2................]],
            "category2_Name": [[category2_Id], [subCategoryId1, subCategoryId2................], [subCategory1, subCategory2................]]
        }
    */
   
    for (let shopCategory of shopCategories){
        const subCategories = await SubCategoryModel.find({
            category: shopCategory.category.toString(),
            status: "active",
        });
        if (subCategories.length) {
            const data = {};
            data.category = shopCategory.name;
            data.subCategories = [];
            const subCategoriesName = [];

            const subCategoryId = [];
            subCategories.forEach (subCategory => {
                data.subCategories.push(subCategory.name);
                subCategoryId.push(subCategory._id.toString());
                subCategoriesName.push(subCategory.name);
            })
            categoryWithSub.push(data);
            categoryWithSubCategoryPlusId[shopCategory.name] = [[shopCategory.category.toString()], [...subCategoryId], [...subCategoriesName]];
        }
    };
    return {categoryWithSub, categoryWithSubCategoryPlusId};
};
