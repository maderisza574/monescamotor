const express = require("express");
const Router = express.Router();
const brandController = require("../controllers/brand");

Router.get("/", brandController.getAllBrands);
Router.get("/:id", brandController.getBrandById);
Router.post("/", brandController.createBrand);
Router.patch("/:id", brandController.updateBrand);
Router.delete("/:id", brandController.deleteBrand);

module.exports = Router;
