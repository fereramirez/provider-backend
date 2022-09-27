const { Router } = require("express");
const router = Router();
const {
  verifyAdminRoute,
  getAllUsers,
  getUser,
  getAllOrders,
  promoteUser,
  getUserAddresses,
  getUserOrders,
  getUserWishlist,
  banUser,
  unbanUser,
  deleteAllProducts,
  getMetrics,
} = require("../controllers/admin.ctrl");

router.get("/verify", verifyAdminRoute);

router.get("/user/getAll", getAllUsers);
router.get("/user/:id", getUser);
router.get("/order/getAll", getAllOrders);
router.put("/user/promote/:id", promoteUser);
router.post("/user/getAddresses", getUserAddresses);
router.post("/user/getOrders", getUserOrders);
router.post("/user/getWishlist", getUserWishlist);
router.delete("/user/:id", banUser);
router.put("/user/:id", unbanUser);
router.delete("/product/deleteall", deleteAllProducts);
router.get("/metrics", getMetrics);

module.exports = router;
