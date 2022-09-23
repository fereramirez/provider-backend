const { Router } = require("express");
const router = Router();
const productsRouter = require("./products.router");
const userRouter = require("./user.router");
const cartRouter = require("./cart.router");
const wishlistRouter = require("./wishlist.router");
const addressRouter = require("./address.router");
const orderRouter = require("./order.router");
const historyRouter = require("./history.router");
const stripeRouter = require("./stripe.router");
const mpRouter = require("./mercadopago.router");
const salesRouter = require("./sales.router");
const adminRouter = require("./admin.router");
const choNotif = require("./choNotif.router");
const {
    verifyToken,
    verifyAdmin,
    googleUserShallNotPass,
} = require("../middlewares/verify");

router.use("/user", userRouter);
router.use("/checkout-notification", choNotif);
router.use("/cart", verifyToken, cartRouter);
router.use("/wishlist", verifyToken, wishlistRouter);
router.use("/order", verifyToken, orderRouter);
router.use("/address", verifyToken, addressRouter);
router.use("/history", historyRouter);
router.use("/product", productsRouter);
router.use("/sales", salesRouter);
router.use("/stripe", verifyToken, stripeRouter);
router.use("/mercadopago", verifyToken, mpRouter);

/* //! VOLVER A VER descomentar lo de abajo */
router.use(
    "/admin",
    [verifyToken, /* googleUserShallNotPass,  */ verifyAdmin],
    adminRouter
);

module.exports = router;
