require("dotenv").config();
const { CLOUDINARY_CLOUD, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;
const cloudinary = require("cloudinary").v2;
const Product = require("../models/product");
const Sales = require("../models/Sales");
const Publication = require("../models/publication");
const axios = require("axios");
const { meliSearchParser } = require("../utils/meliParser");
const { rawIdProductGetter } = require("../utils/rawIdProductGetter");
const commentsParser = require("../utils/commentsParser");

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

const getAll = async (req, res, next) => {
  try {
    const products = await Product.find();
    return res.json(products);
  } catch (error) {
    next(error);
  }
};

const getProds = async (req, res, next) => {
  try {
    const products = await Product.find();

    let response = products.filter((e) =>
      e.path_from_root.find((e) => e.id === req.query.category)
    );

    return res.json(response);
  } catch (error) {
    next(error);
  }
};

const getByQuery = async (req, res, next) => {
  try {
    let searchQuery = "";
    Object.entries(req.query).forEach(([key, value]) => {
      searchQuery += "&" + key + "=" + value;
    });

    const L = "50";
    const meli = `https://api.mercadolibre.com/sites/MLA/search?&official_store=all&limit=${L}${searchQuery}`;

    const { data } = await axios(meli);

    const allowedFilters = [
      "BRAND",
      "discount",
      "shipping_cost",
      "price",
      "category",
    ];
    const filters = data.available_filters.filter((e) =>
      allowedFilters.includes(e.id)
    );

    const applied = data.filters.filter((e) => e.id !== "official_store");

    const breadCrumbs = data.filters.find((e) => e.id === "category")?.values[0]
      .path_from_root;

    const resultsMeli = meliSearchParser(data.results);

    let resultsDB = await Product.find();

    if (req.query.q) {
      let aux = req.query.q.split(" ").map((e) => {
        if (e.endsWith("s")) {
          return RegExp(e.slice(0, -1), "gi");
        } else if (e.endsWith("es")) {
          return RegExp(e.slice(0, -2), "gi");
        } else {
          return RegExp(e, "gi");
        }
      });
      resultsDB = await Product.find({
        $or: [{ name: { $in: aux } }, { brand: { $in: aux } }],
      });
    }

    const filterDBResults = async (filters, products) => {
      let response = [...products];

      if (filters.BRAND) {
        response = response.filter(
          (e) => e.brand.toLowerCase() === filters.BRAND.toLowerCase()
        );
      }
      if (filters.price) {
        let [min, max] = filters.price.split("-");
        min === "*" ? min === 0 : (min = parseInt(min));
        max = parseInt(max);

        response = response.filter((e) => e.price >= min && e.price <= max);
      }
      if (filters.category) {
        response = response.filter((e) =>
          e.path_from_root.find((e) => e.id === filters.category)
        );
      }
      if (filters.free_shipping) {
        response = response.filter((e) => e.free_shipping);
      }
      if (filters.discount) {
        let [filterDisc] = filters.discount.split("-");
        response = response.filter((e) => e.discount >= parseInt(filterDisc));
      }
      return response;
    };
    let auxFilters = applied.brand
      ? { ...req.query, BRAND: applied.brand.values[0].name }
      : req.query;
    resultsDB = await filterDBResults(auxFilters, resultsDB);

    return res.json({
      db: resultsDB,
      meli: resultsMeli,
      filters,
      applied,
      breadCrumbs,
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  const id = req.params.id;
  try {
    const product = await rawIdProductGetter(id);

    if (product.error) return res.json(product);

    let allowComment = false;
    if (!/MLA/g.test(id)) {
      //: si no es de Meli puede tener comentarios
      const { comments, list } = await commentsParser(product.comments);

      if (req?.user?._id) {
        //: si el usuario está logeado...
        if (product.buyers) {
          //: ...y el producto tiene compradores...
          if (
            product.buyers.includes(req.user._id) &&
            !list.includes(req.user._id.toString())
          ) {
            //: ...ya compró y no comentó...
            allowComment = true; //: ...puede comentar?
          }
        }
      }
      return res.json({ product, comments, allowComment });
    }

    return res.json({ product });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const stock = async (req, res, next) => {
  try {
    let list = req.body;

    for (const prod of list) {
      let { id, amount } = prod;

      if (!/MLA/g.test(id)) {
        await Product.findOneAndUpdate(
          { _id: id },
          {
            $inc: {
              available_quantity: -amount,
            },
          }
        );
      }
    }
    return res.json("stock updated");
  } catch (error) {
    next(error);
  }
};

const getPromos = async (req, res, next) => {
  try {
    const categories = [
      "MLA1039",
      "MLA1051",
      "MLA1648",
      "MLA1144",
      "MLA1000",
      "MLA3025",
      "MLA1168",
      "MLA1182",
    ];
    let promises = [];
    let results = [];

    categories.forEach((c) => {
      promises.push(
        axios(
          `http://api.mercadolibre.com/sites/MLA/search?promotion_type=deal_of_the_day&official_store=all&category=${c}`
        )
      );
    });
    let dbResults = await Product.find({ on_sale: true });

    const promiseAll = await Promise.all(promises);
    promiseAll.forEach((r) => {
      results = results.concat(r.data.results);
    });
    results = meliSearchParser(results);

    let allResults = [...dbResults, ...results];

    return res.json(allResults);
  } catch (error) {
    next(error);
  }
};

const getPremium = async (req, res, next) => {
  try {
    const results = await Product.find({ premium: true });

    return res.json(results);
  } catch (error) {
    next(error);
  }
};

const putPremium = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { premiumData, overwrite } = req.body;

    const prod = await Product.findById(id);

    if (!prod.premium) {
      prod.premium = true;
      prod.premiumData = premiumData;
      await prod.save();
      return res.json("Premium created");
    } else {
      if (overwrite) {
        prod.premiumData.extraText = premiumData.extraText;
        // await prod.markModified('premiumData');
        await prod.save();
        return res.json("Extras replaced");
      } else {
        prod.premiumData.extraText.push(...premiumData.extraText);
        // await prod.markModified('premiumData');
        await prod.save();
        return res.json({ prod, message: "Extras updated" });
      }
    }
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
      seller:
        req.user.role === "admin" || req.user.role === "superadmin"
          ? "PROVIDER"
          : req.user._id,
      active: true,
    });
    const productSaved = await newProduct.save();

    const newPublication = new Publication({
      owner:
        req.user.role === "admin" || req.user.role === "superadmin"
          ? "PROVIDER"
          : req.user._id,
      product: newProduct._id,
      publication_date: Date.now(
        new Date().toLocaleString("es-Ar", {
          timeZone: "America/Buenos_Aires",
        })
      ),
    });
    await newPublication.save();

    res.json(productSaved);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const productFound = await Product.findById(req.params.id);
    if (!productFound)
      return res.json({ message: "Producto no encontrado", type: "warning" });
    if (
      productFound.seller !== req.user._id &&
      req.user.role !== "admin" &&
      req.user.role !== "superadmin"
    )
      return res.json({ message: "Sin autorización", type: "warning" });

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

  try {
    const productFound = await Product.findById(req.params.id);
    if (!productFound)
      return res.json({ message: "Producto no encontrado", type: "warning" });
    if (
      productFound.seller !== req.user._id &&
      req.user.role !== "admin" &&
      req.user.role !== "superadmin"
    )
      return res.json({ message: "Sin autorización", type: "warning" });

    if (!type)
      return res.json({
        message: "Tipo de descuento no recibido",
        type: "warning",
      });
    if (!number)
      return res.json({
        message: "Número de descuento no recibido",
        type: "warning",
      });
    if (type !== "percent" && type !== "fixed") {
      return res.json({
        message: "Tipo de descuento no soportado",
        type: "warning",
      });
    }

    const autoSales = await Sales.find();
    if (!autoSales)
      return res.json({ message: "Oferta no encontrada", type: "warning" });

    if (autoSales[0].products.includes(req.params.id))
      return res.json({
        message: "No puedes modificar el descuento de este producto",
        type: "warning",
      });

    if (type === "percent") {
      productFound.discount = parseInt(number);
    } else {
      const discount = (parseInt(number) * 100) / productFound.price;

      productFound.discount = discount;
    }

    productFound.on_sale = true;
    await productFound.save();
    return res.json({
      message: "Descuento aplicado con éxito",
      type: "success",
    });
  } catch (error) {
    next(error);
  }
};

const removeDiscount = async (req, res, next) => {
  try {
    const productFound = await Product.findById(req.params.id);
    if (!productFound)
      return res.json({ message: "Producto no encontrado", type: "warning" });
    if (
      productFound.seller !== req.user._id &&
      req.user.role !== "admin" &&
      req.user.role !== "superadmin"
    )
      return res.json({ message: "Sin autorización", type: "warning" });

    const autoSales = await Sales.find();
    if (!autoSales)
      return res.json({ message: "Oferta no encontrada", type: "warning" });

    if (autoSales[0].products.includes(req.params.id))
      return res.json({
        message: "No puedes remover el descuento de este producto",
        type: "warning",
      });

    productFound.discount = 0;
    productFound.on_sale = false;
    await productFound.save();
    return res.json({ message: "Oferta removida", type: "success" });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const productFound = await Product.findById(req.params.id);
    if (!productFound)
      return res.json({ message: "Producto no encontrado", type: "warning" });
    if (
      productFound.seller !== req.user._id &&
      req.user.role !== "admin" &&
      req.user.role !== "superadmin"
    )
      return res.json({ message: "Sin autorización", type: "warning" });

    if (productFound.undeletable) {
      return res.json({
        message: "Producto protegido. Imposible eliminar",
        type: "warning",
      });
    } else {
      /*         let deleteList = [];
      productFound.images.forEach((img) => deleteList.push(img.public_id));
      cloudinary.api.delete_resources(deleteList); */

      await Product.findByIdAndUpdate(req.params.id, { active: false });
      return res.json({
        message: "Publicación pausada exitosamente",
        type: "success",
      });
    }
  } catch (error) {
    next(error);
  }
};

const reactivateProduct = async (req, res, next) => {
  try {
    const productFound = await Product.findById(req.params.id);
    if (!productFound)
      return res.json({ message: "Producto no encontrado", type: "warning" });
    if (
      productFound.seller !== req.user._id &&
      req.user.role !== "admin" &&
      req.user.role !== "superadmin"
    )
      return res.json({ message: "Sin autorización", type: "warning" });

    if (productFound.available_quantity < 1)
      return res.json({
        message: "Repone stock para poder reactivar la publicación",
        type: "warning",
      });

    await Product.findByIdAndUpdate(req.params.id, { active: true });
    return res.json({
      message: "Publicación reactivada exitosamente",
      type: "success",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getProds,
  getByQuery,
  getById,
  stock,
  getPromos,
  getPremium,
  putPremium,
  createProduct,
  updateProduct,
  setDiscount,
  removeDiscount,
  deleteProduct,
  reactivateProduct,
};
