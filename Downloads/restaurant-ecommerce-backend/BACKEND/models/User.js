 const db = require("../config/database")
const bcrypt = require("bcryptjs")

class User {
  static async create(userData) {
    const { email, password, firstName, lastName, phone, role = "cliente" } = userData

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    const query = `
      INSERT INTO users (email, password, first_name, last_name, phone, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, phone, role, is_active, created_at
    `

    const result = await db.query(query, [email, hashedPassword, firstName, lastName, phone, role])
    return result.rows[0]
  }

  static async findByEmail(email) {
    const query = "SELECT * FROM users WHERE email = $1 AND is_active = true"
    const result = await db.query(query, [email])
    return result.rows[0]
  }

  static async findById(id) {
    const query = `
      SELECT id, email, first_name, last_name, phone, role, is_active, created_at, updated_at
      FROM users WHERE id = $1 AND is_active = true
    `
    const result = await db.query(query, [id])
    return result.rows[0]
  }

  static async update(id, userData) {
    const { firstName, lastName, phone } = userData
    const query = `
      UPDATE users 
      SET first_name = $1, last_name = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND is_active = true
      RETURNING id, email, first_name, last_name, phone, role, updated_at
    `

    const result = await db.query(query, [firstName, lastName, phone, id])
    return result.rows[0]
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    const query = `
      UPDATE users 
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
    `

    await db.query(query, [hashedPassword, id])
  }

  static async delete(id) {
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `

    await db.query(query, [id])
  }

  static async getAll(limit = 50, offset = 0) {
    const query = `
      SELECT id, email, first_name, last_name, phone, role, is_active, created_at
      FROM users 
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `

    const result = await db.query(query, [limit, offset])
    return result.rows
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword)
  }
}

module.exports = User
