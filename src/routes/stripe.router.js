const { Router } = require("express");
const router = Router();
const {
    create
} = require("../controllers/stripe.ctrl.js");

router.post("/:id", create);

module.exports = router;