const express = require("express")
const router = express.Router()
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const { validateLogin, validateRegister } = require("../middleware/validation")
const { auth, adminAuth } = require("../middleware/auth")

// Middleware básico para staff (si no lo tienes en auth.js, agrégalo)
const staffAuth = (req, res, next) => {
  if (req.user.role !== "staff" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Acceso denegado. Se requiere rol de staff o admin" })
  }
  next()
}

// Función para obtener perfil del usuario
const getProfile = async (req, res) => {
  try {
    // req.user.id viene del middleware auth
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    res.json({
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
    console.error("Error obteniendo perfil:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Función para obtener todos los usuarios (solo admin)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll() // Cambié findAll() por getAll() según tu modelo

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
      })),
    })
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Función para obtener todas las órdenes (staff y admin)
const getAllOrders = async (req, res) => {
  try {
    // Asumiendo que tienes un modelo Order
    const Order = require("../models/Order")
    const orders = await Order.getAll()

    res.json({
      message: "Órdenes obtenidas exitosamente",
      orders: orders,
    })
  } catch (error) {
    console.error("Error obteniendo órdenes:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Registro de usuario - ARREGLADO PARA PERMITIR ROLE
router.post("/register", validateRegister, async (req, res) => {
  try {
    // AGREGUÉ role en la destructuración
    const { email, password, firstName, lastName, phone, role } = req.body

    // Verificar si el usuario ya existe
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe" })
    }

    // Crear nuevo usuario - AGREGUÉ role con default "cliente"
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: role || "cliente", // Usa role si se proporciona, sino "cliente"
    })

    // Generar token JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    })

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
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    })

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Perfil del usuario autenticado
router.get("/profile", auth, getProfile)

// Verificar token
router.get("/verify", auth, (req, res) => {
  res.json({ message: "Token válido", userId: req.user.id })
})

// Rutas protegidas por rol
router.get("/users", auth, adminAuth, getAllUsers)
router.get("/orders", auth, staffAuth, getAllOrders)

module.exports = router