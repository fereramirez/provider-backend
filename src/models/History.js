const { Schema, model } = require("mongoose");

const historySchema = new Schema(
    {
        products: [String],
        last_category: String,
        last_search: String,
        user: {
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

module.exports = model("History", historySchema);