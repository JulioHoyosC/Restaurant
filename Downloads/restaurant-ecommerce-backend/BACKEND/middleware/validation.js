const { body, validationResult } = require("express-validator")

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Errores de validación",
      errors: errors.array(),
    })
  }
  next()
}

const validateRegister = [
  body("email").isEmail().normalizeEmail().withMessage("Email válido requerido"),
  body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
  body("firstName").trim().isLength({ min: 2 }).withMessage("El nombre debe tener al menos 2 caracteres"),
  body("lastName").trim().isLength({ min: 2 }).withMessage("El apellido debe tener al menos 2 caracteres"),
  body("phone").optional().isMobilePhone().withMessage("Número de teléfono válido requerido"),
  handleValidationErrors,
]

const validateLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Email válido requerido"),
  body("password").notEmpty().withMessage("Contraseña requerida"),
  handleValidationErrors,
]

const validateProduct = [
  body("name").trim().isLength({ min: 2 }).withMessage("El nombre del producto debe tener al menos 2 caracteres"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("La descripción no puede exceder 1000 caracteres"),
  body("price").isFloat({ min: 0 }).withMessage("El precio debe ser un número positivo"),
  body("categoryId").isUUID().withMessage("ID de categoría válido requerido"),
  body("preparationTime")
    .optional()
    .isInt({ min: 1 })
    .withMessage("El tiempo de preparación debe ser un número entero positivo"),
  body("calories").optional().isInt({ min: 0 }).withMessage("Las calorías deben ser un número entero positivo"),
  body("stockQuantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("La cantidad en stock debe ser un número entero positivo"),
  handleValidationErrors,
]

const validateOrder = [
  body("items").isArray({ min: 1 }).withMessage("Al menos un item es requerido"),
  body("items.*.productId").isUUID().withMessage("ID de producto válido requerido"),
  body("items.*.quantity").isInt({ min: 1 }).withMessage("La cantidad debe ser un número entero positivo"),
  body("orderType").isIn(["dine_in", "takeaway", "delivery"]).withMessage("Tipo de orden inválido"),
  body("deliveryAddress")
    .if(body("orderType").equals("delivery"))
    .notEmpty()
    .withMessage("Dirección de entrega requerida para delivery"),
  handleValidationErrors,
]

module.exports = {
  validateRegister,
  validateLogin,
  validateProduct,
  validateOrder,
  handleValidationErrors,
}
