const mysql = require('mysql2/promise');

// const connection = mysql.createPool({
//     host: '103.54.153.32',
//     user: 'wingo68',
//     password: 'wingo68',
//     database: 'wingo68',
// });
const connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'kiki79',
});

export default connection;