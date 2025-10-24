// import required packages
const express = require("express");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

// create express app
const app = express();
// middleware to parse JSON request bodies
app.use(express.json());

// database connection configuration
const config = {
  host: "localhost", // database server location
  port: 3307, // database port
  user: "user", // database username
  password: "password", // database password
  database: "db", // database name
  multipleStatements: true,
};

// endpoint to test if database connection works
app.get("/api/test-db", async (req, res) => {
  try {
    // try to connect to database
    const connection = await mysql.createConnection(config);
    // run a simple query to test connection
    await connection.execute("SELECT 1");
    // close the connection
    await connection.end();
    // send success response
    res.json({ message: "Database connected successfully!" });
  } catch (error) {
    // if connection fails, send error response
    res
      .status(500)
      .json({ error: "Database connection failed", details: error.message });
  }
});

// endpoint to create the users table in database
app.post("/api/setup", async (req, res) => {
  try {
    // connect to database
    const connection = await mysql.createConnection(config);
    // create users table if it doesn't exist
    // IF NOT EXISTS prevents errors if table already exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        password VARCHAR(100) NOT NULL
      )
    `);
    // close connection
    await connection.end();
    // send success response
    res.json({ message: "Users table created!" });
  } catch (error) {
    // if table creation fails, send error
    res.status(500).json({ error: error.message });
  }
});

// endpoint to create the users table in database
app.post("/api/setup-test", async (req, res) => {
  try {
    // location of the schema.sql file
    const schemaFilePath = path.join(__dirname, "db", "schema.sql");
    // read the SQL schema file
    const schemaSql = await fs.readFileSync(schemaFilePath, "utf8");
    // connect to database
    const connection = await mysql.createConnection(config);
    await connection.query(schemaSql);
    // close connection
    await connection.end();
    // send success response
    res.json({ message: "All tables created!" });
  } catch (error) {
    // if table creation fails, send error
    res.status(500).json({ error: error.message });
  }
});

// endpoint to add a new user to database
app.post("/api/users", async (req, res) => {
  try {
    // extract email and password from request body
    const { email, password } = req.body;
    // connect to database
    const connection = await mysql.createConnection(config);

    // insert new user into database
    // ? placeholders prevent SQL injection attacks
    const [result] = await connection.execute(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, password] // values to replace the ? placeholders
    );

    // close connection
    await connection.end();
    // send success response with new user's ID
    res.json({ message: "User added!", userId: result.insertId });
  } catch (error) {
    // if insertion fails, send error (could be duplicate email)
    res.status(500).json({ error: error.message });
  }
});

// endpoint to get all users from database
app.get("/api/users", async (req, res) => {
  try {
    // connect to database
    const connection = await mysql.createConnection(config);
    // get all users from users table
    const [rows] = await connection.execute("SELECT * FROM users");
    // close connection
    await connection.end();
    // send all users as JSON array
    res.json(rows);
  } catch (error) {
    // if query fails, send error
    res.status(500).json({ error: error.message });
  }
});

// endpoint to delete a specific user by ID
app.delete("/api/users/:id", async (req, res) => {
  try {
    // get user ID from URL parameter (/api/users/123 -> id = 123)
    const { id } = req.params;
    // connect to database
    const connection = await mysql.createConnection(config);

    // delete user with matching ID
    const [result] = await connection.execute(
      "DELETE FROM users WHERE id = ?",
      [id] // user ID to delete
    );

    // close connection
    await connection.end();

    // check if any rows were actually deleted
    if (result.affectedRows === 0) {
      // no user found with that ID
      res.status(404).json({ error: "User not found" });
    } else {
      // user was successfully deleted
      res.json({ message: "User deleted!", deletedUserId: id });
    }
  } catch (error) {
    // if deletion fails, send error
    res.status(500).json({ error: error.message });
  }
});

// start the server on port 3000
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log("Available endpoints:");
  console.log("  GET    /api/test-db     - test database connection");
  console.log("  POST   /api/setup       - create users table");
  console.log("  GET    /api/users       - get all users");
  console.log("  POST   /api/users       - add new user");
  console.log("  DELETE /api/users/:id   - delete user by ID");
});
