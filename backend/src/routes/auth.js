const express = require("express");
const Router = express.Router();
const authController = require("../controllers/auth");
const { verifyToken } = require("../middleware/auth");

Router.post("/login", authController.login);
Router.get("/profile", verifyToken, authController.getProfile);

module.exports = Router;
