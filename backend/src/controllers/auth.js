const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user");
const wrapper = require("../utils/wrapper");

const JWT_SECRET = process.env.JWT_SECRET || "monescamotor_jwt_super_secret_key_2026";

module.exports = {
  login: async (request, response) => {
    try {
      const { username, password } = request.body;

      if (!username || !password) {
        return wrapper.response(response, 400, "Username dan password wajib diisi");
      }

      const userRes = await userModel.getUserByUsername(username).catch(() => ({ data: null }));
      const user = userRes.data;

      if (!user) {
        return wrapper.response(response, 404, "Username atau password salah");
      }

      if (!user.is_active) {
        return wrapper.response(response, 403, "Akun ini telah dinonaktifkan. Hubungi Super Admin.");
      }

      // Periksa password bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return wrapper.response(response, 400, "Username atau password salah");
      }

      // Buat token JWT (berlaku 7 hari agar kasir tidak sering logout)
      const payload = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

      return wrapper.response(response, 200, "Login berhasil", {
        user: payload,
        token,
      });
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Terjadi kesalahan pada server saat login", error);
    }
  },

  getProfile: async (request, response) => {
    try {
      const userId = request.user.id;
      const userRes = await userModel.getUserById(userId);
      return wrapper.response(response, 200, "Berhasil mengambil profil pengguna", userRes.data);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal mengambil data profil", error);
    }
  },
};
