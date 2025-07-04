const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "b9samry19yq5e4x35vfy-mysql.services.clever-cloud.com",
  user: "ukqfgworavi3hxdt",
  password: "t6FDMvdbFqO7WPA2q6SC",
  database: "b9samry19yq5e4x35vfy",
  port: 3306,
  connectionLimit: 10,
});

// Probar conexión al iniciar
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error al conectar con el pool de MySQL:", err);
    process.exit(1);
  }
  console.log("Conectado a MySQL (con pool)");
  connection.release();
});

module.exports = pool;
