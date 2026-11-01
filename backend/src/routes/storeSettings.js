const express = require("express");
const Router = express.Router();
const storeSettingsController = require("../controllers/storeSettings");

Router.get("/", storeSettingsController.getSettings);
Router.patch("/", storeSettingsController.updateSettings);

module.exports = Router;
