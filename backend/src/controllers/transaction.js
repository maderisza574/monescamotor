const transactionModel = require("../models/transaction");
const storeSettingsModel = require("../models/storeSettings");
const wrapper = require("../utils/wrapper");

const generateInvoiceNumber = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${randomSuffix}`;
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
      let { page = 1, limit = 50 } = request.query;
      page = Math.max(1, parseInt(page, 10) || 1);
      limit = Math.max(1, parseInt(limit, 10) || 50);

      const totalData = await transactionModel.getCountTransactions();
      const totalPage = Math.ceil(totalData / limit);
      const offset = (page - 1) * limit;

      const pagination = {
        page,
        totalPage,
        limit,
        totalData,
      };

      const result = await transactionModel.getAllTransactions(offset, limit);
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
};
