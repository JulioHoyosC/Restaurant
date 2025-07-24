const express = require("express")
const Product = require("../models/Product")
const { auth, adminAuth } = require("../middleware/auth")
const { validateProduct } = require("../middleware/validation")

const router = express.Router()

// Obtener todos los productos (público)
router.get("/", async (req, res) => {
  try {
    const filters = {
      categoryId: req.query.category,
      isVegetarian: req.query.vegetarian === "true",
      isVegan: req.query.vegan === "true",
      search: req.query.search,
      limit: Number.parseInt(req.query.limit) || 50,
      offset: Number.parseInt(req.query.offset) || 0,
    }

    const products = await Product.getAll(filters)
    res.json({ products })
  } catch (error) {
    console.error("Error obteniendo productos:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Obtener producto por ID (público)
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" })
    }
    res.json({ product })
  } catch (error) {
    console.error("Error obteniendo producto:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Crear producto (solo admin)
router.post("/", adminAuth, validateProduct, async (req, res) => {
  try {
    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      categoryId: req.body.categoryId,
      imageUrl: req.body.imageUrl,
      ingredients: req.body.ingredients || [],
      allergens: req.body.allergens || [],
      isVegetarian: req.body.isVegetarian || false,
      isVegan: req.body.isVegan || false,
      isGlutenFree: req.body.isGlutenFree || false,
      preparationTime: req.body.preparationTime,
      calories: req.body.calories,
      stockQuantity: req.body.stockQuantity || 0,
    }

    const product = await Product.create(productData)
    res.status(201).json({
      message: "Producto creado exitosamente",
      product,
    })
  } catch (error) {
    console.error("Error creando producto:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Actualizar producto (solo admin)
router.put("/:id", adminAuth, validateProduct, async (req, res) => {
  try {
    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      categoryId: req.body.categoryId,
      imageUrl: req.body.imageUrl,
      ingredients: req.body.ingredients || [],
      allergens: req.body.allergens || [],
      isVegetarian: req.body.isVegetarian || false,
      isVegan: req.body.isVegan || false,
      isGlutenFree: req.body.isGlutenFree || false,
      preparationTime: req.body.preparationTime,
      calories: req.body.calories,
      stockQuantity: req.body.stockQuantity || 0,
      isAvailable: req.body.isAvailable !== false,
    }

    const product = await Product.update(req.params.id, productData)
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" })
    }

    res.json({
      message: "Producto actualizado exitosamente",
      product,
    })
  } catch (error) {
    console.error("Error actualizando producto:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Eliminar producto (solo admin)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    await Product.delete(req.params.id)
    res.json({ message: "Producto eliminado exitosamente" })
  } catch (error) {
    console.error("Error eliminando producto:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// Actualizar stock (solo admin)
router.patch("/:id/stock", adminAuth, async (req, res) => {
  try {
    const { quantity } = req.body
    if (typeof quantity !== "number") {
      return res.status(400).json({ message: "Cantidad inválida" })
    }

    const result = await Product.updateStock(req.params.id, quantity)
    res.json({
      message: "Stock actualizado exitosamente",
      newStock: result.stock_quantity,
    })
  } catch (error) {
    console.error("Error actualizando stock:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

module.exports = router
