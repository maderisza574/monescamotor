const express = require("express");
const Router = express.Router();
const categoryController = require("../controllers/category");

Router.get("/", categoryController.getAllCategories);
Router.get("/:id", categoryController.getCategoryById);
Router.post("/", categoryController.createCategory);
Router.patch("/:id", categoryController.updateCategory);
Router.delete("/:id", categoryController.deleteCategory);

module.exports = Router;
