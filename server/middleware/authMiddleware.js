const mysql = require("mysql2/promise");
const dbConfig = require("../config/database");

// Middleware to verify admin session
async function verifyAdmin(req, res, next) {
  try {
    const sessionId = req.headers.sessionid;

    if (!sessionId) {
      return res.status(401).json({ error: "No session provided" });
    }

    const connection = await mysql.createConnection(dbConfig);

    const [sessions] = await connection.execute(
      `SELECT AdminID, ExpiresAt FROM AdminSessions WHERE SessionID = ?`,
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

    // Store admin ID in request for later use
    req.adminId = session.AdminID;
    await connection.end();
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Middleware to verify nutritionist session
async function verifyNutritionist(req, res, next) {
  try {
    const sessionId = req.headers.sessionid;

    if (!sessionId) {
      return res.status(401).json({ error: "No session provided" });
    }

    const connection = await mysql.createConnection(dbConfig);

    const [sessions] = await connection.execute(
      `SELECT NutritionistID, ExpiresAt FROM NutritionistSessions WHERE SessionID = ?`,
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

    // Store nutritionist ID in request for later use
    req.nutritionistId = session.NutritionistID;
    await connection.end();
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Middleware to verify either admin or nutritionist session
async function verifyAdminOrNutritionist(req, res, next) {
  try {
    const sessionId = req.headers.sessionid;

    if (!sessionId) {
      return res.status(401).json({ error: "No session provided" });
    }

    const connection = await mysql.createConnection(dbConfig);

    // Check admin session first
    const [adminSessions] = await connection.execute(
      `SELECT AdminID, ExpiresAt FROM AdminSessions WHERE SessionID = ?`,
      [sessionId]
    );

    if (adminSessions.length > 0) {
      const session = adminSessions[0];
      if (!session.ExpiresAt || new Date(session.ExpiresAt) >= new Date()) {
        req.adminId = session.AdminID;
        req.userRole = 'admin';
        await connection.end();
        return next();
      }
    }

    // Check nutritionist session
    const [nutritionistSessions] = await connection.execute(
      `SELECT NutritionistID, ExpiresAt FROM NutritionistSessions WHERE SessionID = ?`,
      [sessionId]
    );

    if (nutritionistSessions.length > 0) {
      const session = nutritionistSessions[0];
      if (!session.ExpiresAt || new Date(session.ExpiresAt) >= new Date()) {
        req.nutritionistId = session.NutritionistID;
        req.userRole = 'nutritionist';
        await connection.end();
        return next();
      }
    }

    await connection.end();
    return res.status(401).json({ error: "Invalid or expired session" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  verifyAdmin,
  verifyNutritionist,
  verifyAdminOrNutritionist
};
