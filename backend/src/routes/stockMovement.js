const express = require("express");
const Router = express.Router();
const stockMovementController = require("../controllers/stockMovement");

Router.get("/", stockMovementController.getAllMovements);

module.exports = Router;
