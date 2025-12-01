// import required packages (same style as demo)
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");
const {
  verifyAdmin,
  verifyNutritionist,
  verifyAdminOrNutritionist,
} = require("./middleware/authMiddleware");

// create express app
const app = express();

// middleware to parse JSON request bodies
app.use(express.json());

// allow frontend (Vite) to call this API during development
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

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

// POST /api/auth/signup - User registration only
// body: { firstName, lastName, email, password }
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body || {};

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: "firstName, lastName, email, and password are required",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Basic password validation (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
      });
    }

    const connection = await mysql.createConnection(config);

    // Check if email already exists
    const [existingUsers] = await connection.execute(
      "SELECT Email FROM Users WHERE Email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.end();
      return res.status(409).json({ error: "Email already registered" });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const [result] = await connection.execute(
      `INSERT INTO Users (FirstName, LastName, Email, PasswordHash)
       VALUES (?, ?, ?, ?)`,
      [firstName, lastName, email, passwordHash]
    );

    // Get the created user
    const [users] = await connection.execute(
      `SELECT UserID, FirstName, LastName, Email FROM Users WHERE UserID = ?`,
      [result.insertId]
    );

    await connection.end();

    const user = users[0];
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.UserID,
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// POST /api/auth/change-password
// Change password for any user type
// body: { sessionId, role, currentPassword, newPassword, newPasswordConfirm }
app.post("/api/auth/change-password", async (req, res) => {
  try {
    const {
      sessionId,
      role,
      currentPassword,
      newPassword,
      newPasswordConfirm,
    } = req.body;

    // Validate input
    if (
      !sessionId ||
      !role ||
      !currentPassword ||
      !newPassword ||
      !newPasswordConfirm
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword !== newPasswordConfirm) {
      return res.status(400).json({ error: "New passwords do not match" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters long" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: "New password must be different from current password",
      });
    }

    const connection = await mysql.createConnection(config);
    let sessionTable, userTable, idField;

    // Determine tables based on role
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

    // Verify session exists and is not expired
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

    // Get user with password hash
    const [users] = await connection.execute(
      `SELECT ${idField}, PasswordHash FROM ${userTable} WHERE ${idField} = ?`,
      [session[idField]]
    );

    if (users.length === 0) {
      await connection.end();
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];

    // Verify current password
    // Note: The sample data in schema.sql uses plain text passwords
    // For real passwords, we use bcrypt.compare()
    // We handle both cases for backwards compatibility
    const isValidPassword =
      user.PasswordHash === currentPassword ||
      (await bcrypt.compare(currentPassword, user.PasswordHash));
    if (!isValidPassword) {
      await connection.end();
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await connection.execute(
      `UPDATE ${userTable} SET PasswordHash = ? WHERE ${idField} = ?`,
      [newPasswordHash, user[idField]]
    );

    await connection.end();
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ===================================
   ADMIN & NUTRITIONIST MANAGEMENT
   Create admin/nutritionist accounts
   Only accessible by admin
   =================================== */

// POST /api/admin/create-admin
// Create a new admin account (requires admin auth)
// body: { firstName, lastName, email, password }
app.post("/api/admin/create-admin", verifyAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body || {};

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: "firstName, lastName, email, and password are required",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Basic password validation (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
      });
    }

    const connection = await mysql.createConnection(config);

    // Check if email already exists in Admin table
    const [existingAdmins] = await connection.execute(
      "SELECT Email FROM Admin WHERE Email = ?",
      [email]
    );

    if (existingAdmins.length > 0) {
      await connection.end();
      return res
        .status(409)
        .json({ error: "Email already registered as admin" });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new admin
    const [result] = await connection.execute(
      `INSERT INTO Admin (FirstName, LastName, Email, PasswordHash)
       VALUES (?, ?, ?, ?)`,
      [firstName, lastName, email, passwordHash]
    );

    // Get the created admin
    const [admins] = await connection.execute(
      `SELECT AdminID, FirstName, LastName, Email FROM Admin WHERE AdminID = ?`,
      [result.insertId]
    );

    await connection.end();

    const admin = admins[0];
    res.status(201).json({
      message: "Admin created successfully",
      admin: {
        id: admin.AdminID,
        firstName: admin.FirstName,
        lastName: admin.LastName,
        email: admin.Email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/create-nutritionist
// Create a new nutritionist account (requires admin auth)
// body: { firstName, lastName, email, password }
app.post("/api/admin/create-nutritionist", verifyAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body || {};

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: "firstName, lastName, email, and password are required",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Basic password validation (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
      });
    }

    const connection = await mysql.createConnection(config);

    // Check if email already exists in Nutritionist table
    const [existingNutritionists] = await connection.execute(
      "SELECT Email FROM Nutritionist WHERE Email = ?",
      [email]
    );

    if (existingNutritionists.length > 0) {
      await connection.end();
      return res
        .status(409)
        .json({ error: "Email already registered as nutritionist" });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new nutritionist
    const [result] = await connection.execute(
      `INSERT INTO Nutritionist (FirstName, LastName, Email, PasswordHash)
       VALUES (?, ?, ?, ?)`,
      [firstName, lastName, email, passwordHash]
    );

    // Get the created nutritionist
    const [nutritionists] = await connection.execute(
      `SELECT NutritionistID, FirstName, LastName, Email FROM Nutritionist WHERE NutritionistID = ?`,
      [result.insertId]
    );

    await connection.end();

    const nutritionist = nutritionists[0];
    res.status(201).json({
      message: "Nutritionist created successfully",
      nutritionist: {
        id: nutritionist.NutritionistID,
        firstName: nutritionist.FirstName,
        lastName: nutritionist.LastName,
        email: nutritionist.Email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/list-admins
// List all admins (requires admin auth)
app.get("/api/admin/list-admins", verifyAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(config);

    const [admins] = await connection.execute(
      `SELECT AdminID, FirstName, LastName, Email FROM Admin ORDER BY FirstName, LastName`
    );

    await connection.end();
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/list-nutritionists
// List all nutritionists (requires admin auth)
app.get("/api/admin/list-nutritionists", verifyAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(config);

    const [nutritionists] = await connection.execute(
      `SELECT NutritionistID, FirstName, LastName, Email FROM Nutritionist ORDER BY FirstName, LastName`
    );

    await connection.end();
    res.json(nutritionists);
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

/* ==========================
   QUESTIONS & ANSWERS
   Tables:
   - Questions(QuestionID, UserID, UserMessage, MessageReply, MessageStatus)
   ========================== */

// POST /api/questions
// body: { userId, userMessage }
app.post("/api/questions", async (req, res) => {
  try {
    const { userId, userMessage } = req.body || {};
    if (!userId || !userMessage) {
      return res
        .status(400)
        .json({ error: "userId and userMessage are required" });
    }

    const connection = await mysql.createConnection(config);

    // Verify user exists
    const [users] = await connection.execute(
      "SELECT UserID FROM Users WHERE UserID = ?",
      [userId]
    );
    if (users.length === 0) {
      await connection.end();
      return res.status(400).json({ error: "Invalid userId" });
    }

    const [result] = await connection.execute(
      `INSERT INTO Questions (UserID, UserMessage, MessageStatus)
       VALUES (?, ?, FALSE)`,
      [userId, userMessage]
    );

    const [rows] = await connection.execute(
      `SELECT q.*, u.FirstName, u.LastName, u.Email
       FROM Questions q
       JOIN Users u ON q.UserID = u.UserID
       WHERE q.QuestionID = ?`,
      [result.insertId]
    );

    await connection.end();
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/questions/user/:userId
// Get all questions for a specific user with replies
app.get("/api/questions/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const connection = await mysql.createConnection(config);

    const [rows] = await connection.execute(
      `SELECT q.*, u.FirstName, u.LastName, u.Email
       FROM Questions q
       JOIN Users u ON q.UserID = u.UserID
       WHERE q.UserID = ?
       ORDER BY q.QuestionID DESC`,
      [userId]
    );

    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/questions/unanswered
// Get all unanswered questions (MessageStatus = FALSE)
app.get("/api/questions/unanswered", async (req, res) => {
  try {
    const connection = await mysql.createConnection(config);

    const [rows] = await connection.execute(
      `SELECT q.*, u.FirstName, u.LastName, u.Email
       FROM Questions q
       JOIN Users u ON q.UserID = u.UserID
       WHERE q.MessageStatus = FALSE
       ORDER BY q.QuestionID ASC`
    );

    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/questions/:questionId/reply
// body: { messageReply }
app.put("/api/questions/:questionId/reply", async (req, res) => {
  try {
    const { questionId } = req.params;
    const { messageReply } = req.body || {};

    if (!messageReply) {
      return res.status(400).json({ error: "messageReply is required" });
    }

    const connection = await mysql.createConnection(config);

    // Check if question exists
    const [questions] = await connection.execute(
      "SELECT QuestionID FROM Questions WHERE QuestionID = ?",
      [questionId]
    );

    if (questions.length === 0) {
      await connection.end();
      return res.status(404).json({ error: "Question not found" });
    }

    // Update the question with reply and set MessageStatus to TRUE
    await connection.execute(
      `UPDATE Questions
       SET MessageReply = ?, MessageStatus = TRUE
       WHERE QuestionID = ?`,
      [messageReply, questionId]
    );

    const [rows] = await connection.execute(
      `SELECT q.*, u.FirstName, u.LastName, u.Email
       FROM Questions q
       JOIN Users u ON q.UserID = u.UserID
       WHERE q.QuestionID = ?`,
      [questionId]
    );

    await connection.end();
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================
   SETTINGS & GOALS
   ========================== */

// GET /api/user/goals
app.get("/api/user/goals", async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    const connection = await mysql.createConnection(config);

    // Verify session (User only)
    const [sessions] = await connection.execute(
      "SELECT UserID FROM UserSessions WHERE SessionID = ?",
      [sessionId]
    );

    if (sessions.length === 0) {
      await connection.end();
      return res.status(401).json({ error: "Invalid session" });
    }

    const userId = sessions[0].UserID;

    const [rows] = await connection.execute(
      "SELECT Calories, Fat, Protein, Carbs FROM UserGoals WHERE UserID = ?",
      [userId]
    );

    await connection.end();
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/user/goals
app.put("/api/user/goals", async (req, res) => {
  try {
    const { sessionId, goals } = req.body || {};
    if (!sessionId || !goals) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const connection = await mysql.createConnection(config);

    // Verify session (User only)
    const [sessions] = await connection.execute(
      "SELECT UserID FROM UserSessions WHERE SessionID = ?",
      [sessionId]
    );

    if (sessions.length === 0) {
      await connection.end();
      return res.status(401).json({ error: "Invalid session" });
    }

    const userId = sessions[0].UserID;
    const { Calories, Fat, Protein, Carbs } = goals;

    // Check if goals exist
    const [existing] = await connection.execute(
      "SELECT UserID FROM UserGoals WHERE UserID = ?",
      [userId]
    );

    if (existing.length > 0) {
      await connection.execute(
        "UPDATE UserGoals SET Calories = ?, Fat = ?, Protein = ?, Carbs = ? WHERE UserID = ?",
        [Calories, Fat, Protein, Carbs, userId]
      );
    } else {
      await connection.execute(
        "INSERT INTO UserGoals (UserID, Calories, Fat, Protein, Carbs) VALUES (?, ?, ?, ?, ?)",
        [userId, Calories, Fat, Protein, Carbs]
      );
    }

    await connection.end();
    res.json({ message: "Goals updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================
   MEAL PLANS (AI-Generated)
   ========================== */

// Initialize Gemini AI (API key read from GEMINI_API_KEY environment variable)
const genAI = new GoogleGenAI({});

// POST /api/meal-plans/generate
// body: { sessionId, hallIds }
app.post("/api/meal-plans/generate", async (req, res) => {
  try {
    const { sessionId, hallIds } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const connection = await mysql.createConnection(config);

    // Verify session
    const [sessions] = await connection.execute(
      "SELECT UserID FROM UserSessions WHERE SessionID = ?",
      [sessionId]
    );

    if (sessions.length === 0) {
      await connection.end();
      return res.status(401).json({ error: "Invalid session" });
    }

    const userId = sessions[0].UserID;

    // Get user goals
    const [goals] = await connection.execute(
      "SELECT Calories, Fat, Protein, Carbs FROM UserGoals WHERE UserID = ?",
      [userId]
    );

    if (goals.length === 0) {
      await connection.end();
      return res.status(400).json({
        error: "Please set your nutrition goals in Settings first",
      });
    }

    const userGoals = goals[0];

    // Get available foods (filter by hallIds if provided)
    let foodsQuery = `
      SELECT fc.FoodID, fc.FoodName, fc.Calories, fc.Fat, fc.Protein, fc.Carbs,
             fc.ServingSize, dh.HallName
      FROM FoodCatalogue fc
      LEFT JOIN DinningHalls dh ON fc.HallID = dh.HallID
    `;
    const queryParams = [];

    if (hallIds && Array.isArray(hallIds) && hallIds.length > 0) {
      // Create placeholders for IN clause
      const placeholders = hallIds.map(() => '?').join(',');
      foodsQuery += ` WHERE fc.HallID IN (${placeholders})`;
      queryParams.push(...hallIds);
    }

    foodsQuery += ` ORDER BY fc.FoodID`;

    const [foods] = await connection.execute(foodsQuery, queryParams);

    if (foods.length === 0) {
      await connection.end();
      return res.status(400).json({ error: "No foods available in the selected dining halls" });
    }

    // Format foods for Gemini prompt
    const foodsList = foods
      .map(
        (f) =>
          `ID:${f.FoodID} "${f.FoodName}" (${f.Calories}cal, ${f.Protein}g P, ${f.Carbs}g C, ${f.Fat}g F) [${f.HallName}]`
      )
      .join("\n");

    // Create prompt for Gemini
    const prompt = `You are a nutritionist AI. Generate a FULL DAY meal plan (Breakfast, Lunch, Dinner, Snack) for a student.

User's Daily Goals:
- Calories: ${userGoals.Calories}
- Protein: ${userGoals.Protein}g
- Carbs: ${userGoals.Carbs}g
- Fat: ${userGoals.Fat}g

Available Foods:
${foodsList}

Instructions:
1. Create a plan with 4 sections: Breakfast, Lunch, Dinner, Snack.
2. Select foods ONLY from the provided list.
3. Try to meet the daily goals as closely as possible (+/- 10%).
4. You can select multiple items per meal.
5. Return ONLY valid JSON.

JSON Format:
{
  "sections": {
    "Breakfast": [foodID, foodID],
    "Lunch": [foodID],
    "Dinner": [foodID],
    "Snack": [foodID]
  },
  "totals": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0
  },
  "reasoning": "Brief explanation"
}`;

    // Call Gemini API
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const responseText = result.text;

    // Parse JSON response
    let mealPlan;
    try {
      const cleanJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      mealPlan = JSON.parse(cleanJson);
    } catch (parseError) {
      await connection.end();
      return res.status(500).json({
        error: "Failed to parse AI response",
        details: responseText,
      });
    }

    // Validate IDs
    const validFoodIds = foods.map((f) => f.FoodID);
    const allSelectedIds = [
      ...(mealPlan.sections.Breakfast || []),
      ...(mealPlan.sections.Lunch || []),
      ...(mealPlan.sections.Dinner || []),
      ...(mealPlan.sections.Snack || [])
    ];

    const invalidIds = allSelectedIds.filter(id => !validFoodIds.includes(id));

    if (invalidIds.length > 0) {
      await connection.end();
      return res.status(400).json({
        error: "AI returned invalid food IDs",
        invalidIds,
      });
    }

    // 1. Create the Meal Plan Header
    const [planResult] = await connection.execute(
      "INSERT INTO MealPlans (UserID, MealType) VALUES (?, ?)",
      [userId, 'Full Day']
    );
    const newPlanId = planResult.insertId;

    // 2. Insert Meal Plan Items with Types
    const insertItem = async (ids, type) => {
      if (!ids || ids.length === 0) return;
      for (const foodId of ids) {
        await connection.execute(
          "INSERT INTO MealPlanItems (PlanID, FoodID, MealType) VALUES (?, ?, ?)",
          [newPlanId, foodId, type]
        );
      }
    };

    await insertItem(mealPlan.sections.Breakfast, 'Breakfast');
    await insertItem(mealPlan.sections.Lunch, 'Lunch');
    await insertItem(mealPlan.sections.Dinner, 'Dinner');
    await insertItem(mealPlan.sections.Snack, 'Snack');

    // Fetch the created meal with food details
    const [createdMeal] = await connection.execute(
      `
      SELECT mp.PlanID as MealID, mp.MealType as PlanType, mpi.MealType as SectionType,
             fc.FoodID, fc.FoodName, fc.Calories, fc.Fat, fc.Protein, fc.Carbs, fc.ServingSize,
             dh.HallName
      FROM MealPlans mp
      JOIN MealPlanItems mpi ON mp.PlanID = mpi.PlanID
      JOIN FoodCatalogue fc ON mpi.FoodID = fc.FoodID
      LEFT JOIN DinningHalls dh ON fc.HallID = dh.HallID
      WHERE mp.PlanID = ?
    `,
      [newPlanId]
    );

    await connection.end();

    res.status(201).json({
      mealId: newPlanId,
      mealType: 'Full Day',
      foods: createdMeal,
      totals: mealPlan.totals,
      reasoning: mealPlan.reasoning,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/meal-plans
// Get all meal plans for the user
app.get("/api/meal-plans", async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    const connection = await mysql.createConnection(config);

    // Verify session
    const [sessions] = await connection.execute(
      "SELECT UserID FROM UserSessions WHERE SessionID = ?",
      [sessionId]
    );

    if (sessions.length === 0) {
      await connection.end();
      return res.status(401).json({ error: "Invalid session" });
    }

    const userId = sessions[0].UserID;

    // Fetch meal plans with their items
    const [rows] = await connection.execute(
      `
      SELECT mp.PlanID as MealID, mp.MealType as PlanType, mpi.MealType as SectionType, mp.CreatedAt,
             fc.FoodID, fc.FoodName, fc.Calories, fc.Fat, fc.Protein, fc.Carbs, fc.ServingSize,
             dh.HallName
      FROM MealPlans mp
      JOIN MealPlanItems mpi ON mp.PlanID = mpi.PlanID
      JOIN FoodCatalogue fc ON mpi.FoodID = fc.FoodID
      LEFT JOIN DinningHalls dh ON fc.HallID = dh.HallID
      WHERE mp.UserID = ?
      ORDER BY mp.CreatedAt DESC
    `,
      [userId]
    );

    await connection.end();

    // Group by MealID (PlanID)
    const mealPlans = {};
    rows.forEach((row) => {
      if (!mealPlans[row.MealID]) {
        mealPlans[row.MealID] = {
          mealId: row.MealID,
          mealType: row.PlanType,
          date: row.CreatedAt,
          foods: [],
          totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        };
      }
      mealPlans[row.MealID].foods.push({
        foodId: row.FoodID,
        foodName: row.FoodName,
        calories: row.Calories,
        protein: row.Protein,
        carbs: row.Carbs,
        fat: row.Fat,
        servingSize: row.ServingSize,
        hallName: row.HallName,
        sectionType: row.SectionType || 'Unspecified'
      });
      mealPlans[row.MealID].totals.calories += row.Calories;
      mealPlans[row.MealID].totals.protein += row.Protein;
      mealPlans[row.MealID].totals.carbs += row.Carbs;
      mealPlans[row.MealID].totals.fat += row.Fat;
    });

    res.json(Object.values(mealPlans));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/meal-plans/:mealId
// Delete a meal plan
app.delete("/api/meal-plans/:mealId", async (req, res) => {
  try {
    const { mealId } = req.params;
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const connection = await mysql.createConnection(config);

    // Verify session
    const [sessions] = await connection.execute(
      "SELECT UserID FROM UserSessions WHERE SessionID = ?",
      [sessionId]
    );

    if (sessions.length === 0) {
      await connection.end();
      return res.status(401).json({ error: "Invalid session" });
    }

    const userId = sessions[0].UserID;

    // Delete the meal plan (Cascade will delete items)
    const [result] = await connection.execute(
      "DELETE FROM MealPlans WHERE PlanID = ? AND UserID = ?",
      [mealId, userId]
    );

    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Meal plan not found" });
    }

    res.json({ message: "Meal plan deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================
   MEALS / LOGGING (Manual)
   ========================== */

// POST /api/meals
app.post("/api/meals", async (req, res) => {
  try {
    const { sessionId, foodId, mealType } = req.body || {};
    if (!sessionId || !foodId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const connection = await mysql.createConnection(config);

    // Verify session
    const [sessions] = await connection.execute(
      "SELECT UserID FROM UserSessions WHERE SessionID = ?",
      [sessionId]
    );

    if (sessions.length === 0) {
      await connection.end();
      return res.status(401).json({ error: "Invalid session" });
    }

    const userId = sessions[0].UserID;
    const type = mealType || "Snack"; // Default to Snack if not provided

    // Insert into FoodLogs
    await connection.execute(
      "INSERT INTO FoodLogs (FoodID, UserID, MealType, LogDate) VALUES (?, ?, ?, CURRENT_DATE)",
      [foodId, userId, type]
    );

    await connection.end();

    res.status(201).json({ message: "Meal logged successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/meals (Daily Log)
app.get("/api/meals", async (req, res) => {
  try {
    const { sessionId, date } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    const connection = await mysql.createConnection(config);

    // Verify session
    const [sessions] = await connection.execute(
      "SELECT UserID FROM UserSessions WHERE SessionID = ?",
      [sessionId]
    );

    if (sessions.length === 0) {
      await connection.end();
      return res.status(401).json({ error: "Invalid session" });
    }

    const userId = sessions[0].UserID;
    const queryDate = date || new Date().toISOString().split("T")[0]; // Default to today

    // Fetch logs for the date
    // Alias LogID as MealID for frontend compatibility
    const [rows] = await connection.execute(
      `
      SELECT fl.LogID as MealID, fl.MealType, fl.LogDate,
             fc.FoodID, fc.FoodName, fc.Calories, fc.Fat, fc.Protein, fc.Carbs, fc.ServingSize,
             dh.HallName
      FROM FoodLogs fl
      JOIN FoodCatalogue fc ON fl.FoodID = fc.FoodID
      LEFT JOIN DinningHalls dh ON fc.HallID = dh.HallID
      WHERE fl.UserID = ? AND fl.LogDate = ?
      ORDER BY fl.LogID DESC
    `,
      [userId, queryDate]
    );

    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/meals/:mealId (Update Log Entry)
app.put("/api/meals/:mealId", async (req, res) => {
  try {
    const { mealId } = req.params; // This is LogID
    const { mealType } = req.body;

    if (!mealType) {
      return res.status(400).json({ error: "MealType is required" });
    }

    const connection = await mysql.createConnection(config);
    await connection.execute(
      "UPDATE FoodLogs SET MealType = ? WHERE LogID = ?",
      [mealType, mealId]
    );
    await connection.end();
    res.json({ message: "Meal updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/meals/:mealId (Delete Log Entry)
app.delete("/api/meals/:mealId", async (req, res) => {
  try {
    const { mealId } = req.params; // This is LogID
    const connection = await mysql.createConnection(config);
    await connection.execute("DELETE FROM FoodLogs WHERE LogID = ?", [mealId]);
    await connection.end();
    res.status(204).end();
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
  console.log("  POST   /api/auth/signup              - user signup");
  console.log("  POST   /api/auth/login               - login");
  console.log("  POST   /api/auth/logout              - logout");
  console.log("  GET    /api/auth/me                  - get current user");
  console.log("  POST   /api/auth/change-password     - change password");

  console.log("\n=== USER GOALS ===");
  console.log("  GET    /api/user/goals               - get user goals");
  console.log("  PUT    /api/user/goals               - update user goals");

  console.log("\n=== FOODS ===");
  console.log("  GET    /api/foods?hallId=&limit=     - list foods");
  console.log("  POST   /api/foods                    - add a food");
  console.log("  DELETE /api/foods/:foodId            - delete a food");
  console.log("  GET    /api/halls                    - list halls");

  console.log("\n=== MEALS / LOGGING ===");
  console.log("  POST   /api/meals                    - log a meal");
  console.log("  GET    /api/meals/today              - get today's meals");
  console.log("  DELETE /api/meals/:mealId            - delete a meal");

  console.log("\n=== QUESTIONS ===");
  console.log("  POST   /api/questions               - create a question");
  console.log("  GET    /api/questions/user/:userId  - get user questions");
  console.log(
    "  GET    /api/questions/unanswered    - get unanswered questions"
  );
  console.log("  PUT    /api/questions/:questionId/reply - reply to question");

  console.log("\n=== MEAL PLANS (AI) ===");
  console.log("  POST   /api/meal-plans/generate     - generate AI meal plan");
  console.log("  GET    /api/meal-plans              - get user meal plans");
  console.log("  DELETE /api/meal-plans/:mealId      - delete meal plan");
});
