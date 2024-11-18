// Import the mysql module
import mysql from "mysql2"

// Create a connection to the database
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "admin",
  database: "echospace",
})

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error("Database connection failed: ", err.stack)
    return
  }
  console.log("Connected to the MySQL database.")
})

export default db
