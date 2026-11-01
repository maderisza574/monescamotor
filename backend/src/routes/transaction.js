const express = require("express");
const Router = express.Router();
const transactionController = require("../controllers/transaction");

Router.get("/", transactionController.getAllTransactions);
Router.get("/:id", transactionController.getTransactionById);
Router.post("/", transactionController.createTransaction);

module.exports = Router;
