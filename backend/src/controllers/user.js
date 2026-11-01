const bcrypt = require("bcrypt");
const userModel = require("../models/user");
const wrapper = require("../utils/wrapper");

module.exports = {
  getAllUsers: async (request, response) => {
    try {
      const result = await userModel.getAllUsers();
      return wrapper.response(response, 200, "Berhasil mengambil daftar pengguna", result.data);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal mengambil daftar pengguna", error);
    }
  },

  createUser: async (request, response) => {
    try {
      const { username, password, name, role = "KASIR" } = request.body;

      if (!username || !password || !name) {
        return wrapper.response(response, 400, "Username, password, dan nama wajib diisi");
      }

      // Cek apakah username sudah dipakai
      const existingUser = await userModel.getUserByUsername(username).catch(() => ({ data: null }));
      if (existingUser && existingUser.data) {
        return wrapper.response(response, 400, "Username sudah digunakan, silakan pilih username lain");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const payload = {
        username: username.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        role: role.toUpperCase() === "SUPER_ADMIN" ? "SUPER_ADMIN" : "KASIR",
        is_active: true,
      };

      const result = await userModel.createUser(payload);
      return wrapper.response(response, 201, "Berhasil membuat akun pengguna baru", result.data[0]);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal membuat akun pengguna", error);
    }
  },

  updateUser: async (request, response) => {
    try {
      const { id } = request.params;
      const { name, role, is_active, password } = request.body;

      const updatePayload = {};
      if (name !== undefined) updatePayload.name = name.trim();
      if (role !== undefined) updatePayload.role = role.toUpperCase();
      if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);

      if (password) {
        updatePayload.password = await bcrypt.hash(password, 10);
      }

      const result = await userModel.updateUser(id, updatePayload);
      return wrapper.response(response, 200, "Berhasil memperbarui data pengguna", result.data[0]);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal memperbarui data pengguna", error);
    }
  },

  deleteUser: async (request, response) => {
    try {
      const { id } = request.params;
      // Jangan biarkan admin menghapus dirinya sendiri
      if (request.user && request.user.id === id) {
        return wrapper.response(response, 400, "Anda tidak dapat menghapus akun Anda sendiri");
      }
      await userModel.deleteUser(id);
      return wrapper.response(response, 200, "Berhasil menghapus akun pengguna");
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menghapus akun pengguna", error);
    }
  },
};
