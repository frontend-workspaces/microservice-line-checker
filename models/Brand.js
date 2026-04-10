const mongoose = require('mongoose')

// sub-document schema for ids[]
const idItemSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'NOT_FOUND', 'UNKNOWN'],
      default: 'ACTIVE'
    }
  },
  { _id: false } // disable auto _id for sub items (optional)
)

const brandSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    ids: {
      type: [idItemSchema],
      default: []
    }
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Brand', brandSchema)