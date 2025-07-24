const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const morgan = require("morgan")
const compression = require("compression")
const rateLimit = require("express-rate-limit")
require("dotenv").config()

// Importar rutas
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/users")
const categoryRoutes = require("./routes/categories")
const productRoutes = require("./routes/products")
const orderRoutes = require("./routes/orders")
const tableRoutes = require("./routes/tables")

// Crear aplicación Express
const app = express()

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// Compresión de respuestas
app.use(compression())

// Logging de requests
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// Rate limiting - Protección contra ataques de fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por ventana de tiempo por IP
  message: {
    error: "Demasiadas peticiones desde esta IP, intenta de nuevo en 15 minutos.",
  },
  standardHeaders: true, // Retorna rate limit info en los headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
})
app.use(limiter)

// Rate limiting más estricto para rutas de autenticación
const authLimiter = rateLimit({
  windowMs:  1 * 60 * 1000, 
  max: 5, // límite de 5 intentos de login por IP
  message: {
    error: "Demasiados intentos de autenticación, intenta de nuevo en 15 minutos.",
  },
})

// CORS - Configuración de orígenes permitidos
app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (mobile apps, postman, etc.)
      if (!origin) return callback(null, true)
      
      const allowedOrigins = [
        process.env.CLIENT_URL || "http://localhost:3000",
        "http://localhost:3001", // Para desarrollo
        "https://tu-dominio-frontend.com" // Para producción
      ]
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('No permitido por CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
)

// Body parsing middleware
app.use(express.json({ 
  limit: "10mb",
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf)
    } catch (e) {
      res.status(400).json({ error: "JSON inválido" })
      throw new Error("JSON inválido")
    }
  }
}))

app.use(express.urlencoded({ 
  extended: true, 
  limit: "10mb" 
}))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  })
})

// API Routes con prefijo /api
app.use("/api/auth", authLimiter, authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/categories", categoryRoutes)
app.use("/api/products", productRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/tables", tableRoutes)

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.json({
    message: '🍽️ Bienvenido al API del Restaurante E-commerce',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      categories: '/api/categories',
      products: '/api/products',
      orders: '/api/orders',
      tables: '/api/tables'
    }
  })
})

// Middleware de manejo de errores 404
app.use("*", (req, res) => {
  res.status(404).json({ 
    error: "Ruta no encontrada",
    message: `La ruta ${req.originalUrl} no existe en este servidor`,
    availableRoutes: [
      '/api/auth',
      '/api/users', 
      '/api/categories',
      '/api/products',
      '/api/orders',
      '/api/tables'
    ]
  })
})

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  })

  // Error de validación de JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON inválido',
      message: 'El cuerpo de la petición contiene JSON malformado'
    })
  }

  // Error de CORS
  if (err.message === 'No permitido por CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origen no permitido'
    })
  }

  // Error de rate limiting
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: err.message
    })
  }

  // Error genérico del servidor
  res.status(err.status || 500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// Manejo de promesas rechazadas no capturadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  // Cerrar servidor gracefully
  process.exit(1)
})

// Manejo de excepciones no capturadas
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  process.exit(1)
})

module.exports = app
