const express = require("express")
const Product = require("../models/Product")
const { auth, adminAuth, staffAuth } = require("../middleware/auth")
const { body, validationResult } = require("express-validator")

const router = express.Router()

// Validación para crear/actualizar producto
const validateProduct = [
  body("name").trim().isLength({ min: 2 }).withMessage("El nombre debe tener al menos 2 caracteres"),
  body("description").trim().isLength({ min: 10 }).withMessage("La descripción debe tener al menos 10 caracteres"),
  body("price").isFloat({ min: 0.01 }).withMessage("El precio debe ser mayor a 0"),
  body("categoryId").isUUID().withMessage("ID de categoría válido requerido"),
  body("imageUrl").optional().isURL().withMessage("URL de imagen válida requerida"),
  body("ingredients").optional().isArray().withMessage("Los ingredientes deben ser un array"),
  body("allergens").optional().isArray().withMessage("Los alérgenos deben ser un array"),
  body("isVegetarian").optional().isBoolean().withMessage("isVegetarian debe ser boolean"),
  body("isVegan").optional().isBoolean().withMessage("isVegan debe ser boolean"),
  body("isGlutenFree").optional().isBoolean().withMessage("isGlutenFree debe ser boolean"),
  body("preparationTime").optional().isInt({ min: 1 }).withMessage("Tiempo de preparación debe ser mayor a 0"),
  body("calories").optional().isInt({ min: 0 }).withMessage("Las calorías deben ser un número positivo"),
  body("stockQuantity").optional().isInt({ min: 0 }).withMessage("Stock debe ser un número positivo"),
  body("isAvailable").optional().isBoolean().withMessage("isAvailable debe ser boolean"),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Datos de producto inválidos",
        errors: errors.array(),
      })
    }
    next()
  },
]

// Validación para actualizar stock
const validateStock = [
  body("quantity").isInt({ min: 0 }).withMessage("La cantidad debe ser un número entero positivo"),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Cantidad de stock inválida",
        errors: errors.array(),
      })
    }
    next()
  },
]

// ==================== GET ROUTES ====================

// GET /api/products - Obtener todos los productos (público con filtros)
router.get("/", async (req, res) => {
  try {
    const filters = {
      categoryId: req.query.category,
      isVegetarian: req.query.vegetarian === "true",
      isVegan: req.query.vegan === "true",
      isGlutenFree: req.query.glutenFree === "true",
      isAvailable: req.query.available !== "false", // Por defecto solo productos disponibles
      search: req.query.search,
      minPrice: req.query.minPrice ? Number.parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number.parseFloat(req.query.maxPrice) : undefined,
      limit: Number.parseInt(req.query.limit) || 50,
      offset: Number.parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || "name", // name, price, created_at
      sortOrder: req.query.sortOrder || "asc", // asc, desc
    }

    const products = await Product.getAll(filters)

    res.json({
      message: "Productos obtenidos exitosamente",
      products: products,
      filters: filters,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: products.length,
      },
    })
  } catch (error) {
    console.error("Error obteniendo productos:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// GET /api/products/:id - Obtener producto por ID (público)
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" })
    }

    res.json({
      message: "Producto obtenido exitosamente",
      product: product,
    })
  } catch (error) {
    console.error("Error obteniendo producto:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// GET /api/products/category/:categoryId - Obtener productos por categoría
router.get("/category/:categoryId", async (req, res) => {
  try {
    const filters = {
      categoryId: req.params.categoryId,
      isAvailable: req.query.available !== "false",
      limit: Number.parseInt(req.query.limit) || 50,
      offset: Number.parseInt(req.query.offset) || 0,
    }

    const products = await Product.getAll(filters)

    res.json({
      message: "Productos de categoría obtenidos exitosamente",
      products: products,
      categoryId: req.params.categoryId,
    })
  } catch (error) {
    console.error("Error obteniendo productos por categoría:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// ==================== POST ROUTES ====================

// POST /api/products - Crear producto (solo admin/staff)
router.post("/", auth, staffAuth, validateProduct, async (req, res) => {
  try {
    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: Number.parseFloat(req.body.price),
      categoryId: req.body.categoryId,
      imageUrl: req.body.imageUrl || null,
      ingredients: req.body.ingredients || [],
      allergens: req.body.allergens || [],
      isVegetarian: req.body.isVegetarian || false,
      isVegan: req.body.isVegan || false,
      isGlutenFree: req.body.isGlutenFree || false,
      preparationTime: req.body.preparationTime || null,
      calories: req.body.calories || null,
      stockQuantity: req.body.stockQuantity || 0,
      isAvailable: req.body.isAvailable !== false,
      createdBy: req.user.id, // Agregar quién creó el producto
    }

    const product = await Product.create(productData)

    res.status(201).json({
      message: "Producto creado exitosamente",
      product: product,
    })
  } catch (error) {
    console.error("Error creando producto:", error)

    // Manejar errores específicos
    if (error.message && error.message.includes("duplicate")) {
      return res.status(400).json({ message: "Ya existe un producto con ese nombre" })
    }

    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// ==================== PUT ROUTES ====================

// PUT /api/products/:id - Actualizar producto completo (solo admin/staff)
router.put("/:id", auth, staffAuth, validateProduct, async (req, res) => {
  try {
    // Verificar que el producto existe
    const existingProduct = await Product.findById(req.params.id)
    if (!existingProduct) {
      return res.status(404).json({ message: "Producto no encontrado" })
    }

    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: Number.parseFloat(req.body.price),
      categoryId: req.body.categoryId,
      imageUrl: req.body.imageUrl || existingProduct.image_url,
      ingredients: req.body.ingredients || existingProduct.ingredients,
      allergens: req.body.allergens || existingProduct.allergens,
      isVegetarian: req.body.isVegetarian !== undefined ? req.body.isVegetarian : existingProduct.is_vegetarian,
      isVegan: req.body.isVegan !== undefined ? req.body.isVegan : existingProduct.is_vegan,
      isGlutenFree: req.body.isGlutenFree !== undefined ? req.body.isGlutenFree : existingProduct.is_gluten_free,
      preparationTime: req.body.preparationTime || existingProduct.preparation_time,
      calories: req.body.calories || existingProduct.calories,
      stockQuantity: req.body.stockQuantity !== undefined ? req.body.stockQuantity : existingProduct.stock_quantity,
      isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : existingProduct.is_available,
      updatedBy: req.user.id, // Agregar quién actualizó el producto
    }

    const product = await Product.update(req.params.id, productData)

    res.json({
      message: "Producto actualizado exitosamente",
      product: product,
    })
  } catch (error) {
    console.error("Error actualizando producto:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// ==================== PATCH ROUTES ====================

// PATCH /api/products/:id/stock - Actualizar solo stock (admin/staff)
router.patch("/:id/stock", auth, staffAuth, validateStock, async (req, res) => {
  try {
    const { quantity } = req.body

    // Verificar que el producto existe
    const existingProduct = await Product.findById(req.params.id)
    if (!existingProduct) {
      return res.status(404).json({ message: "Producto no encontrado" })
    }

    const result = await Product.updateStock(req.params.id, quantity)

    res.json({
      message: "Stock actualizado exitosamente",
      productId: req.params.id,
      previousStock: existingProduct.stock_quantity,
      newStock: result.stock_quantity,
      updatedBy: req.user.id,
    })
  } catch (error) {
    console.error("Error actualizando stock:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// PATCH /api/products/:id/availability - Cambiar disponibilidad (admin/staff)
router.patch("/:id/availability", auth, staffAuth, async (req, res) => {
  try {
    const { isAvailable } = req.body

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "isAvailable debe ser true o false" })
    }

    // Verificar que el producto existe
    const existingProduct = await Product.findById(req.params.id)
    if (!existingProduct) {
      return res.status(404).json({ message: "Producto no encontrado" })
    }

    const product = await Product.update(req.params.id, {
      isAvailable: isAvailable,
      updatedBy: req.user.id,
    })

    res.json({
      message: `Producto ${isAvailable ? "habilitado" : "deshabilitado"} exitosamente`,
      product: product,
    })
  } catch (error) {
    console.error("Error cambiando disponibilidad:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// DELETE /api/products/:id - Eliminar producto (solo admin)
router.delete("/:id", auth, adminAuth, async (req, res) => {
  try {
    // Verificar que el producto existe
    const existingProduct = await Product.findById(req.params.id)
    if (!existingProduct) {
      return res.status(404).json({ message: "Producto no encontrado" })
    }

    await Product.delete(req.params.id)

    res.json({
      message: "Producto eliminado exitosamente",
      deletedProduct: {
        id: existingProduct.id,
        name: existingProduct.name,
        price: existingProduct.price,
      },
      deletedBy: req.user.id,
    })
  } catch (error) {
    console.error("Error eliminando producto:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

module.exports = router
