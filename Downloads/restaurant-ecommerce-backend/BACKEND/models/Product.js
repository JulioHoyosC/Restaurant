const db = require("../config/database")

class Product {
  static async create(productData) {
    const {
      name,
      description,
      price,
      categoryId,
      imageUrl,
      ingredients,
      allergens,
      preparationTime,
      calories,
      stockQuantity,
    } = productData

    const query = `
      INSERT INTO products (
        name, description, price, category_id, image_url, ingredients,
        allergens, is_vegetarian, is_vegan, is_gluten_free, 
        preparation_time, calories, stock_quantity
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `

    const result = await db.query(query, [
      name,
      description,
      price,
      categoryId,
      imageUrl,
      ingredients,
      allergens,
      preparationTime,
      calories,
      stockQuantity,
    ])

    return result.rows[0]
  }

  static async findById(id) {
    const query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1 AND p.is_available = true
    `

    const result = await db.query(query, [id])
    return result.rows[0]
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_available = true
    `

    const params = []
    let paramCount = 0

    if (filters.categoryId) {
      paramCount++
      query += ` AND p.category_id = $${paramCount}`
      params.push(filters.categoryId)
    }

    if (filters.isVegetarian) {
      paramCount++
      query += ` AND p.is_vegetarian = $${paramCount}`
      params.push(filters.isVegetarian)
    }

    if (filters.isVegan) {
      paramCount++
      query += ` AND p.is_vegan = $${paramCount}`
      params.push(filters.isVegan)
    }

    if (filters.search) {
      paramCount++
      query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`
      params.push(`%${filters.search}%`)
    }

    query += ` ORDER BY p.created_at DESC`

    if (filters.limit) {
      paramCount++
      query += ` LIMIT $${paramCount}`
      params.push(filters.limit)
    }

    if (filters.offset) {
      paramCount++
      query += ` OFFSET $${paramCount}`
      params.push(filters.offset)
    }

    const result = await db.query(query, params)
    return result.rows
  }

  static async update(id, productData) {
    const {
      name,
      description,
      price,
      categoryId,
      imageUrl,
      ingredients,
      allergens,
      isVegetarian,
      isVegan,
      isGlutenFree,
      preparationTime,
      calories,
      stockQuantity,
      isAvailable,
    } = productData

    const query = `
      UPDATE products SET
        name = $1, description = $2, price = $3, category_id = $4,
        image_url = $5, ingredients = $6, allergens = $7,
        is_vegetarian = $8, is_vegan = $9, is_gluten_free = $10,
        preparation_time = $11, calories = $12, stock_quantity = $13,
        is_available = $14, updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
    `

    const result = await db.query(query, [
      name,
      description,
      price,
      categoryId,
      imageUrl,
      ingredients,
      allergens,
      isVegetarian,
      isVegan,
      isGlutenFree,
      preparationTime,
      calories,
      stockQuantity,
      isAvailable,
      id,
    ])

    return result.rows[0]
  }

  static async delete(id) {
    const query = `
      UPDATE products 
      SET is_available = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `

    await db.query(query, [id])
  }

  static async updateStock(id, quantity) {
    const query = `
      UPDATE products 
      SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING stock_quantity
    `

    const result = await db.query(query, [quantity, id])
    return result.rows[0]
  }
}

module.exports = Product
