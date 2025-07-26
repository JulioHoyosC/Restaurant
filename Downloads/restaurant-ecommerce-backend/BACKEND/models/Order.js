const db = require("../config/database")

class Order {
  static async create(orderData) {
    console.log("🔍 DEBUG - Order.create llamado con:", JSON.stringify(orderData, null, 2))

    const {
      userId,
      tableId,
      orderType,
      items,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      deliveryAddress,
      specialInstructions,
    } = orderData

    return await db.transaction(async (client) => {
      // Generar número de orden único
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

      // Crear la orden
      const orderQuery = `
        INSERT INTO orders (
          user_id, table_id, order_number, order_type, subtotal,
          tax_amount, discount_amount, total_amount, delivery_address,
          special_instructions
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `

      console.log("🔍 DEBUG - Ejecutando query de orden con parámetros:", [
        userId,
        tableId,
        orderNumber,
        orderType,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        deliveryAddress,
        specialInstructions,
      ])

      const orderResult = await client.query(orderQuery, [
        userId,
        tableId,
        orderNumber,
        orderType,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        deliveryAddress,
        specialInstructions,
      ])

      const order = orderResult.rows[0]
      console.log("✅ DEBUG - Orden creada:", order)

      // Crear los items de la orden
      for (const item of items) {
        console.log("🔍 DEBUG - Insertando item:", item)

        const itemQuery = `
          INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, special_requests)
          VALUES ($1, $2, $3, $4, $5, $6)
        `

        await client.query(itemQuery, [
          order.id,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
          item.specialRequests,
        ])

        // Actualizar stock del producto
        await client.query("UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2", [
          item.quantity,
          item.productId,
        ])
      }

      return order
    })
  }

  static async findById(id) {
    const query = `
      SELECT o.*, u.first_name, u.last_name, u.email, t.table_number
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE o.id = $1
    `
    const result = await db.query(query, [id])
    if (!result.rows[0]) return null

    const order = result.rows[0]

    // Obtener items de la orden
    const itemsQuery = `
      SELECT oi.*, p.name as product_name, p.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `
    const itemsResult = await db.query(itemsQuery, [id])
    order.items = itemsResult.rows

    return order
  }

  static async getByUserId(userId, limit = 20, offset = 0) {
    const query = `
      SELECT o.*, t.table_number
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `
    const result = await db.query(query, [userId, limit, offset])
    return result.rows
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT o.*, u.first_name, u.last_name, t.table_number
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE 1=1
    `
    const params = []
    let paramCount = 0

    if (filters.status) {
      paramCount++
      query += ` AND o.status = $${paramCount}`
      params.push(filters.status)
    }

    if (filters.orderType) {
      paramCount++
      query += ` AND o.order_type = $${paramCount}`
      params.push(filters.orderType)
    }

    if (filters.dateFrom) {
      paramCount++
      query += ` AND o.created_at >= $${paramCount}`
      params.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      paramCount++
      query += ` AND o.created_at <= $${paramCount}`
      params.push(filters.dateTo)
    }

    // CORRECCIÓN: Agregar filtro por customerId si existe
    if (filters.customerId) {
      paramCount++
      query += ` AND o.user_id = $${paramCount}`
      params.push(filters.customerId)
    }

    query += ` ORDER BY o.created_at DESC`

    if (filters.limit) {
      paramCount++
      query += ` LIMIT $${paramCount}`
      params.push(filters.limit)
    }

    if (filters.offset) {
      paramCount++
      query += ` OFFSET $${paramCount}`
      params.push(filters.offset)
    }

    const result = await db.query(query, params)
    return result.rows
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `
    const result = await db.query(query, [status, id])
    return result.rows[0]
  }

  static async updatePaymentStatus(id, paymentStatus, paymentMethod = null) {
    const query = `
      UPDATE orders 
      SET payment_status = $1, payment_method = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `
    const result = await db.query(query, [paymentStatus, paymentMethod, id])
    return result.rows[0]
  }

  static async cancel(id) {
    return await db.transaction(async (client) => {
      // Obtener items de la orden para restaurar stock
      const itemsQuery = "SELECT product_id, quantity FROM order_items WHERE order_id = $1"
      const itemsResult = await client.query(itemsQuery, [id])

      // Restaurar stock
      for (const item of itemsResult.rows) {
        await client.query("UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2", [
          item.quantity,
          item.product_id,
        ])
      }

      // Actualizar estado de la orden
      const orderQuery = `
        UPDATE orders 
        SET status = 'cancelado', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `
      const result = await client.query(orderQuery, [id])
      return result.rows[0]
    })
  }
}

module.exports = Order
