// import required packages (same style as demo)
const express = require("express");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const cors = require("cors");
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

  console.log("\n=== QUESTIONS ===");
  console.log("  POST   /api/questions               - create a question");
  console.log("  GET    /api/questions/user/:userId  - get user questions");
  console.log(
    "  GET    /api/questions/unanswered    - get unanswered questions"
  );
  console.log("  PUT    /api/questions/:questionId/reply - reply to question");
});
