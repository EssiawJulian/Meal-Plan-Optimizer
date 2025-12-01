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
        const [rows] = await connection.execute('SELECT * FROM DinningHalls');
        console.log(rows);
        const fs = require('fs');
        fs.writeFileSync('halls.json', JSON.stringify(rows, null, 2));
        await connection.end();
    } catch (err) {
        console.error(err);
    }
})();
