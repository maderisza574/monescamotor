const jwt = require("jsonwebtoken");
const transactionModel = require("../models/transaction");
const storeSettingsModel = require("../models/storeSettings");
const wrapper = require("../utils/wrapper");

const JWT_SECRET = process.env.JWT_SECRET || "monescamotor_jwt_super_secret_key_2026";

const generateInvoiceNumber = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${randomSuffix}`;
};

const generateExpenseNumber = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `EXP-${dateStr}-${randomSuffix}`;
};

module.exports = {
  createTransaction: async (request, response) => {
    try {
      const {
        customer_name = "Pelanggan Umum",
        customer_phone,
        vehicle_plate,
        vehicle_model,
        discount = 0,
        payment_method = "CASH",
        cash_given = 0,
        notes,
        items = [],
      } = request.body;

      if (!items || items.length === 0) {
        return wrapper.response(response, 400, "Keranjang transaksi tidak boleh kosong");
      }

      // Hitung subtotal dari items
      let subtotal = 0;
      for (const item of items) {
        if (!item.product_name || !item.unit_price || !item.quantity) {
          return wrapper.response(response, 400, "Data item transaksi tidak valid");
        }
        subtotal += Number(item.unit_price) * Number(item.quantity);
      }

      const totalAmount = Math.max(0, subtotal - Number(discount));
      const cashGivenNum = Number(cash_given);
      const changeDue = payment_method === "CASH" ? Math.max(0, cashGivenNum - totalAmount) : 0;

      const invoiceNumber = generateInvoiceNumber();

      const cashierId = request.user ? request.user.id : (request.body.cashier_id || null);
      const cashierName = request.user ? request.user.name : (request.body.cashier_name || "Kasir");

      const trxPayload = {
        invoice_number: invoiceNumber,
        cashier_id: cashierId,
        cashier_name: cashierName,
        customer_name,
        customer_phone: customer_phone || null,
        vehicle_plate: vehicle_plate || null,
        vehicle_model: vehicle_model || null,
        subtotal,
        discount: Number(discount),
        total_amount: totalAmount,
        payment_method,
        cash_given: cashGivenNum,
        change_due: changeDue,
        status: "COMPLETED",
        notes: notes || null,
      };

      const completedTrx = await transactionModel.createTransaction(trxPayload, items);

      // Jika transaksi ini berasal dari antrean draft motor di database, hapus draft-nya
      if (request.body.draft_id) {
        await transactionModel.deleteDraft(request.body.draft_id).catch(() => {});
      }

      // Ambil profil toko untuk cetak struk bluetooth
      const storeRes = await storeSettingsModel.getSettings().catch(() => ({ data: null }));

      return wrapper.response(response, 201, "Transaksi berhasil diproses", {
        transaction: completedTrx,
        store: storeRes.data,
      });
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal memproses transaksi kasir", error);
    }
  },

  getAllTransactions: async (request, response) => {
    try {
      let { page = 1, limit = 100, startDate, endDate } = request.query;
      page = Math.max(1, parseInt(page, 10) || 1);
      limit = Math.min(1000, Math.max(1, parseInt(limit, 10) || 100));

      const totalData = await transactionModel.getCountTransactions(startDate, endDate);
      const totalPage = Math.ceil(totalData / limit);
      const offset = (page - 1) * limit;

      const pagination = {
        page,
        totalPage,
        limit,
        totalData,
      };

      const result = await transactionModel.getAllTransactions(offset, limit, startDate, endDate);
      return wrapper.response(
        response,
        200,
        "Berhasil mengambil riwayat transaksi",
        result.data,
        pagination
      );
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal mengambil riwayat transaksi", error);
    }
  },

  getTransactionById: async (request, response) => {
    try {
      const { id } = request.params;
      const result = await transactionModel.getTransactionById(id);
      const storeRes = await storeSettingsModel.getSettings().catch(() => ({ data: null }));

      return wrapper.response(response, 200, "Berhasil mengambil detail transaksi", {
        transaction: result.data,
        store: storeRes.data,
      });
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 404, "Transaksi tidak ditemukan", error);
    }
  },

  deleteTransaction: async (request, response) => {
    try {
      const { id } = request.params;
      const { restore_stock = true } = request.body || {};
      await transactionModel.deleteTransaction(id, restore_stock);
      return wrapper.response(response, 200, "Transaksi berhasil dihapus");
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menghapus transaksi", error);
    }
  },

  resetAllTransactions: async (request, response) => {
    try {
      const { restore_stock = true } = request.body || {};
      await transactionModel.resetAllTransactions(restore_stock);
      return wrapper.response(response, 200, "Seluruh transaksi dan omzet berhasil di-reset");
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal mereset transaksi dan omzet", error);
    }
  },

  // Simpan / Perbarui Antrean Draft Motor Ditinggal ke Database
  saveDraft: async (request, response) => {
    try {
      const {
        draft_id,
        customer_name = "Pelanggan Umum",
        customer_phone,
        vehicle_plate,
        vehicle_model,
        discount = 0,
        cash_given = 0,
        deposit = 0,
        notes,
        items = [],
      } = request.body;

      if (!items || items.length === 0) {
        return wrapper.response(response, 400, "Keranjang draft tidak boleh kosong");
      }

      let subtotal = 0;
      for (const item of items) {
        if (!item.product_name || !item.unit_price || !item.quantity) {
          return wrapper.response(response, 400, "Data item draft tidak valid");
        }
        subtotal += Number(item.unit_price) * Number(item.quantity);
      }

      const totalAmount = Math.max(0, subtotal - Number(discount));
      const depositAmount = Number(cash_given || deposit || 0);
      const cashierName = request.user ? request.user.name : (request.body.cashier_name || "Kasir");

      // Jika draft_id sudah ada di database, lakukan update
      if (draft_id) {
        try {
          const updated = await transactionModel.updateDraft(
            draft_id,
            {
              customer_name,
              customer_phone: customer_phone || null,
              vehicle_plate: vehicle_plate || null,
              vehicle_model: vehicle_model || null,
              subtotal,
              discount: Number(discount),
              total_amount: totalAmount,
              cash_given: depositAmount,
              notes: notes || null,
            },
            items
          );

          return wrapper.response(response, 200, "Draft berhasil diperbarui di database", updated);
        } catch (e) {
          console.warn("Update draft failed, will create new draft instead:", e.message);
        }
      }

      // Buat nomor draft baru (format: DFT-YYYYMMDD-XXXX)
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `DFT-${dateStr}-${randomSuffix}`;

      const draftPayload = {
        invoice_number: invoiceNumber,
        cashier_name: cashierName,
        customer_name,
        customer_phone: customer_phone || null,
        vehicle_plate: vehicle_plate || null,
        vehicle_model: vehicle_model || null,
        subtotal,
        discount: Number(discount),
        total_amount: totalAmount,
        payment_method: "DRAFT",
        cash_given: depositAmount,
        change_due: 0,
        status: "DRAFT",
        notes: notes || null,
      };

      const savedDraft = await transactionModel.createTransaction(draftPayload, items);

      return wrapper.response(response, 201, "Draft berhasil disimpan ke database", savedDraft);
    } catch (error) {
      console.error("Save draft error:", error);
      return wrapper.response(response, 500, "Gagal menyimpan draft ke database", error);
    }
  },

  // Ambil Semua Draft Aktif dari Database
  getDrafts: async (request, response) => {
    try {
      const drafts = await transactionModel.getDrafts();
      return wrapper.response(response, 200, "Daftar draft berhasil diambil", drafts);
    } catch (error) {
      console.error("Get drafts error:", error);
      return wrapper.response(response, 500, "Gagal mengambil daftar draft", error);
    }
  },

  // Hapus Draft dari Database
  deleteDraft: async (request, response) => {
    try {
      const { id } = request.params;
      await transactionModel.deleteDraft(id);
      return wrapper.response(response, 200, "Draft berhasil dihapus dari database");
    } catch (error) {
      console.error("Delete draft error:", error);
      return wrapper.response(response, 500, "Gagal menghapus draft", error);
    }
  },

  // Catat Pengeluaran Operasional / Belanja Bengkel
  createExpense: async (request, response) => {
    try {
      const {
        category = "Operasional Bengkel",
        amount = 0,
        description = "",
        payment_method = "CASH",
        date,
      } = request.body;

      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        return wrapper.response(response, 400, "Nominal pengeluaran harus lebih besar dari 0");
      }

      let cashierName = (request.user && (request.user.name || request.user.username)) || request.body.cashier_name || "Kasir";
      let cashierId = (request.user && request.user.id) || request.body.cashier_id || null;

      // Cek auth header jika user belum di-parse
      if (!request.user && request.headers.authorization) {
        try {
          let token = request.headers.authorization;
          if (token.startsWith("Bearer ")) {
            token = token.slice(7).trim();
          }
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded) {
            cashierId = decoded.id;
            cashierName = decoded.name || decoded.username;
          }
        } catch (_) {}
      }

      const invoiceNumber = generateExpenseNumber();

      const expensePayload = {
        invoice_number: invoiceNumber,
        cashier_id: cashierId,
        cashier_name: cashierName,
        customer_name: category.trim() || "Pengeluaran Bengkel",
        customer_phone: null,
        vehicle_plate: null,
        vehicle_model: null,
        subtotal: numAmount,
        discount: 0,
        total_amount: numAmount,
        payment_method: payment_method || "CASH",
        cash_given: numAmount,
        change_due: 0,
        status: "EXPENSE",
        notes: description ? description.trim() : null,
      };

      if (date) {
        expensePayload.created_at = new Date(date).toISOString();
      }

      const itemPayload = [
        {
          product_id: null,
          product_name: `[PENGELUARAN] ${category}: ${description || ''}`.trim(),
          brand_name: null,
          is_service: true, // Non-stok agar tidak memotong stok fisik gudang
          cost_price: numAmount,
          unit_price: numAmount,
          quantity: 1,
          subtotal: numAmount,
        },
      ];

      const savedExpense = await transactionModel.createTransaction(expensePayload, itemPayload);

      return wrapper.response(response, 201, "Pengeluaran bengkel berhasil dicatat", savedExpense);
    } catch (error) {
      console.error("Create expense error:", error);
      return wrapper.response(response, 500, "Gagal mencatat pengeluaran bengkel", error);
    }
  },

  // Hapus Catatan Pengeluaran
  deleteExpense: async (request, response) => {
    try {
      const { id } = request.params;
      await transactionModel.deleteTransaction(id, false);
      return wrapper.response(response, 200, "Catatan pengeluaran berhasil dihapus");
    } catch (error) {
      console.error("Delete expense error:", error);
      return wrapper.response(response, 500, "Gagal menghapus catatan pengeluaran", error);
    }
  },
};
