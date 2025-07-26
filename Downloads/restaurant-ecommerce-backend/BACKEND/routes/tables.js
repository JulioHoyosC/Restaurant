const express = require("express")
const db = require("../config/database")
const { auth, adminAuth, staffAuth } = require("../middleware/auth")
const { body, param, validationResult } = require("express-validator")
const router = express.Router()

// Validación SIMPLIFICADA
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    console.log("❌ Errores de validación:", errors.array())
    return res.status(400).json({
      success: false,
      message: "Errores de validación",
      errors: errors.array(),
    })
  }
  next()
}

const validateTableSimple = [
  body("tableNumber").isInt({ min: 1 }).withMessage("Número de mesa debe ser un entero positivo"),
  body("capacity").isInt({ min: 1, max: 20 }).withMessage("Capacidad debe ser entre 1 y 20"),
  body("location").optional().trim().isLength({ max: 100 }).withMessage("Ubicación muy larga"),
  handleValidationErrors,
]

// GET /api/tables - Obtener todas las mesas
router.get("/", auth, staffAuth, async (req, res) => {
  try {
    console.log("🔍 DEBUG - Obteniendo mesas para usuario:", req.user.role)

    const query = `
      SELECT id, table_number, capacity, location, description, is_available, created_at, updated_at
      FROM tables 
      ORDER BY table_number
    `

    const result = await db.query(query)

    console.log("✅ DEBUG - Mesas encontradas:", result.rows.length)

    res.json({
      success: true,
      message: "Mesas obtenidas exitosamente",
      tables: result.rows.map((table) => ({
        id: table.id,
        tableNumber: table.table_number,
        capacity: table.capacity,
        location: table.location,
        description: table.description,
        isAvailable: table.is_available,
        createdAt: table.created_at,
        updatedAt: table.updated_at,
      })),
    })
  } catch (error) {
    console.error("❌ Error obteniendo mesas:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
})

// POST /api/tables - Crear mesa
router.post("/", auth, staffAuth, validateTableSimple, async (req, res) => {
  try {
    console.log("🔍 DEBUG - Creando mesa:", req.body)
    console.log("🔍 DEBUG - Usuario:", req.user.role)

    const { tableNumber, capacity, location, description, isAvailable = true } = req.body

    // Verificar que no existe
    const existingTable = await db.query("SELECT id FROM tables WHERE table_number = $1", [tableNumber])

    if (existingTable.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya existe una mesa con ese número",
      })
    }

    console.log("🔍 DEBUG - Insertando mesa...")

    const query = `
      INSERT INTO tables (id, table_number, capacity, location, description, is_available)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)
      RETURNING *
    `

    const result = await db.query(query, [tableNumber, capacity, location || null, description || null, isAvailable])

    console.log("✅ DEBUG - Mesa creada:", result.rows[0])

    res.status(201).json({
      success: true,
      message: "Mesa creada exitosamente",
      table: {
        id: result.rows[0].id,
        tableNumber: result.rows[0].table_number,
        capacity: result.rows[0].capacity,
        location: result.rows[0].location,
        description: result.rows[0].description,
        isAvailable: result.rows[0].is_available,
        createdAt: result.rows[0].created_at,
      },
    })
  } catch (error) {
    console.error("❌ Error creando mesa:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
})

module.exports = router
