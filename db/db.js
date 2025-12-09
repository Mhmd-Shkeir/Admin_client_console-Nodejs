const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'myPassword342',  
    database: 'CarWashDB' 
});

// Establish the connection
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
        return;
    }
    console.log('Connected to the database');
});

// Export the connection object for use in other files
module.exports = connection;