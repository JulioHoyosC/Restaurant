const express = require("express")
const User = require("../models/User")
const { auth, adminAuth } = require("../middleware/auth")
const { body, validationResult } = require("express-validator")

const router = express.Router()

// Validación para crear usuario
const validateUserCreate = [
  body("email").isEmail().withMessage("Email válido requerido"),
  body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
  body("firstName").trim().isLength({ min: 2 }).withMessage("El nombre debe tener al menos 2 caracteres"),
  body("lastName").trim().isLength({ min: 2 }).withMessage("El apellido debe tener al menos 2 caracteres"),
  body("phone").optional().isMobilePhone().withMessage("Número de teléfono válido requerido"),
  body("role").optional().isIn(["cliente", "staff", "admin"]).withMessage("Rol debe ser cliente, staff o admin"),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
]

// Validación para actualizar usuario
const validateUserUpdate = [
  body("email").optional().isEmail().withMessage("Email válido requerido"),
  body("firstName").optional().trim().isLength({ min: 2 }).withMessage("El nombre debe tener al menos 2 caracteres"),
  body("lastName").optional().trim().isLength({ min: 2 }).withMessage("El apellido debe tener al menos 2 caracteres"),
  body("phone").optional().isMobilePhone().withMessage("Número de teléfono válido requerido"),
  body("role").optional().isIn(["cliente", "staff", "admin"]).withMessage("Rol debe ser cliente, staff o admin"),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
]

// Validación para actualizar perfil propio
const validateProfileUpdate = [
  body("firstName").optional().trim().isLength({ min: 2 }).withMessage("El nombre debe tener al menos 2 caracteres"),
  body("lastName").optional().trim().isLength({ min: 2 }).withMessage("El apellido debe tener al menos 2 caracteres"),
  body("phone").optional().isMobilePhone().withMessage("Número de teléfono válido requerido"),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
]

// ==================== GET ROUTES ====================

// GET /api/users - Obtener todos los usuarios (solo admin)
router.get("/", auth, adminAuth, async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit) || 50
    const offset = Number.parseInt(req.query.offset) || 0

    const users = await User.getAll(limit, offset)

    res.json({
      message: "Usuarios obtenidos exitosamente",
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      })),
      pagination: {
        limit,
        offset,
        total: users.length,
      },
    })
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// GET /api/users/:id - Obtener usuario por ID (admin o el mismo usuario)
router.get("/:id", auth, async (req, res) => {
  try {
    // Verificar permisos: admin puede ver cualquier usuario, usuario solo puede verse a sí mismo
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ message: "Acceso denegado" })
    }

    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    res.json({
      message: "Usuario obtenido exitosamente",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    })
  } catch (error) {
    console.error("Error obteniendo usuario:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// ==================== POST ROUTES ====================

// POST /api/users - Crear nuevo usuario (solo admin)
router.post("/", auth, adminAuth, validateUserCreate, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body

    // Verificar si el usuario ya existe
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe con ese email" })
    }

    // Crear nuevo usuario
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: role || "cliente",
    })

    res.status(201).json({
      message: "Usuario creado exitosamente",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
        createdAt: user.created_at,
      },
    })
  } catch (error) {
    console.error("Error creando usuario:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// ==================== PUT ROUTES ====================

// PUT /api/users/:id - Actualizar usuario por ID (solo admin)
router.put("/:id", auth, adminAuth, validateUserUpdate, async (req, res) => {
  try {
    const { email, firstName, lastName, phone, role } = req.body
    const userId = req.params.id

    // Verificar que el usuario existe
    const existingUser = await User.findById(userId)
    if (!existingUser) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    // Si se está actualizando el email, verificar que no exista otro usuario con ese email
    if (email && email !== existingUser.email) {
      const emailExists = await User.findByEmail(email)
      if (emailExists) {
        return res.status(400).json({ message: "Ya existe un usuario con ese email" })
      }
    }

    // Actualizar usuario
    const updatedUser = await User.update(userId, {
      email: email || existingUser.email,
      firstName: firstName || existingUser.first_name,
      lastName: lastName || existingUser.last_name,
      phone: phone || existingUser.phone,
      role: role || existingUser.role,
    })

    res.json({
      message: "Usuario actualizado exitosamente",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        phone: updatedUser.phone,
        updatedAt: updatedUser.updated_at,
      },
    })
  } catch (error) {
    console.error("Error actualizando usuario:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// PUT /api/users/profile - Actualizar perfil propio (usuario autenticado)
router.put("/profile", auth, validateProfileUpdate, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body

    const updatedUser = await User.update(req.user.id, {
      firstName: firstName || req.user.first_name,
      lastName: lastName || req.user.last_name,
      phone: phone || req.user.phone,
    })

    res.json({
      message: "Perfil actualizado exitosamente",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        phone: updatedUser.phone,
        updatedAt: updatedUser.updated_at,
      },
    })
  } catch (error) {
    console.error("Error actualizando perfil:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// PUT /api/users/change-password - Cambiar contraseña propia
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
    const user = await User.findById(req.user.id)
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

// ==================== DELETE ROUTES ====================

// DELETE /api/users/:id - Eliminar usuario (solo admin)
router.delete("/:id", auth, adminAuth, async (req, res) => {
  try {
    const userId = req.params.id

    // Verificar que el usuario existe
    const existingUser = await User.findById(userId)
    if (!existingUser) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    // No permitir que el admin se elimine a sí mismo
    if (userId === req.user.id) {
      return res.status(400).json({ message: "No puedes eliminar tu propia cuenta" })
    }

    await User.delete(userId)

    res.json({
      message: "Usuario eliminado exitosamente",
      deletedUser: {
        id: existingUser.id,
        email: existingUser.email,
        firstName: existingUser.first_name,
        lastName: existingUser.last_name,
      },
    })
  } catch (error) {
    console.error("Error eliminando usuario:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

module.exports = router
