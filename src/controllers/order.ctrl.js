const Order = require("../models/order");
const Cart = require("../models/cart");
const { rawIdProductGetter } = require("../utils/rawIdProductGetter");
const { SHIP_COST } = require("../../constants");
const { cartFormater } = require("../utils/cartFormater");
const expirationChecker = require("../utils/expirationChecker");

const getOrder = async (req, res, next) => {
  const { _id } = req.user;

  try {
    if (!_id || !req.params.id)
      return res
        .status(400)
        .json({ message: "ID de usuario o ID de orden no enviada" });

    let order = await Order.findOne({
      user: _id,
      _id: req.params.id,
    });

    if (!order) return res.status(404).json({ message: "Orden no encontrada" });

    if (
      order.status === "pending" &&
      expirationChecker(order.expiration_date_to)
    ) {
      order = await Order.findByIdAndUpdate(
        req.params.id,
        { status: "expired" },
        { new: true }
      );
    }

    return res.json(order);
  } catch (error) {
    next(error);
  }
};

const getOrdersUser = async (req, res, next) => {
  const { _id } = req.user;

  try {
    let userOrders = await Order.find({ user: _id });

    for (const order of userOrders) {
      if (order.status === "pending") {
        if (expirationChecker(order.expiration_date_to)) {
          order.status = "expired";
          await Order.findByIdAndUpdate(order.id, { status: "expired" });
        }
      }
    }

    return res.json(userOrders);
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req, res, next) => {
  const { _id } = req.user;

  try {
    const { state, city, zip_code, street_name, street_number } = req.body;

    const cart = await Cart.findOne({ owner: _id });

    const data = await cartFormater(cart);
    const products = data.products.map((e) => ({
      product_name: e.name,
      product_id: e._id,
      description: e.description,
      img: e.thumbnail,
      price: e.price,
      sale_price: e.sale_price,
      quantity: e.quantity,
      on_sale: e.on_sale,
    }));

    const newOrder = new Order({
      products,
      user: _id,
      shipping_address: {
        state,
        city,
        zip_code,
        street_name,
        street_number,
      },
      flash_shipping: cart.flash_shipping,
      status: "pending",
      total: data.total,
      free_shipping: data.free_ship_cart,
      shipping_cost: data.shipping_cost,
      order_type: "cart",
    });
    await newOrder.save();

    return res.json(newOrder._id);
  } catch (error) {
    next(error);
  }
};

const buyNowOrder = async (req, res, next) => {
  const { _id } = req.user;

  try {
    const {
      product_id,
      flash_shipping,
      quantity,
      state,
      city,
      zip_code,
      street_name,
      street_number,
    } = req.body;

    const p = await rawIdProductGetter(product_id);
    const total = quantity * (p.on_sale ? p.sale_price : p.price);

    let shipping_cost = 0;
    if (flash_shipping) {
      if (p.free_shipping) {
        shipping_cost = SHIP_COST / 2;
      } else {
        shipping_cost = SHIP_COST * 1.5;
      }
    } else {
      if (p.free_shipping) {
        shipping_cost = 0;
      } else {
        shipping_cost = SHIP_COST;
      }
    }

    const newOrder = new Order({
      products: {
        product_name: p.name,
        product_id,
        description: p.description,
        img: p.thumbnail,
        price: p.price,
        sale_price: p.sale_price,
        quantity,
        on_sale: p.on_sale,
      },
      user: _id,
      shipping_address: {
        state,
        city,
        zip_code,
        street_name,
        street_number,
      },
      status: "pending",
      total,
      flash_shipping,
      free_shipping: p.free_shipping,
      shipping_cost,
      order_type: "buynow",
    });
    await newOrder.save();

    return res.json(newOrder._id);
  } catch (error) {
    next(error);
  }
};

const deleteOrder = async (req, res, next) => {
  const { _id } = req.user;

  try {
    await Order.deleteMany({
      user: _id,
      status: "pending",
    });
    return res.json({ message: "Orden eliminada" });
  } catch (error) {
    next(error);
  }
};

const updateOrder = async (req, res, next) => {
  try {
    let p = false;
    let cart = false;

    const {
      product_id,
      quantity,
      flash_shipping,
      state,
      city,
      zip_code,
      street_name,
      street_number,
    } = req.body;

    if (req.body.status) {
      const order = await Order.findById(req.params.id);

      if (order.status !== "approved") {
        order.status = req.body.status;
        await order.save();
        return res.json({ message: `Order status: ${order.status}` });
      }
      return res.json({ message: `Orden aprobada` });
    }

    if (product_id) {
      p = await rawIdProductGetter(product_id);
    } else {
      const data = await Cart.findOne({ owner: req.user._id });
      cart = await cartFormater(data);
      cart.products = cart.products.map((e) => ({
        product_name: e.name,
        product_id: e._id,
        description: e.description,
        img: e.thumbnail,
        price: e.price,
        sale_price: e.sale_price,
        quantity: e.quantity,
        on_sale: e.on_sale,
      }));
    }
    const pro = p
      ? {
          product_name: p.name,
          product_id: p._id,
          description: p.description,
          img: p.thumbnail,
          price: p.price,
          sale_price: p.sale_price,
          quantity,
          on_sale: p.on_sale,
        }
      : false;
    const total = p ? quantity * (p.on_sale ? p.sale_price : p.price) : 0;

    await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: "pending",
          shipping_address: {
            state: state && state,
            city: city && city,
            zip_code: zip_code && zip_code,
            street_name: street_name && street_name,
            street_number: street_number && street_number,
          },
          flash_shipping: flash_shipping || false,
          products: p ? [pro] : [...cart.products],
          total: p ? total : cart.total,
          flashflash_shipping: cart.flash_shipping,
          free_shipping: p ? p.free_shipping : cart.free_ship_cart,
          shipping_cost: p
            ? p.free_shipping
              ? 0
              : SHIP_COST
            : cart.shipping_cost,
        },
      },
      { new: true }
    );

    return res.json({ message: `Orden actualizada` });
  } catch (error) {
    next(error);
  }
};

const getPostsale = async (req, res, next) => {
  let attempt = 0;
  try {
    if (!req.params.id)
      return res.json({ error: true, message: "ID de orden no enviada" });

    let order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ error: true, message: "Orden no encontrada" });

    if (order.status === "approved") return res.json(order);

    const waiter = async () => {
      if (attempt < 10) {
        attempt++;
        const aux = await Order.findById(req.params.id);

        if (aux && aux.status === "approved") {
          return res.json(aux);
        } else {
          setTimeout(async () => {
            waiter();
          }, 3000);
        }
      } else {
        return res.json({
          error: true,
          message: "Límite de intentos alcanzado",
        });
      }
    };

    setTimeout(async () => {
      waiter();
    }, 3000);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrder,
  createOrder,
  buyNowOrder,
  deleteOrder,
  getOrdersUser,
  updateOrder,
  getPostsale,
};
