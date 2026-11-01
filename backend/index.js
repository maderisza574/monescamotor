const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const routerNavigation = require("./src/routes");

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(compression());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Main API Route
app.use("/api", routerNavigation);
app.use("/", routerNavigation);

// Root Greetings
app.get("/", (req, res) => {
  res.status(200).json({
    status: 200,
    message: "Selamat Datang di Backend API POS & Stok Gudang Monesca Motor",
  });
});

// Fallback 404 Route
app.use("/*", (req, res) => {
  res.status(404).json({
    status: 404,
    message: "Path endpoint tidak ditemukan!",
  });
});

// Jalankan standalone server saat dijalankan langsung (node index.js / npm run dev), bukan serverless Vercel
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server Monesca Motor berjalan di port ${port}`);
    console.log(`API URL: http://localhost:${port}/api`);
  });
}

module.exports = app;
