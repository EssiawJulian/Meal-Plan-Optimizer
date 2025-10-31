const express = require("express");
const router = express.Router();
const foodController = require("../controllers/foodController");

// food routes (use the same naming feel as demo task routes)
router.get("/", foodController.listFoods);
router.post("/", foodController.createFood);
router.delete("/:foodId", foodController.deleteFood);

// optional helper for dropdowns
router.get("/halls", foodController.listHalls);

module.exports = router;
