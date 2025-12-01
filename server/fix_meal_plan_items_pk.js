const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixSchema() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3307,
        user: 'user',
        password: 'password',
        database: 'db'
    });

    try {
        console.log('Dropping MealPlanItems table...');
        await connection.execute('DROP TABLE IF EXISTS MealPlanItems');

        console.log('Recreating MealPlanItems table with new schema...');
        await connection.execute(`
            CREATE TABLE MealPlanItems (
                ItemID INT AUTO_INCREMENT PRIMARY KEY,
                PlanID INT NOT NULL,
                FoodID INT NOT NULL,
                MealType VARCHAR(50) NOT NULL DEFAULT 'Unspecified',
                FOREIGN KEY (PlanID) REFERENCES MealPlans(PlanID) ON DELETE CASCADE,
                FOREIGN KEY (FoodID) REFERENCES FoodCatalogue(FoodID)
            )
        `);

        console.log('Schema fixed successfully.');

    } catch (error) {
        console.error('Error fixing schema:', error);
    } finally {
        await connection.end();
    }
}

fixSchema();
