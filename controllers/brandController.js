const Brand = require("../models/Brand");

const SEARCHABLE_FIELDS = ["brand"];

async function getAllBrands(req, res) {
  try {
    const { key = "", field = "", page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Number(limit) || 10);

    const filter = {};

    if (key) {
      const search = String(key).trim();

      if (field && SEARCHABLE_FIELDS.includes(field)) {
        filter[field] = { $regex: search, $options: "i" };
      } else {
        filter.$or = SEARCHABLE_FIELDS.map((item) => ({
          [item]: { $regex: search, $options: "i" },
        }));
      }
    }

    const total = await Brand.countDocuments(filter);
    const totalPage = Math.max(1, Math.ceil(total / limitNumber));
    const currPage = pageNumber;

    const data = await Brand.find(filter)
      .select("-__v")
      .skip((currPage - 1) * limitNumber)
      .limit(limitNumber)
      .sort({ createdAt: -1 });

    return res.json({
      data,
      total,
      currPage,
      totalPage,
      limit: limitNumber,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to read data",
      error: error.message,
    });
  }
}

async function getBrandById(req, res) {
  try {
    const item = await Brand.findById(req.params.id).select("-__v");

    if (!item) {
      return res.status(404).json({
        message: "Brand not found",
      });
    }

    return res.json(item);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to read data",
      error: error.message,
    });
  }
}

async function createBrand(req, res) {
  try {
    const newItem = await Brand.create(req.body);

    return res.status(201).json(newItem);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create data",
      error: error.message,
    });
  }
}

async function updateBrand(req, res) {
  try {
    const updatedItem = await Brand.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedItem) {
      return res.status(404).json({
        message: "Brand not found",
      });
    }

    return res.json(updatedItem);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update data",
      error: error.message,
    });
  }
}

async function deleteBrand(req, res) {
  try {
    const deletedItem = await Brand.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({
        message: "Brand not found",
      });
    }

    return res.json({
      message: "Deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete data",
      error: error.message,
    });
  }
}

module.exports = {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
};
