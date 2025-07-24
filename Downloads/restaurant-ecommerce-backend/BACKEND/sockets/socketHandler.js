const jwt = require("jsonwebtoken")
const User = require("../models/User")

const socketHandler = (io) => {
  // Middleware de autenticación para sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error("Token requerido"))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.userId)

      if (!user) {
        return next(new Error("Usuario no encontrado"))
      }

      socket.user = user
      next()
    } catch (error) {
      next(new Error("Token inválido"))
    }
  })

  io.on("connection", (socket) => {
    console.log(`Usuario conectado: ${socket.user.email} (${socket.user.role})`)

    // Unir a sala según rol
    if (socket.user.role === "admin" || socket.user.role === "staff") {
      socket.join("staff")
    }
    socket.join(`user_${socket.user.id}`)

    // Eventos de órdenes
    socket.on("order_created", (orderData) => {
      // Notificar al staff sobre nueva orden
      socket.to("staff").emit("new_order", {
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        customerName: `${socket.user.first_name} ${socket.user.last_name}`,
        totalAmount: orderData.total_amount,
        orderType: orderData.order_type,
        timestamp: new Date(),
      })
    })

    socket.on("order_status_updated", (data) => {
      // Notificar al cliente sobre cambio de estado
      socket.to(`user_${data.userId}`).emit("order_status_changed", {
        orderId: data.orderId,
        status: data.status,
        message: getStatusMessage(data.status),
        timestamp: new Date(),
      })

      // Notificar al staff
      socket.to("staff").emit("order_updated", data)
    })

    socket.on("join_table", (tableId) => {
      socket.join(`table_${tableId}`)
      console.log(`Usuario ${socket.user.email} se unió a mesa ${tableId}`)
    })

    socket.on("leave_table", (tableId) => {
      socket.leave(`table_${tableId}`)
      console.log(`Usuario ${socket.user.email} dejó mesa ${tableId}`)
    })

    // Eventos de chat en tiempo real (para soporte)
    socket.on("support_message", (data) => {
      if (socket.user.role === "customer") {
        // Cliente enviando mensaje al soporte
        socket.to("staff").emit("customer_support_message", {
          userId: socket.user.id,
          userName: `${socket.user.first_name} ${socket.user.last_name}`,
          message: data.message,
          timestamp: new Date(),
        })
      } else if (socket.user.role === "staff" || socket.user.role === "admin") {
        // Staff respondiendo al cliente
        socket.to(`user_${data.userId}`).emit("support_response", {
          staffName: `${socket.user.first_name} ${socket.user.last_name}`,
          message: data.message,
          timestamp: new Date(),
        })
      }
    })

    // Notificaciones de cocina
    socket.on("kitchen_update", (data) => {
      if (socket.user.role === "staff" || socket.user.role === "admin") {
        // Actualización desde cocina
        io.emit("kitchen_status", {
          orderId: data.orderId,
          status: data.status,
          estimatedTime: data.estimatedTime,
          timestamp: new Date(),
        })
      }
    })

    socket.on("disconnect", () => {
      console.log(`Usuario desconectado: ${socket.user.email}`)
    })
  })

  // Función para emitir eventos desde otras partes de la aplicación
  const emitToUser = (userId, event, data) => {
    io.to(`user_${userId}`).emit(event, data)
  }

  const emitToStaff = (event, data) => {
    io.to("staff").emit(event, data)
  }

  const emitToTable = (tableId, event, data) => {
    io.to(`table_${tableId}`).emit(event, data)
  }

  // Exportar funciones para uso en otras partes de la aplicación
  global.socketEmitters = {
    emitToUser,
    emitToStaff,
    emitToTable,
  }
}

const getStatusMessage = (status) => {
  const messages = {
    pending: "Tu orden está pendiente de confirmación",
    confirmed: "Tu orden ha sido confirmada",
    preparing: "Tu orden se está preparando",
    ready: "Tu orden está lista",
    delivered: "Tu orden ha sido entregada",
    cancelled: "Tu orden ha sido cancelada",
  }
  return messages[status] || "Estado actualizado"
}

module.exports = socketHandler
