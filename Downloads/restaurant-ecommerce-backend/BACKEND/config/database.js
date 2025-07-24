const { Pool } = require("pg")
require("dotenv").config()

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "Restaurant",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 3000,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

// Función para ejecutar queries
const query = async (text, params) => {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log("Query ejecutado:", { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error("Error en query:", error)
    throw error
  }
}

// Función para transacciones
const transaction = async (callback) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await callback(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

// Test de conexión
pool.on("connect", () => {
  console.log("Conexión existosa")
})

pool.on("error", (err) => {
  console.error("Problemas con la conexión:", err)
})

module.exports = {
  query,
  transaction,
  pool,
}
