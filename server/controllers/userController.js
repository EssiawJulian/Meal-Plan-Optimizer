const mysql = require("mysql2/promise");
const dbConfig = require("../config/database");

// test database connection
exports.testDb = async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute("SELECT 1");
    await connection.end();
    res.json({ message: "Database connected successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Database connection failed", details: error.message });
  }
};

// create users and tasks tables
exports.setup = async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    // create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // create tasks table with foreign key to users (one-to-many relationship)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_completed (completed)
      )
    `);

    await connection.end();
    res.json({ message: "Users and tasks tables created successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get all users
exports.getAllUsers = async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute("SELECT * FROM users");
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// delete a user by id
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      "DELETE FROM users WHERE id = ?",
      [id]
    );

    await connection.end();

    if (result.affectedRows === 0) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json({ message: "User deleted!", deletedUserId: id });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
