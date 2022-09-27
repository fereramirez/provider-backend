const { Router } = require("express");
const router = Router();
const {
    getUserNotifications,
    deleteNotification,
    markAsSeen
} = require("../controllers/notifications.ctrl.js");

router.get("/", getUserNotifications);
router.put("/:id", markAsSeen);
router.delete("/:id", deleteNotification);

module.exports = router;
