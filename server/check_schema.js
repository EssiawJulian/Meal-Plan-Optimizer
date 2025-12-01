const mysql = require("mysql2/promise");
require("dotenv").config();

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

async function checkSchema() {
    try {
        const connection = await mysql.createConnection(config);
        const [rows] = await connection.execute("DESCRIBE Meals");
        console.log(JSON.stringify(rows, null, 2));
        await connection.end();
    } catch (error) {
        console.error(error);
    }
}

checkSchema();
