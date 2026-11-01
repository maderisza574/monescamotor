const express = require("express");
const Router = express.Router();

const authRoutes = require("./auth");
const userRoutes = require("./user");
const brandRoutes = require("./brand");
const categoryRoutes = require("./category");
const productRoutes = require("./product");
const transactionRoutes = require("./transaction");
const stockMovementRoutes = require("./stockMovement");
const storeSettingsRoutes = require("./storeSettings");
const uploadRoutes = require("./upload");

Router.get("/health", (request, response) => {
  response.status(200).json({
    status: 200,
    message: "API Monesca Motor berjalan dengan baik",
    timestamp: new Date().toISOString(),
  });
});

Router.use("/auth", authRoutes);
Router.use("/users", userRoutes);
Router.use("/brands", brandRoutes);
Router.use("/categories", categoryRoutes);
Router.use("/products", productRoutes);
Router.use("/transactions", transactionRoutes);
Router.use("/stock-movements", stockMovementRoutes);
Router.use("/settings", storeSettingsRoutes);
Router.use("/upload", uploadRoutes);

module.exports = Router;
