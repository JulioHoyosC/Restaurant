const express = require("express")
const Order = require("../models/Order")
const { auth, adminAuth, staffAuth } = require("../middleware/auth")
const { body, validationResult } = require("express-validator")

const router = express.Router()

// Validación para UUIDs
const validateOrderUUID = [
  body("customerName").trim().isLength({ min: 2 }).withMessage("Nombre requerido"),
  body("items").isArray({ min: 1 }).withMessage("Se requiere al menos un item"),
  body("items.*.productId").isUUID().withMessage("ID de producto debe ser un UUID válido"),
  body("items.*.quantity").isInt({ min: 1 }).withMessage("Cantidad debe ser mayor a 0"),
  body("items.*.price").isFloat({ min: 0 }).withMessage("Precio debe ser mayor o igual a 0"),
  body("orderType").isIn(["dine_in", "takeaway", "delivery"]).withMessage("Tipo de orden inválido"),
  body("tableId").optional().isUUID().withMessage("ID de mesa debe ser un UUID válido"),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.log("❌ Errores de validación:", errors.array())
      return res.status(400).json({
        success: false,
        message: "Datos de orden inválidos",
        errors: errors.array(),
      })
    }
    next()
  },
]

// GET /api/orders - Obtener órdenes
router.get("/", auth, async (req, res) => {
  try {
    console.log("🔍 DEBUG - Obteniendo órdenes para usuario:", req.user)
    const filters = {
      limit: Number.parseInt(req.query.limit) || 50,
      offset: Number.parseInt(req.query.offset) || 0,
    }

    // Si no es staff/admin, solo sus órdenes
    if (!["admin", "staff"].includes(req.user.role)) {
      filters.customerId = req.user.id // UUID, no convertir
    }

    const orders = await Order.getAll(filters)
    res.json({
      success: true,
      message: "Órdenes obtenidas exitosamente",
      orders: orders,
      filters: filters,
    })
  } catch (error) {
    console.error("❌ Error obteniendo órdenes:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
})

// POST /api/orders - Crear orden
router.post("/", auth, validateOrderUUID, async (req, res) => {
  try {
    console.log("🔍 DEBUG - Creando orden:", req.body)
    console.log("🔍 DEBUG - Usuario:", req.user)

    const {
      items,
      tableId,
      customerName,
      customerPhone,
      customerEmail,
      orderType,
      specialInstructions,
      deliveryAddress,
    } = req.body

    // VALIDACIÓN ADICIONAL: Verificar que todos los precios sean válidos
    for (const item of items) {
      const price = Number.parseFloat(item.price)
      if (Number.isNaN(price) || price <= 0) {
        console.log("❌ Precio inválido detectado:", item)
        return res.status(400).json({
          success: false,
          message: `Precio inválido para producto ${item.productId}: ${item.price}`,
          invalidItem: item,
        })
      }
    }

    // Calcular totales con validación
    let subtotal = 0
    for (const item of items) {
      const itemPrice = Number.parseFloat(item.price)
      const itemQuantity = Number.parseInt(item.quantity)
      const itemSubtotal = itemPrice * itemQuantity
      console.log(`💰 Item: ${item.productId} - $${itemPrice} x ${itemQuantity} = $${itemSubtotal}`)
      subtotal += itemSubtotal
    }

    const taxAmount = subtotal * 0.18
    const discountAmount = 0
    const totalAmount = subtotal + taxAmount - discountAmount

    console.log("💰 DEBUG - Totales calculados:", { subtotal, taxAmount, discountAmount, totalAmount })

    // CORRECCIÓN: NO convertir UUIDs a enteros
    const orderData = {
      userId: req.user.id, // UUID - NO convertir
      tableId: tableId || null, // UUID - NO convertir
      orderType: orderType,
      subtotal: subtotal,
      taxAmount: taxAmount,
      discountAmount: discountAmount,
      totalAmount: totalAmount,
      deliveryAddress: deliveryAddress || null,
      specialInstructions: specialInstructions || null,
      items: items.map((item) => {
        const unitPrice = Number.parseFloat(item.price)
        const quantity = Number.parseInt(item.quantity)
        const totalPrice = unitPrice * quantity

        console.log(
          `🔍 DEBUG - Item procesado: productId=${item.productId}, unitPrice=${unitPrice}, quantity=${quantity}, totalPrice=${totalPrice}`,
        )

        return {
          productId: item.productId, // UUID - NO convertir
          quantity: quantity,
          unitPrice: unitPrice,
          totalPrice: totalPrice,
          specialRequests: item.specialInstructions || null,
        }
      }),
    }

    console.log("🔍 DEBUG - Datos de orden procesados:", JSON.stringify(orderData, null, 2))

    const order = await Order.create(orderData)
    console.log("✅ DEBUG - Orden creada exitosamente:", order.id)

    res.status(201).json({
      success: true,
      message: "Orden creada exitosamente",
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status || "pendiente",
        totalAmount: Number.parseFloat(order.total_amount),
        createdAt: order.created_at,
      },
      debug: {
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        itemsProcessed: items.length,
      },
    })
  } catch (error) {
    console.error("❌ Error creando orden:", error)
    console.error("❌ Stack completo:", error.stack)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
})

// GET /api/orders/:id - Obtener orden por ID
router.get("/:id", auth, async (req, res) => {
  try {
    console.log("🔍 DEBUG - Obteniendo orden:", req.params.id)

    // UUID - NO convertir a entero
    const orderId = req.params.id
    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada",
      })
    }

    // Verificar permisos
    if (!["admin", "staff"].includes(req.user.role) && order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado",
      })
    }

    res.json({
      success: true,
      message: "Orden obtenida exitosamente",
      order: order,
    })
  } catch (error) {
    console.error("❌ Error obteniendo orden:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
})

module.exports = router