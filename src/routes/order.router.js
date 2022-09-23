const { Router } = require("express");
const router = Router();
const {
    getOrder,
    getOrdersUser,
    createOrder,
    buyNowOrder,
    deleteOrder,
    updateOrder,
    getPostsale
} = require("../controllers/order.ctrl.js");

router.get("/userall", getOrdersUser);
router.get("/postsale/:id", getPostsale);
router.get("/:id", getOrder);
router.post("/", createOrder);
router.post("/buyNow", buyNowOrder);
router.put("/:id", updateOrder);
router.delete("/", deleteOrder);

module.exports = router;
