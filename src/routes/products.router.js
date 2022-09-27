const { Router } = require("express");
const router = Router();
const {
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
} = require("../controllers/products.ctrl.js");
const { verifyToken } = require("../middlewares/verify");

router.get("/", getAll);
router.get("/provider/", getProds);
router.get("/search", getByQuery);
router.put("/stock/", stock);
router.get("/promos", getPromos);
router.get("/premium", getPremium);
router.put("/premium/:id", putPremium);
router.get("/:id", getById);

router.post("/", verifyToken, createProduct);
router.put("/:id", verifyToken, updateProduct);
router.put("/discount/:id", verifyToken, setDiscount);
router.delete("/discount/:id", verifyToken, removeDiscount);
router.delete("/:id", verifyToken, deleteProduct);

module.exports = router;
