require("dotenv").config();
const { default: axios } = require("axios");
const order = require("../models/order");
const User = require("../models/user");
const product = require("../models/product");
const Publication = require("../models/publication");
const { formatDate, formatPrice } = require("../utils/formatOrderData");
const sendEmail = require("../utils/sendEmail");
const Notifications = require("../models/Notifications");
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

const productUpdater = async (products, order, buyer) => {
  const {
    user: user_id,
    _id,
    payment_date,
    orderProducts,
    shipping_address: { street_name, street_number, city, zip_code, state },
    shipping_cost,
    delivery_date,
    total,
  } = order;
  let list = products.map((e) => ({
    id: e.product_id,
    amount: e.quantity,
    price: e.price,
  }));

  for (const prod of list) {
    let { id, amount, price } = prod;

    if (!/MLA/g.test(id)) {
      const prod = await product.findById(id);

      //? STOCK
      prod.available_quantity -= amount;

      //? BUYERS
      !prod.buyers.includes(user_id) && prod.buyers.push(user_id);

      if (prod.available_quantity < 1) prod.active = false;

      await prod.save();

      //? PUBLICATIONS
      const publicationFound = await Publication.findOne({ product: id });

      if (publicationFound.sales) {
        publicationFound.sales.push({
          buyer: {
            _id: buyer._id,
            name: buyer.name,
            email: buyer.isGoogleUser ? buyer.googleEmail : buyer.email,
          },
          quantity: amount,
          price,
          payment_date,
          delivery_date,
        });
      } else {
        publicationFound.sales = [
          {
            buyer: {
              name: buyer.name,
              email: buyer.isGoogleUser ? buyer.googleEmail : buyer.email,
            },
            quantity: amount,
            price,
            payment_date,
            delivery_date,
          },
        ];
      }
      await publicationFound.save();

      //? NOTIFICATIONS
      const notif = await Notifications.findOne({ user_id: prod.seller });
      if (notif) {
        // NO STOCK ON PUCLICATION
        if ((prod.available_quantity -= amount) < 1) {
          notif.notif_list.push({
            notif_type: "warning",
            title: `¡Has vendido todo!`,
            description: `¡Felicitaciones! Has vendido todas las existencias de tu publicación "${prod.name}". Esta ya no será mostrada en los resultados de búsqueda hasta que se reponga el stock.`,
            link: `/profile/products`,
            date: new Date().toLocaleString("es-Ar", {
              timeZone: "America/Buenos_Aires",
            }),
            seen: false,
          });
        }

        // SELL
        notif.notif_list.push({
          notif_type: "success",
          title: `Has concretado una venta`,
          description: `Se ha concretado una venta en tu publicación "${prod.name}". Más detalles a continuación... `,
          link: `/profile/sales`,
          date: new Date().toLocaleString("es-Ar", {
            timeZone: "America/Buenos_Aires",
          }),
          seen: false,
        });

        await notif.save();
      }

      //? SEND EMAIL TO SELLER
      const sellerFound = await User.findById(prod.seller);
      sellerFound &&
        (await sendEmail(
          sellerFound.isGoogleUser
            ? sellerFound.googleEmail
            : sellerFound.email,
          "¡Has concretado una venta!",
          `./templates/saleResume.html`,
          {
            order_id: _id,
            date: formatDate(payment_date),
            quantity: amount,
            product: prod.name,
            discount: prod.discount,
            total: formatPrice(amount * prod.price).int,
            buyer: buyer.name,
            email: buyer.isGoogleUser ? buyer.googleEmail : buyer.email,
          }
        ));
    }
  }

  //? SEND EMAIL TO BUYER
  await sendEmail(
    buyer.isGoogleUser ? buyer.googleEmail : buyer.email,
    "Resúmen de compra",
    `./templates/orderResume.html`,
    {
      order_id: _id,
      date: formatDate(payment_date),
      products: orderProducts,
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

      const userFound = await User.findById(newOrder.user);

      //? restar unidades de cada stock y agregar buyers
      productUpdater(target.products, newOrder, userFound);
    }

    return res.status(200).send("ok");
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const notificationMercadopago = async (req, res, next) => {
  console.log(req.query);
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

        const userFound = await User.findById(newOrder.user);

        //? restar unidades de cada stock y agregar buyers
        productUpdater(target.products, newOrder, userFound);
      }
    }

    return res.status(200).send("");
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = {
  notificationStripe,
  notificationMercadopago,
};
