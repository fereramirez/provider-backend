const { Router } = require("express");
const router = Router();
const {
    getHistory,
    getSuggestion,
    postVisited,
    postSearch,
} = require("../controllers/history.ctrl.js");
const {
    verifyToken,
} = require("../middlewares/verify");

router.get("/", verifyToken, getHistory);
router.post("/suggestion", getSuggestion);
router.post("/search/:search", verifyToken, postSearch);
router.post("/visited", verifyToken, postVisited);

module.exports = router;