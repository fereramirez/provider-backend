const { Schema, model } = require("mongoose");

const cartSchema = new Schema(
    {
        products: [
            {
                quantity: Number,
                product_id: String,
            }
        ],
        buyLater: [
            {
                quantity: Number,
                product_id: String,
            }
        ],
        flash_shipping: Boolean,
        buyNow: String,
        last_order: String,
        owner: {
            type: String,
            required: true,
        },
    },
    {
        versionKey: false,
        toJSON: { getters: true, virtuals: true },
        toObject: { getters: true, virtuals: true }
    }
);

module.exports = model("Cart", cartSchema);