const express = require("express")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const { validateRegister, validateLogin } = require("../middleware/validation")
const { auth } = require("../middleware/auth")

const router = express.Router()

// Registro de usuario
router.post("/register", validateRegister, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body

    // Verificar si el usuario ya existe
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe" })
    }

    // Crear nuevo usuario
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
    })

    // Generar token JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE })

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Error en registro:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Login de usuario
router.post("/login", validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body

    // Buscar usuario
    const user = await User.findByEmail(email)
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" })
    }

    // Verificar contraseña
    const isValidPassword = await User.validatePassword(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ message: "Credenciales inválidas" })
    }

    // Generar token JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE })

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Obtener perfil del usuario autenticado
router.get("/profile", auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
        phone: req.user.phone,
        role: req.user.role,
      },
    })
  } catch (error) {
    console.error("Error para obneter perfil:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Verificar token
router.get("/verify", auth, (req, res) => {
  res.json({ message: "Token válido", userId: req.user.id })
})

module.exports = router
