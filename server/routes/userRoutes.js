const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// user routes
router.get("/test-db", userController.testDb);
router.post("/setup", userController.setup);
router.get("/users", userController.getAllUsers);
router.delete("/users/:id", userController.deleteUser);

module.exports = router;
