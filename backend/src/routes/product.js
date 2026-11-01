const express = require("express");
const Router = express.Router();
const productController = require("../controllers/product");

Router.get("/", productController.getAllProducts);
Router.get("/:id", productController.getProductById);
Router.post("/", productController.createProduct);
Router.patch("/:id", productController.updateProduct);
Router.post("/:id/adjust-stock", productController.adjustStock);
Router.delete("/:id", productController.deleteProduct);

module.exports = Router;
