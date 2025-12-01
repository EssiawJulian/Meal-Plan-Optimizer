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
        const [rows] = await connection.execute('SELECT * FROM FoodCatalogue WHERE HallID IN (1, 2, 3)');
        console.log('Items in old halls:', rows);
        await connection.end();
    } catch (err) {
        console.error(err);
    }
})();
