const express = require("express");
const Router = express.Router();
const transactionController = require("../controllers/transaction");
const { verifyToken, isSuperAdmin } = require("../middleware/auth");

// Rute Draft Antrean Motor Ditinggal (Database Supabase)
Router.get("/drafts/all", transactionController.getDrafts);
Router.post("/drafts", transactionController.saveDraft);
Router.delete("/drafts/:id", transactionController.deleteDraft);

Router.get("/", transactionController.getAllTransactions);
Router.get("/:id", transactionController.getTransactionById);
Router.post("/", transactionController.createTransaction);

// Khusus Owner (Super Admin): Hapus Satuan & Reset Seluruh Omzet
Router.delete("/reset-all", verifyToken, isSuperAdmin, transactionController.resetAllTransactions);
Router.delete("/:id", verifyToken, isSuperAdmin, transactionController.deleteTransaction);

module.exports = Router;
