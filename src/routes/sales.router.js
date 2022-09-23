const { Router } = require("express");
const router = Router();
const {
    getSales,
    setNewSales,
    resetSales,
    undeletable
} = require("../controllers/sales.ctrl.js");

router.get("/", getSales);
router.get("/set_new_sales", setNewSales);
router.get("/undeletable", undeletable);
router.delete("/", resetSales);

module.exports = router;