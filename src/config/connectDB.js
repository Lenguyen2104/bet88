const mysql = require("mysql2/promise");

const connection = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "wingo68",
});
// const connection = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "wingo6868",
// });

export default connection;
