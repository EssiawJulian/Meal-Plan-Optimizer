const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const config = {
    host: "localhost",
    port: 3307,
    user: "user",
    password: "password",
    database: "db",
    multipleStatements: true,
};

async function applySchema() {
    try {
        const schemaPath = path.join(__dirname, "../schema.sql");
        const schemaSql = fs.readFileSync(schemaPath, "utf8");

        console.log("Connecting to database...");
        const connection = await mysql.createConnection(config);

        console.log("Applying schema...");
        await connection.query(schemaSql);

        console.log("Schema applied successfully!");
        await connection.end();
    } catch (error) {
        console.error("Error applying schema:", error);
    }
}

applySchema();
