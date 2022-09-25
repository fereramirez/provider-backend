const { Router } = require("express");
const router = Router();
const { verifyAdmin } = require("../middlewares/verify");
const {
    getComments,
    postComment,
    editComment,
    deleteComment
} = require("../controllers/comments.ctrl.js");

router.get("/", getComments);
router.post("/", postComment);
router.put("/", editComment);
router.delete("/", verifyAdmin, deleteComment);

module.exports = router;