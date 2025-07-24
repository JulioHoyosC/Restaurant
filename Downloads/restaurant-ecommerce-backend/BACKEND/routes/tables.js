const express = require("express")
const db = require("../config/database")
const { auth, staffAuth } = require("../middleware/auth")
const { body, validationResult } = require("express-validator")

const router = express.Router()

// Validación para mesas
const validateTable = [
  body("tableNumber").isInt({ min: 1 }).withMessage("Número de mesa debe ser un entero positivo"),
  body("capacity").isInt({ min: 1 }).withMessage("Capacidad debe ser un entero positivo"),
  body("location").optional().trim().isLength({ max: 100 }).withMessage("Ubicación no puede exceder 100 caracteres"),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
]

// Obtener todas las mesas disponibles (público)
router.get("/available", async (req, res) => {
  try {
    const query = `
      SELECT * FROM tables 
      WHERE is_available = true 
      ORDER BY table_number
    `
    const result = await db.query(query)
    res.json({ tables: result.rows })
  } catch (error) {
    console.error("Error obteniendo mesas disponibles:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Obtener todas las mesas (solo staff)
router.get("/", staffAuth, async (req, res) => {
  try {
    const query = "SELECT * FROM tables ORDER BY table_number"
    const result = await db.query(query)
    res.json({ tables: result.rows })
  } catch (error) {
    console.error("Error obteniendo mesas:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Crear mesa (solo staff)
router.post("/", staffAuth, validateTable, async (req, res) => {
  try {
    const { tableNumber, capacity, location } = req.body

    const query = `
      INSERT INTO tables (table_number, capacity, location)
      VALUES ($1, $2, $3)
      RETURNING *
    `

    const result = await db.query(query, [tableNumber, capacity, location])

    res.status(201).json({
      message: "Mesa creada exitosamente",
      table: result.rows[0],
    })
  } catch (error) {
    if (error.code === "23505") {
      // Unique violation
      return res.status(400).json({ message: "El número de mesa ya existe" })
    }
    console.error("Error creando mesa:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Actualizar mesa (solo staff)
router.put("/:id", staffAuth, validateTable, async (req, res) => {
  try {
    const { tableNumber, capacity, location, isAvailable } = req.body

    const query = `
      UPDATE tables 
      SET table_number = $1, capacity = $2, location = $3, is_available = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `

    const result = await db.query(query, [tableNumber, capacity, location, isAvailable !== false, req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Mesa no encontrada" })
    }

    res.json({
      message: "Mesa actualizada exitosamente",
      table: result.rows[0],
    })
  } catch (error) {
    if (error.code === "23505") {
      // Unique violation
      return res.status(400).json({ message: "El número de mesa ya existe" })
    }
    console.error("Error actualizando mesa:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Eliminar mesa (solo staff)
router.delete("/:id", staffAuth, async (req, res) => {
  try {
    const query = "DELETE FROM tables WHERE id = $1"
    await db.query(query, [req.params.id])
    res.json({ message: "Mesa eliminada exitosamente" })
  } catch (error) {
    console.error("Error eliminando mesa:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Hacer reserva
router.post("/:id/reserve", auth, async (req, res) => {
  try {
    const { reservationDate, reservationTime, partySize, specialRequests } = req.body

    if (!reservationDate || !reservationTime || !partySize) {
      return res.status(400).json({ message: "Fecha, hora y tamaño del grupo son requeridos" })
    }

    // Verificar que la mesa existe y está disponible
    const tableQuery = "SELECT * FROM tables WHERE id = $1 AND is_available = true"
    const tableResult = await db.query(tableQuery, [req.params.id])

    if (tableResult.rows.length === 0) {
      return res.status(404).json({ message: "Mesa no encontrada o no disponible" })
    }

    const table = tableResult.rows[0]

    if (partySize > table.capacity) {
      return res.status(400).json({ message: "El tamaño del grupo excede la capacidad de la mesa" })
    }

    // Verificar disponibilidad en la fecha y hora solicitada
    const conflictQuery = `
      SELECT * FROM reservations 
      WHERE table_id = $1 AND reservation_date = $2 AND reservation_time = $3 
      AND status IN ('pending', 'confirmed')
    `

    const conflictResult = await db.query(conflictQuery, [req.params.id, reservationDate, reservationTime])

    if (conflictResult.rows.length > 0) {
      return res.status(400).json({ message: "Mesa no disponible en esa fecha y hora" })
    }

    // Crear reserva
    const reservationQuery = `
      INSERT INTO reservations (user_id, table_id, reservation_date, reservation_time, party_size, special_requests)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `

    const reservationResult = await db.query(reservationQuery, [
      req.user.id,
      req.params.id,
      reservationDate,
      reservationTime,
      partySize,
      specialRequests,
    ])

    res.status(201).json({
      message: "Reserva creada exitosamente",
      reservation: reservationResult.rows[0],
    })
  } catch (error) {
    console.error("Error creando reserva:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

module.exports = router
