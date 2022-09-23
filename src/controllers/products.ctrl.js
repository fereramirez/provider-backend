require("dotenv").config();
const { CLOUDINARY_CLOUD, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;
const cloudinary = require("cloudinary").v2;
const Product = require("../models/product");
const axios = require("axios");
const { meliSearchParser } = require("../utils/meliParser");
const { rawIdProductGetter } = require("../utils/rawIdProductGetter");

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
    return res.json(product);
  } catch (error) {
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

module.exports = {
  getAll,
  getProds,
  getByQuery,
  getById,
  stock,
  getPromos,
  getPremium,
  putPremium,
};
