require("dotenv").config();
const { default: axios } = require("axios");
const order = require("../models/order");
const product = require("../models/product");
const { formatDate, formatPrice } = require("../utils/formatOrderData");
const { MP_SKEY } = process.env;

const deliveryDate = (flash) => {
  // horas restantes hasta las 15hrs de mañana (flash_shipping true)
  // iniciamos fecha en zona horaria Arg
  let now = new Date(
    Date().toLocaleString("es-Ar", { timeZone: "America/Buenos_Aires" })
  );
  // Agregamos 1 o 3 días, dependiendo el modo de envío
  now = now.setDate(now.getDate() + (flash ? 1 : 3));
  // convertimos a string
  now = new Date(now).toISOString();
  // agregamos las 15 hrs
  return new Date(`${now.split("T")[0]}T15:00:00.000-03:00`).getTime();
};

const stockUpdater = async (products) => {
  let list = products.map((e) => ({ id: e.product_id, amount: e.quantity }));

  for (const prod of list) {
    let { id, amount } = prod;

    if (!/MLA/g.test(id)) {
      await product.findOneAndUpdate(
        { _id: id },
        {
          $inc: {
            available_quantity: -amount,
          },
        }
      );
    }
  }
};

const notificationStripe = async (req, res, next) => {
  try {
    const { id, status } = req.body.data.object;

    if (status === "succeeded") {
      //? cambiar orden a pagada
      const target = await order.findOne({ payment_intent: id });

      const newOrder = await order
        .findOneAndUpdate(
          { payment_intent: id },
          {
            $set: {
              status: "approved",
              delivery_status: "shipping",
              payment_date: Date.now(
                new Date().toLocaleString("es-Ar", {
                  timeZone: "America/Buenos_Aires",
                })
              ),
              delivery_date: target.flash_shipping
                ? deliveryDate(true)
                : deliveryDate(false),
            },
          },
          { new: true }
        )
        .lean();

      //? restar unidades de cada stock
      stockUpdater(target.products);

      const userFound = await user.findById(newOrder.user);

      const {
        _id,
        payment_date,
        products,
        shipping_address: { street_name, street_number, city, zip_code, state },
        shipping_cost,
        delivery_date,
        total,
      } = newOrder;

      await sendEmail(
        userFound.email,
        "Resúmen de compra",
        `../utils/templates/orderResume.html`,
        {
          order_id: _id,
          date: formatDate(payment_date),
          products: products,
          street_name,
          street_number,
          city,
          zip_code,
          state,
          shipping_cost: shipping_cost
            ? `Envío $${formatPrice(shipping_cost).int}`
            : "Envío gratis",
          delivery_date: formatDate(delivery_date),
          total: formatPrice(total + shipping_cost).int,
        }
      );
    }

    return res.status(200).send("ok");
  } catch (error) {
    next(error);
  }
};

const notificationMercadopago = async (req, res, next) => {
  try {
    const { type } = req.query;

    if (type === "payment") {
      let aux = req.url.replace("/mp/?data.id=", "");
      let id = aux.replace("&type=payment", "");

      const { data } = await axios(
        `https://api.mercadopago.com/v1/payments/${id}`,
        {
          headers: {
            Authorization: `Bearer ${MP_SKEY}`,
          },
        }
      );

      if (data.status === "approved") {
        //? cambiar orden a pagada
        const target = await order.findById(data.external_reference);
        const newOrder = await order
          .findByIdAndUpdate(
            data.external_reference,
            {
              $set: {
                status: "approved",
                delivery_status: "shipping",
                payment_date: Date.now(
                  new Date().toLocaleString("es-Ar", {
                    timeZone: "America/Buenos_Aires",
                  })
                ),
                delivery_date: target.flash_shipping
                  ? deliveryDate(true)
                  : deliveryDate(false),
              },
            },
            { new: true }
          )
          .lean();

        //? restar unidades de cada stock
        stockUpdater(target.products);

        const userFound = await user.findById(newOrder.user);

        const {
          _id,
          payment_date,
          products,
          shipping_address: {
            street_name,
            street_number,
            city,
            zip_code,
            state,
          },
          shipping_cost,
          delivery_date,
          total,
        } = newOrder;

        await sendEmail(
          userFound.email,
          "Resúmen de compra",
          `../utils/templates/orderResume.html`,
          {
            order_id: _id,
            date: formatDate(payment_date),
            products: products,
            street_name,
            street_number,
            city,
            zip_code,
            state,
            shipping_cost: shipping_cost
              ? `Envío $${formatPrice(shipping_cost).int}`
              : "Envío gratis",
            delivery_date: formatDate(delivery_date),
            total: formatPrice(total + shipping_cost).int,
          }
        );
      }
    }

    return res.status(200).send("");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  notificationStripe,
  notificationMercadopago,
};
