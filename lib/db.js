// import mysql from 'mysql2/promise';
//AIVEN MYSQL CONNECTION
// export const db = mysql.createPool({
//   host: process.env.MYSQL_HOST,
//   user: process.env.MYSQL_USER,
//   password: process.env.MYSQL_PASSWORD,
//   database: process.env.MYSQL_DATABASE,
//   port: process.env.MYSQL_PORT, // <--- This was missing!
//   ssl: {
//     rejectUnauthorized: false // <--- This allows secure connection to Aiven
//   }
// });



//OFFLINE
import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 🛑 MAKE SURE THERE IS NO 'ssl' PROPERTY HERE AT ALL
});
