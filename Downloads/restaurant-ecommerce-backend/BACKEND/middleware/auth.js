const jwt = require("jsonwebtoken")
const User = require("../models/User")

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "Token de acceso requerido" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(401).json({ message: "Token inválido" })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ message: "Token inválido" })
  }
}

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {})

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de administrador" })
    }

    next()
  } catch (error) {
    res.status(401).json({ message: "Token inválido" })
  }
}

const staffAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {})

    if (!["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de staff" })
    }

    next()
  } catch (error) {
    res.status(401).json({ message: "Token inválido" })
  }
}

module.exports = { auth, adminAuth, staffAuth }
