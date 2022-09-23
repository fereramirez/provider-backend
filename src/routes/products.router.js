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
} = require("../controllers/products.ctrl.js");

router.get("/", getAll);
router.get("/provider/", getProds);
router.get("/search", getByQuery);
router.put("/stock/", stock);
router.get("/promos", getPromos);
router.get("/premium", getPremium);
router.put("/premium/:id", putPremium);
router.get("/:id", getById);

module.exports = router;
