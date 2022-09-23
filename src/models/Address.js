const { Schema, model } = require("mongoose");

const AddressSchema = new Schema(
    {
        address: [
            {
                state: String,
                city: String,
                zip_code: String,
                street_name: String,
                street_number: Number,
                isDefault: Boolean,
            },
        ],
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        versionKey: false,
    }
);

module.exports = model("Address", AddressSchema);
