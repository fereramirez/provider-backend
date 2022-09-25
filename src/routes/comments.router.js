const { Router } = require("express");
const router = Router();
const {
    getComments,
    postComment,
    editComment,
    deleteComment
} = require("../controllers/comments.ctrl.js");

router.get("/", getComments);
router.post("/", postComment);
router.put("/", editComment);
router.delete("/", deleteComment);

module.exports = router;