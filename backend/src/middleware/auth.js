const jwt = require("jsonwebtoken");
const wrapper = require("../utils/wrapper");

const JWT_SECRET = process.env.JWT_SECRET || "monescamotor_jwt_super_secret_key_2026";

module.exports = {
  verifyToken: (request, response, next) => {
    try {
      let token = request.headers.authorization;
      if (!token) {
        return wrapper.response(response, 401, "Akses ditolak: Silakan login terlebih dahulu");
      }

      if (token.startsWith("Bearer ")) {
        token = token.slice(7, token.length).trimLeft();
      }

      jwt.verify(token, JWT_SECRET, (error, decoded) => {
        if (error) {
          return wrapper.response(response, 403, "Sesi login kedaluwarsa atau tidak valid", error);
        }
        request.user = decoded;
        next();
      });
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Terjadi kesalahan autentikasi", error);
    }
  },

  isSuperAdmin: (request, response, next) => {
    if (request.user && request.user.role === "SUPER_ADMIN") {
      next();
    } else {
      return wrapper.response(response, 403, "Akses terbatas: Hanya Super Admin / Pemilik yang diizinkan");
    }
  },
};
