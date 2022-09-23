const { Router } = require("express");
const router = Router();
const {
    getAddress,
    addAddress,
    updateAddress,
    removeAddress,
    setDefault
} = require("../controllers/address.ctrl.js");

router.get("/", getAddress);
router.post("/", addAddress);
router.put("/:id", updateAddress);
router.put("/default/:id", setDefault);
router.delete("/:id", removeAddress);

module.exports = router;