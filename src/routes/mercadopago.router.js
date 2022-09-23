const { Router } = require("express");
const router = Router();
const {
    mpCho
} = require("../controllers/mercadopago.ctrl.js");

router.get("/:id", mpCho);

module.exports = router;