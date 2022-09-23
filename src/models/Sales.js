const { Schema, model } = require("mongoose");

const saleSchema = new Schema(
  {
    products: [String],
    last_update: {
        type: Date,
        default: Date.now(),
        required: true
    },
  },
  {
    versionKey: false,
    toJSON: { getters: true, virtuals: true },
    toObject: { getters: true, virtuals: true }
  }
);

// tiene que ser 'function', no funciona con una '() =>'

module.exports = model("Sale", saleSchema);