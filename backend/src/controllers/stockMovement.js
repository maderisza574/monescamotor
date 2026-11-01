const stockMovementModel = require("../models/stockMovement");
const wrapper = require("../utils/wrapper");

module.exports = {
  getAllMovements: async (request, response) => {
    try {
      const { productId, limit = 100 } = request.query;
      const result = await stockMovementModel.getAllMovements(productId, parseInt(limit, 10));
      return wrapper.response(response, 200, "Berhasil mengambil riwayat mutasi stok", result.data);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal mengambil riwayat mutasi stok", error);
    }
  },
};
