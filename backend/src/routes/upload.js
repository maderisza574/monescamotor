const express = require("express");
const Router = express.Router();
const uploadMiddleware = require("../middleware/upload");
const uploadController = require("../controllers/upload");

Router.post("/", uploadMiddleware.single("image"), uploadController.uploadImage);

module.exports = Router;
