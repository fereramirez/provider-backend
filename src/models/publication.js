const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PublicationSchema = new Schema(
  {
    owner: {
      type: String,
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    sales: [
      {
        buyer: String,
        quantity: Number,
        price: Number,
        payment_date: String,
        delivery_date: String,
      },
    ],
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("Publication", PublicationSchema);