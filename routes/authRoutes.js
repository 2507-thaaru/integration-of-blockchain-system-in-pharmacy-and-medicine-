const express = require("express");
const router  = express.Router();
const { register, login, getMe, linkWallet } = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login",    login);
router.get("/me",        authenticate, getMe);
router.patch("/wallet",  authenticate, linkWallet);

module.exports = router;
