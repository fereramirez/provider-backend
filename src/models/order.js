const { Schema, model } = require("mongoose");

const orderSchema = new Schema(
    {
        products: [
            {
                product_name: String,
                product_id: String,
                description: String,
                img: String,
                price: Number,
                sale_price: Number,
                quantity: Number,
                on_sale: Boolean,
            },
        ],
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        shipping_address: {
            state: String,
            city: String,
            zip_code: String,
            street_name: String,
            street_number: Number,
        },
        flash_shipping: Boolean,
        free_shipping: Boolean,
        shipping_cost: Number,
        total: Number,
        status: String,
        order_type: String,
        payment_link: String,
        payment_source: String,
        payment_intent: String,
        expiration_date_from: String,
        expiration_date_to: String,
        created_at: Number,
        payment_date: Number,
        delivery_date: Number,
        delivery_status: String,
    },
    {
        timestamps: false,
        versionKey: false,
        toJSON: { getters: true, virtuals: true },
        toObject: { getters: true, virtuals: true },
    }
);

// Order.description
orderSchema.virtual("description").get(function () {
    let desc = "";
    this.products.forEach((product) => {
        desc += `${product.product_name} x${product.quantity}. `;
    });
    return desc;
});

orderSchema.pre('save', async function (next) {
    // convertir la zonahoraria a -3 (-10800000) ?
    // 36hrs de expiración para MP (259200000) (stripe no acepta mas de 24hr)

    // este campo se crea solo ???
    this.created_at = Date.now();

    //! volver a ver: POST deploy del front, revisar si Date.now() funciona bien, sino usar new Date().getTime()
    // ! debería funcionar pero... REVISAR REVISAR

    this.expiration_date_from = new Date(Date.now() - 10800000).toISOString().slice(0, -1) + '-03:00';
    this.expiration_date_to = new Date(Date.now() + 248400000).toISOString().slice(0, -1) + '-03:00';
    next();
})

module.exports = model("Order", orderSchema);
