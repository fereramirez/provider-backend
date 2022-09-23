require("dotenv").config();
const { CLOUDINARY_CLOUD, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;
const cloudinary = require("cloudinary").v2;
const axios = require("axios");
const User = require("../models/user");
const Product = require("../models/product");
const Address = require("../models/Address");
const Order = require("../models/order");
const Wishlist = require("../models/wishlist");
const Sales = require("../models/Sales");
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
      `../utils/templates/promotedUser.html`,
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
      userFound.email,
      "Suspensión de cuenta",
      `../utils/templates/bannedUser.html`,
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
      userFound.email,
      "Cuenta recuperada",
      `../utils/templates/unbannedUser.html`,
      null
    );

    return res.json({ message: "Usuario dado de alta exitosamente" });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      price,
      brand,
      category,
      description,
      attributes,
      main_features,
      available_quantity,
      free_shipping,
      images,
    } = req.body;

    //? path_from_root
    const { data } = await axios(
      `https://api.mercadolibre.com/categories/${category.id}`
    );

    const { path_from_root } = data;

    let brandLowerCase = brand.toLowerCase();

    let mainFeaturesArray = [];
    for (const feature of main_features) {
      mainFeaturesArray.push(feature.value);
    }

    const newProduct = new Product({
      name,
      price,
      brand: brandLowerCase,
      main_features: mainFeaturesArray,
      attributes,
      description,
      category,
      path_from_root,
      available_quantity,
      free_shipping,
      images,
    });
    const productSaved = await newProduct.save();

    res.json(productSaved);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    let {
      name,
      price,
      brand,
      category,
      description,
      attributes,
      main_features,
      available_quantity,
      free_shipping,
      imgsToEdit,
      mainImgIndex,
      newImages,
    } = req.body;

    let images = [...imgsToEdit, ...newImages];

    if (mainImgIndex !== 0) {
      const mainImg = images.splice(mainImgIndex, 1)[0];
      images.splice(0, 0, mainImg);
    }

    //? actualizar lista de imagenes
    const productFound = await Product.findById(req.params.id);
    if (!productFound)
      return res.status(404).json({ message: "Producto no encontrado" });

    let deleteList = [];
    if (imgsToEdit.length === 0) {
      for (const img of productFound.images) {
        deleteList.push(img.public_id);
      }
    } else if (imgsToEdit.length > 0) {
      let imgToKeepId = [];
      for (const img of imgsToEdit) {
        imgToKeepId.push(img.public_id);
      }

      for (const img of productFound.images) {
        if (!imgToKeepId.includes(img.public_id)) {
          deleteList.push(img.public_id);
        }
      }
    }
    deleteList.length && cloudinary.api.delete_resources(deleteList);

    //? path_from_root
    const { data } = await axios(
      `https://api.mercadolibre.com/categories/${category.id}`
    );

    const { path_from_root } = data;
    let brandLowerCase = brand.toLowerCase();

    let mainFeaturesArray = [];
    for (const feature of main_features) {
      mainFeaturesArray.push(feature.value);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name,
          price,
          brand: brandLowerCase,
          main_features: mainFeaturesArray,
          attributes,
          description,
          category,
          path_from_root,
          available_quantity,
          free_shipping,
          images,
        },
      },
      { new: true }
    );

    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
};

const setDiscount = async (req, res, next) => {
  const { type, number } = req.body;

  if (!type)
    return res.status(400).json({ message: "Tipo de descuento no recibido" });
  if (!number)
    return res.status(400).json({ message: "Número de descuento no recibido" });
  if (type !== "percent" && type !== "fixed") {
    return res.status(400).json({ message: "Tipo de descuento no soportado" });
  }

  try {
    const productFound = await Product.findById(req.params.id);
    if (!productFound)
      return res.status(404).json({ message: "Producto no encontrado" });

    const autoSales = await Sales.find();
    if (!autoSales)
      return res.status(404).json({ message: "Oferta no encontrada" });

    if (autoSales[0].products.includes(req.params.id))
      return res.status(401).json({
        message: "No puedes modificar el descuento de este producto",
      });

    if (type === "percent") {
      productFound.discount = parseInt(number);
    } else {
      const discount = (parseInt(number) * 100) / productFound.price;

      productFound.discount = discount;
    }

    productFound.on_sale = true;
    await productFound.save();
    return res.json({ message: "Descuento aplicado con éxito" });
  } catch (error) {
    next(error);
  }
};

const removeDiscount = async (req, res, next) => {
  try {
    const productFound = await Product.findById(req.params.id);
    if (!productFound)
      return res.status(404).json({ message: "Producto no encontrado" });

    const autoSales = await Sales.find();
    if (!autoSales)
      return res.status(404).json({ message: "Oferta no encontrada" });

    if (autoSales[0].products.includes(req.params.id))
      return res.status(401).json({
        message: "No puedes remover el descuento de este producto",
      });

    productFound.discount = 0;
    productFound.on_sale = false;
    await productFound.save();
    return res.json({ message: "Oferta removida satisfactoriamente" });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const prod = await Product.findById(req.params.id);
    if (prod.undeletable) {
      return res.json({
        message: "Producto protegido. Imposible de eliminar",
        type: "warning",
      });
    } else {
      let deleteList = [];
      prod.images.forEach((img) => deleteList.push(img.public_id));
      cloudinary.api.delete_resources(deleteList);

      await Product.findByIdAndDelete(req.params.id);
      return res.json({
        message: "Producto eliminado exitosamente",
        type: "success",
      });
    }
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
  createProduct,
  updateProduct,
  setDiscount,
  removeDiscount,
  deleteProduct,
  deleteAllProducts,
  getMetrics,
};
