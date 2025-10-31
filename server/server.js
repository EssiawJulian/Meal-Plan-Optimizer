// import required packages (same style as demo)
const express = require("express");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const cors = require("cors");

// create express app
const app = express();

// middleware to parse JSON request bodies
app.use(express.json());

// allow frontend (Vite) to call this API during development
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// database connection configuration (matches docker-compose)
const config = {
  host: "localhost",
  port: 3307,
  user: "user",
  password: "password",
  database: "db",
  multipleStatements: true,
};

/* =======================
   BASIC DB UTIL ENDPOINTS
   (modeled after your demo)
   ======================= */

// test DB connection
app.get("/api/test-db", async (req, res) => {
  try {
    const connection = await mysql.createConnection(config);
    await connection.execute("SELECT 1");
    await connection.end();
    res.json({ message: "Database connected successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Database connection failed", details: error.message });
  }
});

// create a minimal Users table (if you want a quick local test)
// NOTE: final schema should be applied via /api/setup-test (schema.sql)
app.post("/api/setup", async (req, res) => {
  try {
    const connection = await mysql.createConnection(config);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL
      )
    `);
    await connection.end();
    res.json({ message: "Users table ensured!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// apply full schema & sample data from schema.sql
app.post("/api/setup-test", async (req, res) => {
  try {
    // If your schema.sql is at repo root: ../schema.sql
    const schemaFilePath = path.join(__dirname, "..", "schema.sql");

    // If you instead keep it in server/db/schema.sql, use:
    // const schemaFilePath = path.join(__dirname, "db", "schema.sql");

    const schemaSql = fs.readFileSync(schemaFilePath, "utf8");
    const connection = await mysql.createConnection(config);
    await connection.query(schemaSql);
    await connection.end();
    res.json({ message: "Schema applied from schema.sql!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========
   AUTH (no tasks)
   Manual SQL + bcrypt
   ========== */

// POST /api/signup  { email, password }
app.post("/api/signup", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    const hash = await bcrypt.hash(password, 10);
    const connection = await mysql.createConnection(config);

    // this assumes a simple users table (id, email, password)
    // if your final schema uses different columns, adjust SQL & column names accordingly
    await connection.execute(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, hash]
    );

    await connection.end();
    res.status(201).json({ message: "User registered!" });
  } catch (error) {
    // duplicate email → ER_DUP_ENTRY
    res.status(500).json({ error: error.message });
  }
});

// POST /api/login  { email, password }
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    const connection = await mysql.createConnection(config);
    const [rows] = await connection.execute(
      "SELECT id, email, password FROM users WHERE email = ?",
      [email]
    );
    await connection.end();

    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    // for class demo: return user data; in production, issue a session/JWT
    res.json({ id: user.id, email: user.email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users  – quick view of users (demo convenience)
app.get("/api/users", async (_req, res) => {
  try {
    const connection = await mysql.createConnection(config);
    const [rows] = await connection.execute("SELECT id, email FROM users ORDER BY id DESC");
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id – remove a user (demo convenience)
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(config);
    const [result] = await connection.execute("DELETE FROM users WHERE id = ?", [id]);
    await connection.end();

    if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted!", deletedUserId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================
   VT DINING – FOOD CATALOGUE
   (Add & Delete Foods)
   Tables (from your schema):
   - DinningHalls(HallID, HallName, ...)
   - FoodCatalogue(FoodID, HallID, FoodName, Calories, Fat, Protein, Carbs, ServingSize, ...)
   ========================== */

// GET /api/foods?hallId=1&limit=200
app.get("/api/foods", async (req, res) => {
  try {
    const { hallId, limit = 200 } = req.query;
    const connection = await mysql.createConnection(config);

    let sql = `
      SELECT fc.*, dh.HallName
      FROM FoodCatalogue fc
      LEFT JOIN DinningHalls dh ON dh.HallID = fc.HallID`;
    const params = [];

    if (hallId) {
      sql += " WHERE fc.HallID = ?";
      params.push(hallId);
    }

    sql += ` ORDER BY fc.FoodID DESC LIMIT ${parseInt(limit)}`;

    const [rows] = await connection.execute(sql, params);
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/foods
// body: { HallID?, FoodName*, Calories?, Fat?, Protein?, Carbs?, ServingSize* }
app.post("/api/foods", async (req, res) => {
  try {
    const { HallID, FoodName, Calories, Fat, Protein, Carbs, ServingSize } = req.body || {};
    if (!FoodName || !ServingSize) {
      return res.status(400).json({ error: "FoodName and ServingSize are required" });
    }

    const connection = await mysql.createConnection(config);

    // Optional FK guard: ensure HallID exists if provided
    if (HallID) {
      const [h] = await connection.execute(
        "SELECT HallID FROM DinningHalls WHERE HallID = ?",
        [HallID]
      );
      if (h.length === 0) {
        await connection.end();
        return res.status(400).json({ error: "Invalid HallID" });
      }
    }

    const [result] = await connection.execute(
      `INSERT INTO FoodCatalogue
        (HallID, FoodName, Calories, Fat, Protein, Carbs, ServingSize)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        HallID ?? null,
        FoodName,
        Calories ?? 0,
        Fat ?? 0,
        Protein ?? 0,
        Carbs ?? 0,
        ServingSize,
      ]
    );

    const [rows] = await connection.execute(
      `SELECT fc.*, dh.HallName
         FROM FoodCatalogue fc
         LEFT JOIN DinningHalls dh ON dh.HallID = fc.HallID
        WHERE fc.FoodID = ?`,
      [result.insertId]
    );

    await connection.end();
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/foods/:foodId
app.delete("/api/foods/:foodId", async (req, res) => {
  try {
    const { foodId } = req.params;
    const connection = await mysql.createConnection(config);
    const [r] = await connection.execute("DELETE FROM FoodCatalogue WHERE FoodID = ?", [foodId]);
    await connection.end();

    if (r.affectedRows === 0) return res.status(404).json({ error: "Food not found" });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// (Optional) GET /api/halls – handy for a dropdown on the frontend
app.get("/api/halls", async (_req, res) => {
  try {
    const connection = await mysql.createConnection(config);
    const [rows] = await connection.execute(
      "SELECT HallID, HallName FROM DinningHalls ORDER BY HallName ASC"
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ========
   STARTUP
   ======== */
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log("\n=== DB UTIL ===");
  console.log("  GET    /api/test-db                  - test database connection");
  console.log("  POST   /api/setup                    - ensure minimal users table");
  console.log("  POST   /api/setup-test               - apply full schema.sql");

  console.log("\n=== AUTH ===");
  console.log("  POST   /api/signup                   - create user (hashed password)");
  console.log("  POST   /api/login                    - login user (bcrypt compare)");
  console.log("  GET    /api/users                    - list users (demo convenience)");
  console.log("  DELETE /api/users/:id                - delete user (demo convenience)");

  console.log("\n=== FOODS ===");
  console.log("  GET    /api/foods?hallId=&limit=     - list foods (JOIN halls)");
  console.log("  POST   /api/foods                    - add a food");
  console.log("  DELETE /api/foods/:foodId            - delete a food");
  console.log("  GET    /api/halls                    - list halls (for dropdowns)");
});
