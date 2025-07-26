const jwt = require("jsonwebtoken")
const User = require("../models/User")

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    console.log("🔍 Token recibido:", token ? "Sí" : "No")
    console.log("🔍 Token completo:", token)

    if (!token) {
      console.log("❌ No hay token")
      return res.status(401).json({ message: "Token de acceso requerido" })
    }

    console.log("🔑 JWT_SECRET existe:", !!process.env.JWT_SECRET)
    console.log("🔑 JWT_SECRET valor:", process.env.JWT_SECRET)

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log("✅ Token decodificado:", decoded)

    const user = await User.findById(decoded.userId)
    console.log("👤 Usuario encontrado:", user ? "Sí" : "No")
    console.log("👤 Usuario completo:", user)

    if (!user) {
      console.log("❌ Usuario no encontrado en BD")
      return res.status(401).json({ message: "Token inválido - Usuario no encontrado" })
    }

    req.user = user
    console.log("✅ Auth exitoso, continuando...")
    next()
  } catch (error) {
    console.error("❌ Error en auth middleware:", error.message)
    console.error("❌ Error completo:", error)
    return res.status(401).json({ message: "Token inválido" })
  }
}

const adminAuth = (req, res, next) => {
  console.log("🔐 Verificando permisos admin...")
  console.log("👤 Usuario actual:", req.user)
  
  if (!req.user) {
    return res.status(401).json({ message: "Token inválido" })
  }

  if (req.user.role !== "admin") {
    console.log("❌ Usuario no es admin:", req.user.role)
    return res.status(403).json({
      message: "Acceso denegado. Se requieren permisos de administrador",
    })
  }

  console.log("✅ Usuario es admin, acceso permitido")
  next()
}

const staffAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Token inválido" })
  }

  if (!["admin", "staff"].includes(req.user.role)) {
    return res.status(403).json({
      message: "Acceso denegado. Se requieren permisos de staff",
    })
  }

  next()
}

module.exports = { auth, adminAuth, staffAuth }