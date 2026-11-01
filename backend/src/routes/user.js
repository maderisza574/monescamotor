const express = require("express");
const Router = express.Router();
const userController = require("../controllers/user");
const { verifyToken, isSuperAdmin } = require("../middleware/auth");

// Seluruh rute manajemen pengguna dilindungi token dan khusus Super Admin
Router.use(verifyToken);
Router.use(isSuperAdmin);

Router.get("/", userController.getAllUsers);
Router.post("/", userController.createUser);
Router.patch("/:id", userController.updateUser);
Router.delete("/:id", userController.deleteUser);

module.exports = Router;
