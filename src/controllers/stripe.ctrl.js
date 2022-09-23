require('dotenv').config();
const { STRIPE_SKEY } = process.env;
const Order = require('../models/order');
const { stripePrice } = require('../utils/priceForStripe');
const stripe = require('stripe')(STRIPE_SKEY);


const create = async (req, res, next) => {
    try {
        const orderId = req.params.id;

        //! Volver a ver: cambiar URL del front
        const YOUR_DOMAIN = `http://localhost:3000/orders/post-sale?external_reference=${orderId}`

        //? order
        let items = [];
        const order = await Order.findById(orderId);

        for (const prod of order.products) {
            items.push({
                price_data: {
                    currency: 'ars',
                    unit_amount: prod.on_sale ? stripePrice(prod.sale_price) : stripePrice(prod.price),
                    product_data: {
                        name: prod.product_name,
                        images: [prod.img]
                    },
                },
                quantity: prod.quantity,
            })
        };

        const session = await stripe.checkout.sessions.create({
            line_items: items,
            shipping_options: [{
                shipping_rate_data: {
                    display_name: order.flash_shipping ? `Flash${order.free_shipping ? ' & free shipping applied' : ' shipping'}` : order.free_shipping ? 'Free shipping' : 'Standard shipping',
                    type: 'fixed_amount',
                    fixed_amount: {
                        currency: 'ars',
                        amount: order.shipping_cost === 0 ? 0 : order.shipping_cost * 100
                    }
                }
            }],
            mode: 'payment',
            success_url: `${YOUR_DOMAIN}&status=approved`,
            cancel_url: `${YOUR_DOMAIN}&status=cancelled`,
        });

        //? setea el link de pago y la expiración de 24hrs (max de stripe)
        const expiration = () => {
            // ISO string en time zone 0
            let date = new Date(Date().toLocaleString("es-Ar", { timeZone: "America/Buenos_Aires" }))
            date = date.setDate(date.getDate() + 1)
            return new Date(date).toISOString()
        };
        await Order.findByIdAndUpdate(orderId,
            {
                "$set": {
                    payment_link: session.url,
                    expiration_date_to: expiration,
                    payment_source: 'Stripe',
                    payment_intent: session.payment_intent
                }
            });

        return res.json(session);
    } catch (error) {
        next(error)
    }
};

module.exports = {
    create
};