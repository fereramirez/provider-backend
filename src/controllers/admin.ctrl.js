require("dotenv").config();
const { CLOUDINARY_CLOUD, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;
const cloudinary = require("cloudinary").v2;
const User = require("../models/user");
const Product = require("../models/product");
const Address = require("../models/Address");
const Order = require("../models/order");
const Wishlist = require("../models/wishlist");
const sendEmail = require("../utils/sendEmail");
const { rawIdProductGetter } = require("../utils/rawIdProductGetter");

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

const verifyAdminRoute = (req, res, next) => {
  return res.send("ok");
};

const promoteUser = async (req, res, next) => {
  const { id } = req.params;
  if (!id) return res.status(403).json({ message: "ID no enviado" });
  try {
    const userFound = await User.findById(id);
    if (!userFound)
      return res.status(404).json({ message: "Cuenta no encontrada" });
    if (userFound.isGoogleUser)
      return res
        .status(401)
        .json({ message: "Una cuenta de Google no puede ser ADMIN" });

    userFound.role === "client" && (userFound.role = "admin");

    await userFound.save();

    await sendEmail(
      userFound.email,
      "Bienvenido, ADMIN",
      `.templates/promotedUser.html`,
      null
    );

    return res.json({ message: "Usuario promovido satisfactoriamente" });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  const allUsersFound = await User.find();

  const usefulData = [
    "_id",
    "email",
    "name",
    "role",
    "emailVerified",
    "avatar",
    "isGoogleUser",
    "googleEmail",
  ];
  let allUsers = [];
  for (const user of allUsersFound) {
    let newUser = {
      _id: "",
      email: "",
      name: "",
      role: "",
      emailVerified: "",
      avatar: "",
      isGoogleUser: null,
      googleEmail: "",
    };
    for (const key in user) {
      if (usefulData.includes(key)) {
        newUser[key] = user[key];
      }
    }
    allUsers.push(newUser);
  }
  return res.json(allUsers);
};

const getUser = async (req, res, next) => {
  try {
    if (req.params.id.length !== 24) {
      return res.json({
        error: true,
        message: "Formato de ID incorrecto (solo se aceptan 24 caracteres)",
      });
    }
    const userFound = await User.findById(req.params.id);
    if (!userFound) {
      return res.json({ error: true, message: "Cuenta no encontrada" });
    }
    const {
      name,
      email,
      role,
      emailVerified,
      _id,
      isGoogleUser,
      googleEmail,
      avatar,
    } = userFound;
    return res.json([
      {
        name,
        email,
        role,
        emailVerified,
        _id,
        isGoogleUser,
        googleEmail,
        avatar: avatar || null,
      },
    ]);
  } catch (error) {
    next(error);
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const allOrdersFound = await Order.find();
    return res.json(allOrdersFound);
  } catch (error) {
    next(error);
  }
};

const getUserAddresses = async (req, res, next) => {
  const { _id } = req.body;

  try {
    const addressFound = await Address.findOne({
      user: _id,
    });

    if (!addressFound) {
      return res.json([]);
    } else {
      return res.json(addressFound.address);
    }
  } catch (error) {
    next(error);
  }
};

const getUserOrders = async (req, res, next) => {
  const { _id } = req.body;

  try {
    const ordersFound = await Order.find({
      user: _id,
    });

    if (!ordersFound) {
      return res.json([]);
    } else {
      return res.json(ordersFound);
    }
  } catch (error) {
    next(error);
  }
};

const getUserWishlist = async (req, res, next) => {
  const { _id } = req.body;

  try {
    const wishlistFound = await Wishlist.findOne({
      user: _id,
    });

    if (!wishlistFound) {
      return res.json([]);
    } else {
      let promises = [];
      wishlistFound.products.map((product) =>
        promises.push(rawIdProductGetter(product))
      );
      const rawProds = await Promise.all(promises);
      let products = rawProds.filter((product) => product); //! null undefined

      return res.json(products);
    }
  } catch (error) {
    next(error);
  }
};

const banUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const userFound = await User.findById(id);

    if (userFound.role === "admin")
      return res.status(401).json({ message: "Sin autorización" });

    await User.findByIdAndUpdate(id, { role: "banned" });

    await sendEmail(
      userFound.isGoogleUser ? userFound.googleEmail : userFound.email,
      "Suspensión de cuenta",
      `./templates/bannedUser.html`,
      null
    );

    return res.json({ message: "Usuario suspendido exitosamente" });
  } catch (error) {
    next(error);
  }
};

const unbanUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const userFound = await User.findById(id);

    if (userFound.role === "admin")
      return res.status(401).json({ message: "Sin autorización" });

    await User.findByIdAndUpdate(id, { role: "client" });

    await sendEmail(
      userFound.isGoogleUser ? userFound.googleEmail : userFound.email,
      "Cuenta recuperada",
      `./templates/unbannedUser.html`,
      null
    );

    return res.json({ message: "Usuario dado de alta exitosamente" });
  } catch (error) {
    next(error);
  }
};

const deleteAllProducts = async (req, res, next) => {
  try {
    // //? no borra nada
    // cloudinary.api.delete_resources(true);
    // //cloudinary.api.delete_folder("products", (error, result) => { console.log(result); });
    // const deleted = await Product.deleteMany();
    return res.send("Delete all products function unabled.");
  } catch (error) {
    next(error);
  }
};

const getMetrics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({});
    const googleUsers = await User.countDocuments({ isGoogleUser: true });

    const publishedProducts = await Product.countDocuments({});
    const productsOnSale = await Product.countDocuments({ on_sale: true });

    //! PRODUCTOS POR CATEGORIA

    const orders = await Order.find();
    let productsSold = 0;
    let totalProfits = 0;
    orders.forEach((order) => {
      productsSold += order.products.length;
      totalProfits += order.total;
    });
    const ordersApproved = await Order.countDocuments({ status: "approved" });
    const ordersPending = await Order.countDocuments({ status: "pending" });
    const ordersExpired = await Order.countDocuments({ status: "expired" });

    const wishlists = await Wishlist.find();
    let productsWished = 0;
    wishlists.forEach((wishlist) => {
      productsWished += wishlist.products.length;
    });

    return res.json({
      totalUsers,
      googleUsers,
      publishedProducts,
      productsOnSale,
      productsSold,
      totalProfits,
      productsWished,
      ordersApproved,
      ordersPending,
      ordersExpired,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyAdminRoute,
  getAllUsers,
  getUser,
  getAllOrders,
  promoteUser,
  getUserAddresses,
  getUserOrders,
  getUserWishlist,
  banUser,
  unbanUser,
  deleteAllProducts,
  getMetrics,
};
