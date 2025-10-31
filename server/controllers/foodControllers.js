const mysql = require("mysql2/promise");
const dbConfig = require("../config/database");

// GET /api/foods?hallId=1&limit=200
exports.listFoods = async (req, res) => {
  try {
    const { hallId, limit = 200 } = req.query;
    const connection = await mysql.createConnection(dbConfig);

    let sql = `
      SELECT fc.FoodID, fc.HallID, dh.HallName, fc.FoodName,
             fc.Calories, fc.Fat, fc.Protein, fc.Carbs, fc.ServingSize
      FROM FoodCatalogue fc
      LEFT JOIN DinningHalls dh ON dh.HallID = fc.HallID`;
    const params = [];

    if (hallId) { sql += ` WHERE fc.HallID = ?`; params.push(hallId); }
    sql += ` ORDER BY fc.FoodID DESC LIMIT ?`;
    params.push(Number(limit));

    const [rows] = await connection.execute(sql, params);
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/foods
// body: { HallID?, FoodName*, Calories?, Fat?, Protein?, Carbs?, ServingSize* }
exports.createFood = async (req, res) => {
  try {
    const { HallID, FoodName, Calories, Fat, Protein, Carbs, ServingSize } = req.body;
    if (!FoodName || !ServingSize) {
      return res.status(400).json({ error: "FoodName and ServingSize are required" });
    }

    const connection = await mysql.createConnection(dbConfig);

    // optional FK guard if HallID is present
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
};

// DELETE /api/foods/:foodId
exports.deleteFood = async (req, res) => {
  try {
    const { foodId } = req.params;
    const connection = await mysql.createConnection(dbConfig);

    const [r] = await connection.execute(
      "DELETE FROM FoodCatalogue WHERE FoodID = ?",
      [foodId]
    );

    await connection.end();

    if (r.affectedRows === 0) {
      return res.status(404).json({ error: "Food not found" });
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// (optional) GET /api/halls  → use for a UI dropdown
exports.listHalls = async (_req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT HallID, HallName FROM DinningHalls ORDER BY HallName ASC"
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
