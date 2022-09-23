const { Router } = require("express");
const router = Router();
const {
  verifyToken,
  verifyEmailVerified,
  googleUserShallNotPass,
} = require("../middlewares/verify");
const passport = require("passport");
const {
  signin,
  signinGoogle,
  sendVerifyEmail,
  profile,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  updatePassword,
  editProfile,
  setAvatar,
} = require("../controllers/user.ctrl");
const { body } = require("express-validator");

const emailValidation = body("email", "Ingresa un email válido")
  .trim()
  .notEmpty()
  .isEmail()
  .escape();

const passwordValidation = body("password", "Ingresa una contraseña válida")
  .trim()
  .notEmpty()
  .isLength({ min: 6 })
  .escape();

const passwordValidationSignup = body(
  "password",
  "Ingresa una contraseña válida"
)
  .trim()
  .notEmpty()
  .isLength({ min: 6 })
  .escape()
  .custom((value, { req }) => {
    if (value !== req.body.repPassword) {
      throw new Error("Las contraseñas deben coincidir");
    } else {
      return value;
    }
  });

const passwordValidationToUpdate = body(
  "oldPassword",
  "Ingresa una contraseña válida"
)
  .trim()
  .notEmpty()
  .escape();

const passwordValidationChange = body(
  "password",
  "La contraseña debe tener al menos 6 caracteres"
)
  .trim()
  .notEmpty()
  .isLength({ min: 6 })
  .escape()
  .custom((value, { req }) => {
    if (value !== req.body.repPassword) {
      throw new Error("Las contraseñas deben coincidir");
    } else {
      return value;
    }
  });

router.post(
  "/signup",
  [
    emailValidation,
    passwordValidationSignup,
    passport.authenticate("signup", { session: false }),
  ],
  sendVerifyEmail
);
router.post("/signin", [emailValidation, passwordValidation], signin);
router.post("/signinGoogle", signinGoogle);
router.post("/avatar", verifyToken, setAvatar);
router.get("/profile/:token", verifyToken, profile);
router.put("/sendVerifyEmail", verifyToken, sendVerifyEmail);
router.put("/verifyEmail", verifyToken, verifyEmail);
router.put("/forgotPassword", emailValidation, forgotPassword);
router.put("/resetPassword", resetPassword);
router.put("/changePassword", passwordValidationChange, changePassword);
router.put(
  "/updatePassword",
  [
    verifyToken,
    googleUserShallNotPass,
    passwordValidationToUpdate,
    passwordValidationChange,
  ],
  updatePassword
);
router.put("/editProfile", [verifyToken, verifyEmailVerified], editProfile);

module.exports = router;
