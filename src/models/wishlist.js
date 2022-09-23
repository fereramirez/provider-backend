const { Schema, model } = require("mongoose");

const wishlistSchema = new Schema(
    {
        products: [String],
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        versionKey: false,
        toJSON: { getters: true, virtuals: true },
        toObject: { getters: true, virtuals: true },
    }
);

module.exports = model("Wishlist", wishlistSchema);