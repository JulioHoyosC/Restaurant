const app = require('./app')
const { createServer } = require("http")
const { Server } = require("socket.io")
const socketHandler = require("./sockets/socketHandler")

// Crear servidor HTTP
const server = createServer(app)

// Configurar Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

// Configurar WebSockets
socketHandler(io)

// Puerto del servidor
const PORT = process.env.PORT || 5000

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || "development"}`)
  console.log(`📡 WebSockets habilitados`)
  console.log(`🔗 Cliente permitido: ${process.env.CLIENT_URL || "http://localhost:3000"}`)
})

// Manejo de errores del servidor
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT

  switch (error.code) {
    case 'EACCES':
      console.error(`❌ ${bind} requiere privilegios elevados`)
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(`❌ ${bind} ya está en uso`)
      process.exit(1)
      break
    default:
      throw error
  }
})

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido, cerrando servidor...')
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recibido, cerrando servidor...')
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente')
    process.exit(0)
  })
})

module.exports = server
