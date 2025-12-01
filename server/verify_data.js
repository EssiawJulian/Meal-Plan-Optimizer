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

        const [count] = await connection.execute('SELECT COUNT(*) as total FROM FoodCatalogue');
        console.log(`Total items in FoodCatalogue: ${count[0].total}`);

        const [rows] = await connection.execute('SELECT * FROM FoodCatalogue ORDER BY FoodID DESC LIMIT 5');
        console.log('Recent items:', rows);

        await connection.end();
    } catch (err) {
        console.error(err);
    }
})();
