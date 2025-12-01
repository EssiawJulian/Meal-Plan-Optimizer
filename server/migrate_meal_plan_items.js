const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: 'localhost',
    port: 3307,
    user: 'user',
    password: 'password',
    database: 'db'
};

(async () => {
    try {
        const connection = await mysql.createConnection(config);
        console.log('Adding MealType column to MealPlanItems...');

        // Check if column exists first to avoid error
        const [columns] = await connection.execute(
            "SHOW COLUMNS FROM MealPlanItems LIKE 'MealType'"
        );

        if (columns.length === 0) {
            await connection.execute(
                "ALTER TABLE MealPlanItems ADD COLUMN MealType VARCHAR(50) NOT NULL DEFAULT 'Unspecified'"
            );
            console.log('Column added successfully.');
        } else {
            console.log('Column already exists.');
        }

        await connection.end();
    } catch (err) {
        console.error('Error updating schema:', err);
    }
})();
