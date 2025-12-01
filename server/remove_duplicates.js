const mysql = require('mysql2/promise');

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

        // 1. Get FoodIDs to remove
        const [foods] = await connection.execute('SELECT FoodID FROM FoodCatalogue WHERE HallID IN (1, 2, 3)');
        const foodIds = foods.map(f => f.FoodID);

        if (foodIds.length > 0) {
            const placeholders = foodIds.map(() => '?').join(',');

            console.log(`Found ${foodIds.length} food items to remove.`);

            // 2. Delete from MealPlanItems
            console.log('Deleting from MealPlanItems...');
            await connection.execute(`DELETE FROM MealPlanItems WHERE FoodID IN (${placeholders})`, foodIds);

            // 3. Delete from FoodLogs
            console.log('Deleting from FoodLogs...');
            await connection.execute(`DELETE FROM FoodLogs WHERE FoodID IN (${placeholders})`, foodIds);

            // 4. Delete from FoodCatalogue
            console.log('Deleting from FoodCatalogue...');
            await connection.execute(`DELETE FROM FoodCatalogue WHERE FoodID IN (${placeholders})`, foodIds);
        } else {
            console.log('No food items found in old halls.');
        }

        // 5. Delete from DinningHalls
        console.log('Deleting old halls (1, 2, 3)...');
        const [hallResult] = await connection.execute('DELETE FROM DinningHalls WHERE HallID IN (1, 2, 3)');
        console.log(`Deleted ${hallResult.affectedRows} halls.`);

        await connection.end();
    } catch (err) {
        console.error('Error removing duplicates:', err);
    }
})();
