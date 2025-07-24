const express = require("express")
const db = require("../config/database")
const { adminAuth } = require("../middleware/auth")
const { body, validationResult } = require("express-validator")

const router = express.Router()

// Validación para categorías
const validateCategory = [
  body("name").trim().isLength({ min: 2 }).withMessage("El nombre debe tener al menos 2 caracteres"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("La descripción no puede exceder 500 caracteres"),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
]

// Obtener todas las categorías (público)
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT * FROM categories 
      WHERE is_active = true 
      ORDER BY name
    `
    const result = await db.query(query)
    res.json({ categories: result.rows })
  } catch (error) {
    console.error("Error obteniendo categorías:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Obtener categoría por ID (público)
router.get("/:id", async (req, res) => {
  try {
    const query = "SELECT * FROM categories WHERE id = $1 AND is_active = true"
    const result = await db.query(query, [req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" })
    }

    res.json({ category: result.rows[0] })
  } catch (error) {
    console.error("Error obteniendo categoría:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Crear categoría (solo admin)
router.post("/", adminAuth, validateCategory, async (req, res) => {
  try {
    const { name, description, imageUrl } = req.body

    const query = `
      INSERT INTO categories (name, description, image_url)
      VALUES ($1, $2, $3)
      RETURNING *
    `

    const result = await db.query(query, [name, description, imageUrl])

    res.status(201).json({
      message: "Categoría creada exitosamente",
      category: result.rows[0],
    })
  } catch (error) {
    console.error("Error creando categoría:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Actualizar categoría (solo admin)
router.put("/:id", adminAuth, validateCategory, async (req, res) => {
  try {
    const { name, description, imageUrl, isActive } = req.body

    const query = `
      UPDATE categories 
      SET name = $1, description = $2, image_url = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `

    const result = await db.query(query, [name, description, imageUrl, isActive !== false, req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" })
    }

    res.json({
      message: "Categoría actualizada exitosamente",
      category: result.rows[0],
    })
  } catch (error) {
    console.error("Error actualizando categoría:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Eliminar categoría (solo admin)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const query = `
      UPDATE categories 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `

    await db.query(query, [req.params.id])
    res.json({ message: "Categoría eliminada exitosamente" })
  } catch (error) {
    console.error("Error eliminando categoría:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

module.exports = router
