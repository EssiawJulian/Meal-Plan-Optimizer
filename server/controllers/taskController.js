const mysql = require("mysql2/promise");
const dbConfig = require("../config/database");

// create a new task for a user
exports.createTask = async (req, res) => {
  try {
    const { user_id, title, description } = req.body;

    if (!user_id || !title) {
      return res.status(400).json({ error: "user_id and title are required" });
    }

    const connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      "INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?)",
      [user_id, title, description || null]
    );

    const [newTask] = await connection.execute(
      "SELECT * FROM tasks WHERE id = ?",
      [result.insertId]
    );

    await connection.end();

    res.json({
      message: "Task created successfully!",
      task: newTask[0],
    });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(404).json({ error: "User not found" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

// get all tasks for a specific user
exports.getTasksByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { completed } = req.query;

    const connection = await mysql.createConnection(dbConfig);

    let query = "SELECT * FROM tasks WHERE user_id = ?";
    const params = [userId];

    // filter by completion status if provided
    if (completed !== undefined) {
      query += " AND completed = ?";
      params.push(completed === "true" ? 1 : 0);
    }

    query += " ORDER BY created_at DESC";

    const [tasks] = await connection.execute(query, params);
    await connection.end();

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get all tasks with user information (demonstrates JOIN)
exports.getAllTasks = async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const [tasks] = await connection.execute(`
      SELECT 
        tasks.id,
        tasks.title,
        tasks.description,
        tasks.completed,
        tasks.created_at,
        tasks.updated_at,
        tasks.user_id,
        users.username
      FROM tasks
      INNER JOIN users ON tasks.user_id = users.id
      ORDER BY tasks.created_at DESC
    `);

    await connection.end();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get task statistics for a user (demonstrates aggregate functions)
exports.getTaskStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const connection = await mysql.createConnection(dbConfig);

    const [stats] = await connection.execute(
      `
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as pending_tasks
      FROM tasks
      WHERE user_id = ?
    `,
      [userId]
    );

    await connection.end();
    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// update a task (demonstrates UPDATE operation)
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body;

    if (
      title === undefined &&
      description === undefined &&
      completed === undefined
    ) {
      return res
        .status(400)
        .json({ error: "At least one field must be provided for update" });
    }

    const connection = await mysql.createConnection(dbConfig);

    // build dynamic UPDATE query based on provided fields
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (completed !== undefined) {
      updates.push("completed = ?");
      values.push(completed ? 1 : 0);
    }

    values.push(id);

    const [result] = await connection.execute(
      `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      await connection.end();
      return res.status(404).json({ error: "Task not found" });
    }

    const [updatedTask] = await connection.execute(
      "SELECT * FROM tasks WHERE id = ?",
      [id]
    );

    await connection.end();

    res.json({
      message: "Task updated successfully!",
      task: updatedTask[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// delete a task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      "DELETE FROM tasks WHERE id = ?",
      [id]
    );

    await connection.end();

    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Task not found" });
    } else {
      res.json({ message: "Task deleted successfully!", deletedTaskId: id });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
