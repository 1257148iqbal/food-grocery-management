exports.overwriteCategoryInfo = (categoryList) => {
    return categoryList.map((category) => {
        return {
            ...category._doc,
            category: {
                _id: category.category._id,
                name: category.name || category.category.name,
                image: category.image || category.category.image,
            },
        }
    })
}