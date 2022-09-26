const Cart = require("../models/cart");
const { cartFormater } = require("../utils/cartFormater");

const getUserCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ owner: req.user._id });

    if (!cart) {
      const newCart = await Cart.create({
        products: [],
        buyLater: [],
        buyNow: "",
        last_order: "",
        owner: req.user._id,
      });
      return res.json(newCart);
    }

    const response = await cartFormater(cart);

    return res.json({
      ...response,
    });
  } catch (error) {
    next(error);
  }
};

const setBuyNow = async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate(
      { owner: req.user._id },
      {
        $set: {
          buyNow: req.body.product_id,
        },
      },
      { new: true }
    );
    return res.json({ message: "Buy Now setted" });
  } catch (error) {
    next(error);
  }
};

const addToCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const productToAdd = req.params.id;
    const cart = await Cart.findOne({ owner: userId });

    if (cart) {
      let flag = false;
      cart.products.forEach((e) => {
        if (e.product_id === productToAdd) {
          flag = true;
        }
      });

      if (flag) {
        // si el prod ya existe
        cart.products.map((e) => {
          if (e.product_id === productToAdd) {
            e.quantity++;
          }
        });
      } else {
        // si todavia no existe
        cart.products.push({
          product_id: productToAdd,
          quantity: 1,
        });
      }
      await cart.save();
      return res.json({ message: "Producto agregado al carrito", ok: true });
    } else {
      const newCart = new Cart({
        products: [
          {
            product_id: productToAdd,
            quantity: 1,
          },
        ],
        buyNow: "",
        owner: userId,
      });
      await newCart.save();
      return res.json(newCart);
    }
  } catch (error) {
    next(error);
  }
};

const buyLater = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ owner: userId });

    let aux = {};
    let destiny = "cart";
    cart.products.forEach((e) => {
      if (e.product_id === req.params.id) {
        destiny = "save";
        aux = { ...e };
      }
    });

    if (destiny === "save") {
      const newCart = await Cart.findOneAndUpdate(
        { owner: userId },
        {
          $push: {
            buyLater: aux,
          },
          $pull: {
            products: { product_id: req.params.id },
          },
        },
        { new: true }
      );

      return res.json({
        message: "Producto guardado para comprar más tarde",
        cart: newCart,
      });
    } else {
      aux = cart.buyLater.find((e) => e.product_id === req.params.id);
      const newCart = await Cart.findOneAndUpdate(
        { owner: userId },
        {
          $push: {
            products: aux,
          },
          $pull: {
            buyLater: { product_id: req.params.id },
          },
        },
        { new: true }
      );

      return res.json({
        message: "Producto agregado al carrito",
        cart: newCart,
      });
    }
  } catch (error) {
    next(error);
  }
};

const removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const target = req.query.id;
    const source = req.query.source;

    if (source === "products") {
      const cart = await Cart.updateOne(
        {
          owner: userId,
        },
        {
          $pull: {
            products: { product_id: target },
          },
        }
      );
    } else {
      const cart = await Cart.updateOne(
        {
          owner: userId,
        },
        {
          $pull: {
            buyLater: { product_id: target },
          },
        }
      );
    }

    return res.json({ message: "Producto removido del carrito" });
  } catch (error) {
    next(error);
  }
};

const emptyCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Cart.findOneAndUpdate(
      { owner: userId },
      { products: [] },
      { new: true }
    );
    return res.json({ message: "Carrito vaciado" });
  } catch (error) {
    next(error);
  }
};

const deleteCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Cart.findOneAndDelete({ owner: userId });
    return res.json("Done.");
  } catch (error) {
    next(error);
  }
};

const quantity = async (req, res, next) => {
  try {
    let amount = 1;
    req.query.mode === "add" || (amount = -1);

    const cart = await Cart.findOneAndUpdate(
      {
        owner: req.user._id,
        "products.product_id": req.query.id,
      },
      {
        $inc: {
          "products.$.quantity": amount,
        },
      },
      { new: true }
    );
    return res.json(cart.products.map((e) => e.quantity));
  } catch (error) {
    next(error);
  }
};

const quantityEx = async (req, res, next) => {
  try {
    let userId = req.user._id;
    let target = req.query.id;
    let amount = req.query.amount;

    await Cart.findOneAndUpdate(
      {
        owner: userId,
        "products.product_id": target,
      },
      {
        $set: {
          "products.$.quantity": amount,
        },
      }
    );
    return res.json(amount);
  } catch (error) {
    next(error);
  }
};

const shippingMode = async (req, res, next) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      {
        owner: req.user._id,
      },
      {
        $set: {
          "products.$.quantity": amount,
        },
      },
      { new: true }
    );
  } catch (error) {
    next(error);
  }
};

const saveOrder = async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate(
      { owner: req.user._id },
      {
        $set: {
          last_order: req.query.id || "",
        },
      },
      { new: true }
    );
    return res.json({ message: "Last order id updated on database" });
  } catch (error) {
    next(error);
  }
};

const flashShippingMode = async (req, res, next) => {
  try {
    const rawCart = await Cart.findOneAndUpdate(
      { owner: req.user._id },
      {
        $set: {
          flash_shipping: req.body.flash_shipping,
        },
      },
      { new: true }
    );
    const cart = await cartFormater(rawCart);
    res.json({ cart });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserCart,
  addToCart,
  buyLater,
  setBuyNow,
  removeFromCart,
  emptyCart,
  deleteCart,
  quantity,
  quantityEx,
  saveOrder,
  flashShippingMode,
};
