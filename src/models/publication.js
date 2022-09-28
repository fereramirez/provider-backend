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
    publication_date: String,
    sales: [
      {
        buyer: {
          name: String,
          email: String,
        },
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
