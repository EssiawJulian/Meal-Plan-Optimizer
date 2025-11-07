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
    res
      .status(500)
      .json({ error: "Database connection failed", details: error.message });
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
   AUTH - Multi-role authentication
   Supports: user, admin, nutritionist
   ========== */

// Helper to generate session ID
const crypto = require("crypto");
function generateSessionId() {
  return crypto.randomBytes(32).toString("hex");
}

// POST /api/auth/login  { email, password, role }
// role must be: "user", "admin", or "nutritionist"
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ error: "email, password, and role are required" });
    }

    const connection = await mysql.createConnection(config);
    let user, tableName, idField, sessionTable;

    // Determine which table to query based on role
    if (role === "user") {
      tableName = "Users";
      idField = "UserID";
      sessionTable = "UserSessions";
    } else if (role === "admin") {
      tableName = "Admin";
      idField = "AdminID";
      sessionTable = "AdminSessions";
    } else if (role === "nutritionist") {
      tableName = "Nutritionist";
      idField = "NutritionistID";
      sessionTable = "NutritionistSessions";
    } else {
      await connection.end();
      return res.status(400).json({ error: "Invalid role" });
    }

    // Query the appropriate table
    const [rows] = await connection.execute(
      `SELECT ${idField}, FirstName, LastName, Email, PasswordHash FROM ${tableName} WHERE Email = ?`,
      [email]
    );

    if (rows.length === 0) {
      await connection.end();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    user = rows[0];

    // Note: The sample data in schema.sql uses 'notrealpassword' as plain text
    // For real passwords, we'd use bcrypt.compare()
    // For now, we'll handle both cases:
    const isValidPassword =
      user.PasswordHash === password ||
      (await bcrypt.compare(password, user.PasswordHash));

    if (!isValidPassword) {
      await connection.end();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create session
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await connection.execute(
      `INSERT INTO ${sessionTable} (SessionID, ${idField}, ExpiresAt) VALUES (?, ?, ?)`,
      [sessionId, user[idField], expiresAt]
    );

    await connection.end();

    res.json({
      sessionId,
      role,
      user: {
        id: user[idField],
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/logout  { sessionId, role }
app.post("/api/auth/logout", async (req, res) => {
  try {
    const { sessionId, role } = req.body || {};
    if (!sessionId || !role) {
      return res.status(400).json({ error: "sessionId and role are required" });
    }

    const connection = await mysql.createConnection(config);
    let sessionTable;

    if (role === "user") sessionTable = "UserSessions";
    else if (role === "admin") sessionTable = "AdminSessions";
    else if (role === "nutritionist") sessionTable = "NutritionistSessions";
    else {
      await connection.end();
      return res.status(400).json({ error: "Invalid role" });
    }

    await connection.execute(
      `DELETE FROM ${sessionTable} WHERE SessionID = ?`,
      [sessionId]
    );

    await connection.end();
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me?sessionId=xxx&role=xxx
// Verify session and return user info
app.get("/api/auth/me", async (req, res) => {
  try {
    const { sessionId, role } = req.query;
    if (!sessionId || !role) {
      return res.status(400).json({ error: "sessionId and role are required" });
    }

    const connection = await mysql.createConnection(config);
    let sessionTable, userTable, idField;

    if (role === "user") {
      sessionTable = "UserSessions";
      userTable = "Users";
      idField = "UserID";
    } else if (role === "admin") {
      sessionTable = "AdminSessions";
      userTable = "Admin";
      idField = "AdminID";
    } else if (role === "nutritionist") {
      sessionTable = "NutritionistSessions";
      userTable = "Nutritionist";
      idField = "NutritionistID";
    } else {
      await connection.end();
      return res.status(400).json({ error: "Invalid role" });
    }

    // Check if session exists and is not expired
    const [sessions] = await connection.execute(
      `SELECT ${idField}, ExpiresAt FROM ${sessionTable} WHERE SessionID = ?`,
      [sessionId]
    );

    if (sessions.length === 0) {
      await connection.end();
      return res.status(401).json({ error: "Invalid session" });
    }

    const session = sessions[0];
    if (session.ExpiresAt && new Date(session.ExpiresAt) < new Date()) {
      await connection.end();
      return res.status(401).json({ error: "Session expired" });
    }

    // Get user info
    const [users] = await connection.execute(
      `SELECT ${idField}, FirstName, LastName, Email FROM ${userTable} WHERE ${idField} = ?`,
      [session[idField]]
    );

    await connection.end();

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    res.json({
      role,
      user: {
        id: user[idField],
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
      },
    });
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
    const { HallID, FoodName, Calories, Fat, Protein, Carbs, ServingSize } =
      req.body || {};
    if (!FoodName || !ServingSize) {
      return res
        .status(400)
        .json({ error: "FoodName and ServingSize are required" });
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
    const [r] = await connection.execute(
      "DELETE FROM FoodCatalogue WHERE FoodID = ?",
      [foodId]
    );
    await connection.end();

    if (r.affectedRows === 0)
      return res.status(404).json({ error: "Food not found" });
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
  console.log(
    "  GET    /api/test-db                  - test database connection"
  );
  console.log(
    "  POST   /api/setup                    - ensure minimal users table"
  );
  console.log("  POST   /api/setup-test               - apply full schema.sql");

  console.log("\n=== AUTH (Multi-role) ===");
  console.log(
    "  POST   /api/auth/login               - login (email, password, role)"
  );
  console.log(
    "  POST   /api/auth/logout              - logout (sessionId, role)"
  );
  console.log(
    "  GET    /api/auth/me                  - get current user (sessionId, role)"
  );

  console.log("\n=== FOODS ===");
  console.log(
    "  GET    /api/foods?hallId=&limit=     - list foods (JOIN halls)"
  );
  console.log("  POST   /api/foods                    - add a food");
  console.log("  DELETE /api/foods/:foodId            - delete a food");
  console.log(
    "  GET    /api/halls                    - list halls (for dropdowns)"
  );
});
