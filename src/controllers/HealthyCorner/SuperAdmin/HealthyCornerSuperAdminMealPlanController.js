const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../../../helpers/apiResponse');

const MealPlanDb = require('../../../models/HealthyCornerModels/mealPlansModel')

exports.createMealPlans = async (req,res)=>{
    try {
        const mealPlans = req.body

        const mealPlan = new MealPlanDb({
            name: mealPlans.name,
            photo: mealPlans.photo,
            short_description: mealPlans.short_description,
            full_description: mealPlans.full_description,
            suited_for: mealPlans.suited_for,
            meal_contains: mealPlans.meal_contains
        })

        await mealPlan.save().then().catch();

        const data = await MealPlanDb.find().then((data) => {return data})
        
        await successResponse(res, {
            message: 'Meal Plans created successfully',
            data: data,
        });
    }catch (err) {
        errorHandler(res, err);
    }
}

exports.getMealPlans = async (req,res)=>{  

    try {
        const data = await MealPlanDb.find().then((data) => {return data})
        
        await successResponse(res, {
            message: 'Meal Plans fetched successfully',
            data: data,
        });
    }catch (err) {
        errorHandler(res, err);
    }
}