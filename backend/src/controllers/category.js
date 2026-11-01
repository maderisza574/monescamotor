const categoryModel = require("../models/category");
const wrapper = require("../utils/wrapper");

module.exports = {
  getAllCategories: async (request, response) => {
    try {
      const result = await categoryModel.getAllCategories();
      return wrapper.response(response, 200, "Berhasil mengambil kategori sparepart", result.data);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal mengambil kategori sparepart", error);
    }
  },

  getCategoryById: async (request, response) => {
    try {
      const { id } = request.params;
      const result = await categoryModel.getCategoryById(id);
      return wrapper.response(response, 200, "Berhasil mengambil detail kategori", result.data);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 404, "Kategori tidak ditemukan", error);
    }
  },

  createCategory: async (request, response) => {
    try {
      const { name, description } = request.body;
      if (!name) {
        return wrapper.response(response, 400, "Nama kategori wajib diisi");
      }
      const result = await categoryModel.createCategory({ name, description });
      return wrapper.response(response, 201, "Berhasil menambahkan kategori baru", result.data[0]);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menambahkan kategori", error);
    }
  },

  updateCategory: async (request, response) => {
    try {
      const { id } = request.params;
      const { name, description } = request.body;
      const result = await categoryModel.updateCategory(id, { name, description });
      return wrapper.response(response, 200, "Berhasil memperbarui kategori", result.data[0]);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal memperbarui kategori", error);
    }
  },

  deleteCategory: async (request, response) => {
    try {
      const { id } = request.params;
      await categoryModel.deleteCategory(id);
      return wrapper.response(response, 200, "Berhasil menghapus kategori");
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menghapus kategori", error);
    }
  },
};
