const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");

// task routes
router.post("/tasks", taskController.createTask);
router.get("/tasks", taskController.getAllTasks);
router.get("/tasks/user/:userId", taskController.getTasksByUser);
router.get("/tasks/user/:userId/stats", taskController.getTaskStats);
router.put("/tasks/:id", taskController.updateTask);
router.delete("/tasks/:id", taskController.deleteTask);

module.exports = router;
