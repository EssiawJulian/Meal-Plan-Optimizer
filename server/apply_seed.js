const mysql = require('mysql2/promise');
const fs = require('fs');

const config = {
    host: 'localhost',
    port: 3307,
    user: 'user',
    password: 'password',
    database: 'db',
    multipleStatements: true
};

(async () => {
    try {
        const connection = await mysql.createConnection(config);
        const sql = fs.readFileSync('seed_halls.sql', 'utf8');
        await connection.query(sql);
        console.log('Dining halls seeded successfully.');
        await connection.end();
    } catch (err) {
        console.error('Error seeding halls:', err);
    }
})();
