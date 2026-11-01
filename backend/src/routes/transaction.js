const express = require("express");
const Router = express.Router();
const transactionController = require("../controllers/transaction");
const { verifyToken, isSuperAdmin } = require("../middleware/auth");

Router.get("/", transactionController.getAllTransactions);
Router.get("/:id", transactionController.getTransactionById);
Router.post("/", transactionController.createTransaction);

// Khusus Owner (Super Admin): Hapus Satuan & Reset Seluruh Omzet
Router.delete("/reset-all", verifyToken, isSuperAdmin, transactionController.resetAllTransactions);
Router.delete("/:id", verifyToken, isSuperAdmin, transactionController.deleteTransaction);

module.exports = Router;
