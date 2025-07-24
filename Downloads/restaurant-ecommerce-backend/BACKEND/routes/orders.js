const express = require("express")
const Order = require("../models/Order")
const Product = require("../models/Product")
const { auth, staffAuth } = require("../middleware/auth")
const { validateOrder } = require("../middleware/validation")

const router = express.Router()

// Crear nueva orden
router.post("/", auth, validateOrder, async (req, res) => {
  try {
    const { items, tableId, orderType, deliveryAddress, specialInstructions } = req.body

    // Validar productos y calcular totales
    let subtotal = 0
    const validatedItems = []

    for (const item of items) {
      const product = await Product.findById(item.productId)
      if (!product) {
        return res.status(400).json({
          message: `Producto no encontrado: ${item.productId}`,
        })
      }

      if (!product.is_available) {
        return res.status(400).json({
          message: `Producto no disponible: ${product.name}`,
        })
      }

      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({
          message: `Stock insuficiente para: ${product.name}`,
        })
      }

      const totalPrice = product.price * item.quantity
      subtotal += totalPrice

      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice,
        specialRequests: item.specialRequests,
      })
    }

    // Calcular impuestos y total
    const taxAmount = subtotal * 0.1 // 10% de impuesto
    const discountAmount = 0 // Implementar lógica de descuentos si es necesario
    const totalAmount = subtotal + taxAmount - discountAmount

    const orderData = {
      userId: req.user.id,
      tableId,
      orderType,
      items: validatedItems,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      deliveryAddress,
      specialInstructions,
    }

    const order = await Order.create(orderData)

    res.status(201).json({
      message: "Orden creada exitosamente",
      order,
    })
  } catch (error) {
    console.error("Error creando orden:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Obtener órdenes del usuario autenticado
router.get("/my-orders", auth, async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit) || 20
    const offset = Number.parseInt(req.query.offset) || 0

    const orders = await Order.getByUserId(req.user.id, limit, offset)
    res.json({ orders })
  } catch (error) {
    console.error("Error obteniendo órdenes del usuario:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Obtener todas las órdenes (solo staff/admin)
router.get("/", staffAuth, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      orderType: req.query.orderType,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      limit: Number.parseInt(req.query.limit) || 50,
      offset: Number.parseInt(req.query.offset) || 0,
    }

    const orders = await Order.getAll(filters)
    res.json({ orders })
  } catch (error) {
    console.error("Error obteniendo órdenes:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Obtener orden por ID
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada" })
    }

    // Verificar que el usuario puede ver esta orden
    if (req.user.role === "customer" && order.user_id !== req.user.id) {
      return res.status(403).json({ message: "Acceso denegado" })
    }

    res.json({ order })
  } catch (error) {
    console.error("Error obteniendo orden:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Actualizar estado de orden (solo staff/admin)
router.patch("/:id/status", staffAuth, async (req, res) => {
  try {
    const { status } = req.body
    const validStatuses = ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"]

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Estado inválido" })
    }

    const order = await Order.updateStatus(req.params.id, status)
    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada" })
    }

    res.json({
      message: "Estado de orden actualizado exitosamente",
      order,
    })
  } catch (error) {
    console.error("Error actualizando estado de orden:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Actualizar estado de pago (solo staff/admin)
router.patch("/:id/payment", staffAuth, async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body
    const validPaymentStatuses = ["pending", "paid", "failed", "refunded"]

    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: "Estado de pago inválido" })
    }

    const order = await Order.updatePaymentStatus(req.params.id, paymentStatus, paymentMethod)
    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada" })
    }

    res.json({
      message: "Estado de pago actualizado exitosamente",
      order,
    })
  } catch (error) {
    console.error("Error actualizando estado de pago:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Cancelar orden
router.patch("/:id/cancel", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada" })
    }

    // Verificar permisos
    if (req.user.role === "customer" && order.user_id !== req.user.id) {
      return res.status(403).json({ message: "Acceso denegado" })
    }

    // Verificar que la orden se puede cancelar
    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({ message: "No se puede cancelar esta orden" })
    }

    const cancelledOrder = await Order.cancel(req.params.id)

    res.json({
      message: "Orden cancelada exitosamente",
      order: cancelledOrder,
    })
  } catch (error) {
    console.error("Error cancelando orden:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

module.exports = router
