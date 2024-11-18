import mysql from "mysql2"

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "admin",
  database: "echospace",
})

db.connect((err) => {
  if (err) {
    console.error("Database connection failed: ", err.stack)
    return
  }
  console.log("Connected to the MySQL database.")
})

export const executeTransaction = (queries) => {
  return new Promise((resolve, reject) => {
    db.beginTransaction(async (err) => {
      if (err) return reject(err)

      try {
        const results = []
        for (const query of queries) {
          const result = await new Promise((resolveQuery, rejectQuery) => {
            db.query(...query, (error, res) => {
              if (error) rejectQuery(error)
              else resolveQuery(res)
            })
          })
          results.push(result)
        }

        db.commit((commitErr) => {
          if (commitErr) {
            return db.rollback(() => reject(commitErr))
          }
          resolve(results)
        })
      } catch (error) {
        return db.rollback(() => reject(error))
      }
    })
  })
}

export default db
