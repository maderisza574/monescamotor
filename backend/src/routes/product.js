const express = require("express");
const Router = express.Router();
const productController = require("../controllers/product");
const { verifyToken, isSuperAdmin } = require("../middleware/auth");

Router.get("/", productController.getAllProducts);
Router.get("/:id", productController.getProductById);
Router.post("/", verifyToken, productController.createProduct);
Router.patch("/:id", verifyToken, productController.updateProduct);
Router.post("/:id/adjust-stock", verifyToken, productController.adjustStock);
Router.delete("/:id", verifyToken, isSuperAdmin, productController.deleteProduct);

module.exports = Router;
