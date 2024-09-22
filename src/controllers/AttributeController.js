const Attribute = require("../models/AttributeModel");
const AttributeItem = require("../models/AttributeItemModel");
const { successResponse, errorHandler, errorResponse } = require("../helpers/apiResponse");

const processAttributeItems = async (items, existingItems = []) => {
  const itemIds = [];
  // Step 1: Update or create items
  for (const item of items) {
    if (item._id) {
      // Update existing item
      const updatedItem = await AttributeItem.findByIdAndUpdate(
        item._id,
        {
          name: item.name,
          extraPrice: item.extraPrice,
        },
        { new: true }
      );

      itemIds.push(updatedItem._id?.toString());
    } else {
      // Create new item
      const newItem = new AttributeItem({
        name: item.name,
        extraPrice: item.extraPrice,
      });
      const savedNewItem = await newItem.save();
      itemIds.push(savedNewItem._id?.toString());
    }
  }

  // Step 2: Identify and delete removed items
  const itemsToDelete = existingItems?.filter(
    (item) => !itemIds?.includes(item._id?.toString())
  );

  if (itemsToDelete?.length > 0) {
    for (const item of itemsToDelete) {
      await AttributeItem.findByIdAndDelete(item?._id);
    }
  }

  return itemIds;
};

const saveOrUpdateAttribute = async (attributeData) => {
  const {
    name,
    required,
    select,
    minimumRequiredAttribute,
    shop,
    maximumRequiredAttribute,
    items,
  } = attributeData;

  let attribute;

  if (attributeData?._id) {
    // Update existing attribute
    attribute = await Attribute.findById(attributeData?._id).populate("items");

    if (!attribute) {
      throw new Error(`Attribute not found`);
    }
    // Update the attribute fields
    attribute.name = name;
    attribute.required = required;
    attribute.select = select;
    attribute.minimumRequiredAttribute = minimumRequiredAttribute;
    attribute.maximumRequiredAttribute = maximumRequiredAttribute;
  } else {
    // Create new attribute
    attribute = new Attribute({
      name,
      required,
      select,
      shop,
      minimumRequiredAttribute,
      maximumRequiredAttribute,
    });
  }
  // Process the attribute items
  const itemIds = await processAttributeItems(items, attribute?.items);

  // Update the attribute's items
  attribute.items = itemIds;

  // Save the attribute
  return await attribute.save();
};

exports.processAttributesToDuplicateCheck = async (attributes, shopId) => {
  // Step 1: Get list of existing attributes
  const existingAttributes = await Attribute.find({ shop: shopId });

  // Step 2: Identify and delete removed attributes
  const requestAttributeIds = attributes.map((attr) => attr._id);
  const attributesToDelete = existingAttributes.filter(
    (attr) => !requestAttributeIds.includes(attr._id ? attr._id.toString() : false)
  );

  if (attributesToDelete.length > 0) {
    for (const attribute of attributesToDelete) {
      await Attribute.findByIdAndDelete(attribute._id);
      await AttributeItem.deleteMany({ _id: { $in: attribute.items } });
    }
  }

  // Step 3: Check for duplicate attributes
  const newAttributeNames = attributes.map((attr) => (!attr._id ? attr.name : null)).filter(Boolean);
  const duplicateAttribute = await Attribute.findOne({
    shop: shopId,
    name: { $in: newAttributeNames },
  }).select('name');

  if (duplicateAttribute) {
    return {
      status: 400,
      message: `Attribute with name "${duplicateAttribute.name}" already exists in this shop.`,
    };
  }

  // Step 4: Save or update attributes
  const processedAttributes = await Promise.all(
    attributes.map((attributeData) => {
      attributeData.shop = shopId
      saveOrUpdateAttribute(attributeData)
    })
  );

  return processedAttributes;
}

// Create an attribute along with its items
exports.createAttribute = async (req, res) => {
  const session = await Attribute.startSession();
  session.startTransaction();

  try {
    const attributeData = req.body;
    const savedAttribute = await saveOrUpdateAttribute(attributeData, session);

    await session.commitTransaction();
    session.endSession();

    successResponse(res, {
      message: "Successfully added",
      data: savedAttribute,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    errorHandler(res, error);
  }
};

// Create multiple attribute along with its items
exports.createMultipleAttributes = async (req, res) => {
  const session = await Attribute.startSession();
  session.startTransaction();

  try {
    const attributes = req.body;

    const savedAttributes = await Promise.all(
      attributes.map((attributeData) =>
        saveOrUpdateAttribute(attributeData, session)
      )
    );

    await session.commitTransaction();
    session.endSession();
    successResponse(res, {
      message: "Successfully added",
      data: savedAttributes,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    errorHandler(res, error);
  }
};

// Update an attribute along with its items
exports.updateAttribute = async (req, res) => {
  const session = await Attribute.startSession();
  session.startTransaction();

  try {
    const attributeData = req.body;
    const updatedAttribute = await saveOrUpdateAttribute(
      attributeData,
      session
    );

    await session.commitTransaction();
    session.endSession();

    successResponse(res, {
      message: "Successfully updated",
      data: updatedAttribute,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    errorHandler(res, error);
  }
};

// Update multiple attribute along with its items
exports.updateOrCreateMultipleAttributes = async (req, res) => {
  try {
    const attributes = req.body;

    const processedAttributes = await this.processAttributesToDuplicateCheck(attributes, attributes[0].shop)

    successResponse(res, {
      message: "Successfully updated",
      data: processedAttributes,
    });

  } catch (error) {
    errorHandler(res, error);
  }
};

// Get all attributes
exports.getAllAttributes = async (req, res) => {
  try {
    const attributes = await Attribute.find().populate("items");
    res.status(200).json(attributes);
  } catch (error) {
    errorHandler(res, error);
  }
};

// Get attribute by ID
exports.getAttributeById = async (req, res) => {
  try {
    const { id } = req.body;
    const attribute = await Attribute.findById(id).populate("items");

    if (!attribute) {
      return res.status(404).json({ message: "Attribute not found" });
    }

    res.status(200).json(attribute);
  } catch (error) {
    errorHandler(res, error);
  }
};

// Get attribute by ID
exports.getAttributesByShopId = async (req, res) => {
  try {
    const { shopId } = req.query;
    const attribute = await Attribute.find({ shop: shopId }).populate("items");

    if (!attribute) {
      return res.status(404).json({ message: "Attribute not found" });
    }

    res.status(200).json(attribute);
  } catch (error) {
    errorHandler(res, error);
  }
};

// Delete an attribute
exports.deleteAttribute = async (req, res) => {
  try {
    const { id } = req.body;

    const deletedAttribute = await Attribute.findByIdAndDelete(id);

    if (!deletedAttribute) {
      return res.status(404).json({ message: "Attribute not found" });
    }

    res.status(200).json({ message: "Attribute deleted successfully" });
  } catch (error) {
    errorHandler(res, error);
  }
};

exports.softUpdateOrCreateMultipleAttributes = async (attributes, shopId) => {

  let attributeIds = [];
  for (const attr of attributes) {
    let newAttribute;
    if (attr._id) {
      // Update existing attribute
      newAttribute = await Attribute.findByIdAndUpdate(
        attr._id,
        {
          name: attr.name,
          required: attr.required,
          select: attr.select,
          shop: shopId,
          minimumRequiredAttribute: attr.minimumRequiredAttribute,
          maximumRequiredAttribute: attr.maximumRequiredAttribute,
        },
        { new: true }
      );
    } else {
      newAttribute = await Attribute.create({
        name: attr.name,
        required: attr.required,
        select: attr.select,
        shop: shopId,
        minimumRequiredAttribute: attr.minimumRequiredAttribute,
        maximumRequiredAttribute: attr.maximumRequiredAttribute,
      });
    }
    let itemIds = [];
    if (attr.items && Array.isArray(attr.items)) {
      for (const item of attr.items) {
        let newItem;
        if (item._id) {
          // Update existing item
          newItem = await AttributeItem.findByIdAndUpdate(
            item._id,
            {
              name: item.name,
              extraPrice: item.extraPrice,
            },
            { new: true }
          );
        } else {
          newItem = await AttributeItem.create({
            name: item.name,
            extraPrice: item.extraPrice,
          });
        }
        itemIds.push(newItem._id);
      }
      // Update attribute with new item IDs
      await Attribute.findByIdAndUpdate(
        newAttribute._id,
        { $set: { items: itemIds } },
        { new: true }
      );
    }
    attributeIds.push(newAttribute._id);
  }

  return attributeIds

}