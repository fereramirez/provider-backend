require('dotenv').config();
const { MP_SKEY } = process.env;
const Order = require('../models/order');
const mercadopago = require("mercadopago");

const NOTIF_BACK_URL = 'https://provider-api.up.railway.app/checkout-notification/mp/';

const mpCho = async (req, res, next) => {
    try {
        const id = req.params.id;

        // Agrega credenciales
        mercadopago.configure({
            access_token: MP_SKEY,
        });

        // Crea un objeto de preferencia
        //? order
        let items = [];
        const order = await Order.findById(id);

        for (const prod of order.products) {
            items.push({
                id: prod.product_id,
                title: prod.product_name,
                picture_url: prod.img,
                unit_price: prod.on_sale ? prod.sale_price : prod.price,
                quantity: prod.quantity,
            })
        };

        let preference = {
            items,
            external_reference: id,
            payment_methods: {
                installments: 1,
            },
            shipments: {
                mode: 'not_specified',
                cost: order.shipping_cost,
                receiver_address: {
                    zip_code: order.shipping_address.zip_code,
                    street_name: order.shipping_address.street_name,
                    city_name: order.shipping_address.city,
                    state_name: order.shipping_address.state,
                    street_number: order.shipping_address.street_number,
                    floor: '1',
                    apartment: '4B',
                },
            },
            notification_url: `${NOTIF_BACK_URL}`,
            //! volver a ver: front URL
            back_urls: {
                success: `http://localhost:3000/orders/post-sale/`,
                failure: `http://localhost:3000/orders/post-sale/`,
                pending: `http://localhost:3000/orders/post-sale/`
            },
            expires: true,
            expiration_date_from: order.expiration_date_from,
            expiration_date_to: order.expiration_date_to
        };

        //? setea el link de pago
        const { response } = await mercadopago.preferences.create(preference);
        await Order.findByIdAndUpdate(id,
            {
                "$set": {
                    payment_link: response.init_point,
                    payment_source: 'Mercadopago'
                }
            });

        return res.json(response);
    } catch (error) {
        next(error);
    };
};

module.exports = {
    mpCho
};