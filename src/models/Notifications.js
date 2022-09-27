const { Schema, model } = require("mongoose");

const notificationSchema = new Schema(
    {
        user_id: String,
        notif_list: [
            {
                notif_type: String,
                title: String,
                description: String,
                link: String,
                date: String,
                seen: Boolean
            }
        ]
    },
    {
        versionKey: false,
        toJSON: { getters: true, virtuals: true },
        toObject: { getters: true, virtuals: true }
    }
);

module.exports = model("Notification", notificationSchema);