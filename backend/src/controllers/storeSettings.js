const storeSettingsModel = require("../models/storeSettings");
const wrapper = require("../utils/wrapper");

module.exports = {
  getSettings: async (request, response) => {
    try {
      const result = await storeSettingsModel.getSettings();
      return wrapper.response(response, 200, "Berhasil mengambil profil toko", result.data);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal mengambil profil toko", error);
    }
  },

  updateSettings: async (request, response) => {
    try {
      const { store_name, tagline, address, phone, receipt_footer } = request.body;
      const result = await storeSettingsModel.updateSettings({
        store_name,
        tagline,
        address,
        phone,
        receipt_footer,
      });
      return wrapper.response(response, 200, "Berhasil memperbarui profil toko", result.data);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal memperbarui profil toko", error);
    }
  },
};
