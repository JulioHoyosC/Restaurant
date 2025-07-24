const express = require("express")
const User = require("../models/User")
const { auth, adminAuth } = require("../middleware/auth")
const { body, validationResult } = require("express-validator")

const router = express.Router()

// Validación para actualizar perfil
const validateProfileUpdate = [
  body("firstName").trim().isLength({ min: 2 }).withMessage("El nombre debe tener al menos 2 caracteres"),
  body("lastName").trim().isLength({ min: 2 }).withMessage("El apellido debe tener al menos 2 caracteres"),
  body("phone").optional().isMobilePhone().withMessage("Número de teléfono válido requerido"),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
]

// Obtener todos los usuarios (solo admin)
router.get("/", adminAuth, async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit) || 50
    const offset = Number.parseInt(req.query.offset) || 0

    const users = await User.getAll(limit, offset)
    res.json({ users })
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Obtener usuario por ID (solo admin o el mismo usuario)
router.get("/:id", auth, async (req, res) => {
  try {
    // Verificar permisos
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ message: "Acceso denegado" })
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    res.json({ user })
  } catch (error) {
    console.error("Error obteniendo usuario:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Actualizar perfil de usuario
router.put("/profile", auth, validateProfileUpdate, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body

    const updatedUser = await User.update(req.user.id, {
      firstName,
      lastName,
      phone,
    })

    res.json({
      message: "Perfil actualizado exitosamente",
      user: updatedUser,
    })
  } catch (error) {
    console.error("Error actualizando perfil:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Cambiar contraseña
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Contraseña actual y nueva requeridas" })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres" })
    }

    // Verificar contraseña actual
    const user = await User.findByEmail(req.user.email)
    const isValidPassword = await User.validatePassword(currentPassword, user.password)

    if (!isValidPassword) {
      return res.status(400).json({ message: "Contraseña actual incorrecta" })
    }

    await User.updatePassword(req.user.id, newPassword)

    res.json({ message: "Contraseña actualizada exitosamente" })
  } catch (error) {
    console.error("Error cambiando contraseña:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Eliminar usuario (solo admin)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    await User.delete(req.params.id)
    res.json({ message: "Usuario eliminado exitosamente" })
  } catch (error) {
    console.error("Error eliminando usuario:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

module.exports = router
