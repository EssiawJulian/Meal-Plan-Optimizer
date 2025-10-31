const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const dbConfig = require("../config/database");

// register a new user
exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    const connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    await connection.end();

    res.json({
      message: "User created successfully!",
      userId: result.insertId,
      username: username,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "Username or email already exists" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

// login an existing user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      "SELECT id, username, email, password FROM users WHERE username = ?",
      [username]
    );

    await connection.end();

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = rows[0];

    // verify password against hashed version
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    res.json({
      message: "Login successful!",
      userId: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
