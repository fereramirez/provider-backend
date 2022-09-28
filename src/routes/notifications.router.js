const { Router } = require("express");
const router = Router();
const {
  getUserNotifications,
  deleteNotification,
  markAsSeen,
  post,
} = require("../controllers/notifications.ctrl.js");

router.get("/", getUserNotifications);
router.put("/:id", markAsSeen);
router.delete("/:id", deleteNotification);
router.post("/:id", post);

module.exports = router;
