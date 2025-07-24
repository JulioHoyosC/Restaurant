# E-commerce Backend para Restaurante

Backend completo desarrollado con Node.js, Express.js y PostgreSQL para un sistema de e-commerce de restaurante.

## 🚀 Características

### Tecnologías Utilizadas
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Base de datos relacional
- **JWT** - Autenticación y autorización
- **Socket.io** - Comunicación en tiempo real
- **bcryptjs** - Hash de contraseñas
- **express-validator** - Validación de datos

### Funcionalidades Implementadas

#### ✅ CRUD Completo
- **Usuarios**: Registro, login, actualización de perfil
- **Productos**: Gestión completa del menú
- **Categorías**: Organización de productos
- **Órdenes**: Sistema completo de pedidos
- **Mesas**: Gestión de mesas y reservas

#### ✅ Autenticación y Autorización
- Registro y login de usuarios
- Hash seguro de contraseñas con bcrypt
- Tokens JWT para autenticación
- Roles de usuario (customer, staff, admin)
- Middleware de autorización

#### ✅ WebSockets en Tiempo Real
- Notificaciones de nuevas órdenes
- Actualizaciones de estado en tiempo real
- Chat de soporte cliente-staff
- Notificaciones de cocina

#### ✅ Validación de Datos
- Validación completa de entrada
- Sanitización de datos
- Manejo de errores robusto

#### ✅ Seguridad
- Helmet para headers de seguridad
- Rate limiting
- CORS configurado
- Validación de entrada
- Protección contra inyección SQL

## 📁 Estructura del Proyecto

\`\`\`
restaurant-ecommerce-backend/
├── config/
│   └── database.js          # Configuración de PostgreSQL
├── middleware/
│   ├── auth.js             # Middleware de autenticación
│   └── validation.js       # Validaciones
├── models/
│   ├── User.js             # Modelo de usuario
│   ├── Product.js          # Modelo de producto
│   └── Order.js            # Modelo de orden
├── routes/
│   ├── auth.js             # Rutas de autenticación
│   ├── users.js            # Rutas de usuarios
│   ├── products.js         # Rutas de productos
│   ├── orders.js           # Rutas de órdenes
│   ├── categories.js       # Rutas de categorías
│   └── tables.js           # Rutas de mesas
├── sockets/
│   └── socketHandler.js    # Manejo de WebSockets
├── scripts/
│   ├── create_database.sql # Script de creación de BD
│   └── seed_data.sql       # Datos de ejemplo
├── server.js               # Servidor principal
└── package.json
\`\`\`

## 🛠️ Instalación y Configuración

### 1. Clonar el repositorio
\`\`\`bash
git clone <repository-url>
cd restaurant-ecommerce-backend
\`\`\`

### 2. Instalar dependencias
\`\`\`bash
npm install
\`\`\`

### 3. Configurar PostgreSQL
1. Instalar PostgreSQL y pgAdmin
2. Crear base de datos `restaurant_ecommerce`
3. Ejecutar scripts SQL en orden:
   - `scripts/create_database.sql`
   - `scripts/seed_data.sql`
   "Todo esto se encuentra en la carpta scripts"

### 4. Configurar variables de entorno
Crear archivo `.env` con:
\`\`\`env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432(este se usa normalmente o mejor dicho viene predeterminado)
DB_NAME=Restaurant
DB_USER=postgres
DB_PASSWORD=tu_password

JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_EXPIRE=7d
\`\`\`

### 5. Ejecutar el servidor
\`\`\`bash
# Desarrollo
npm run dev

# Producción
npm start
\`\`\`

## 📚 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Obtener perfil
- `GET /api/auth/verify` - Verificar token

### Productos
- `GET /api/products` - Listar productos
- `GET /api/products/:id` - Obtener producto
- `POST /api/products` - Crear producto (admin)
- `PUT /api/products/:id` - Actualizar producto (admin)
- `DELETE /api/products/:id` - Eliminar producto (admin)

### Órdenes
- `POST /api/orders` - Crear orden
- `GET /api/orders/my-orders` - Órdenes del usuario
- `GET /api/orders` - Todas las órdenes (staff)
- `GET /api/orders/:id` - Obtener orden
- `PATCH /api/orders/:id/status` - Actualizar estado (staff)
- `PATCH /api/orders/:id/cancel` - Cancelar orden

### Categorías
- `GET /api/categories` - Listar categorías
- `POST /api/categories` - Crear categoría (admin)
- `PUT /api/categories/:id` - Actualizar categoría (admin)
- `DELETE /api/categories/:id` - Eliminar categoría (admin)

### Mesas
- `GET /api/tables/available` - Mesas disponibles
- `GET /api/tables` - Todas las mesas (staff)
- `POST /api/tables` - Crear mesa (staff)
- `POST /api/tables/:id/reserve` - Hacer reserva

## 🔌 WebSocket Events

### Cliente → Servidor
- `order_created` - Nueva orden creada
- `join_table` - Unirse a mesa
- `support_message` - Mensaje de soporte

### Servidor → Cliente
- `new_order` - Notificación de nueva orden (staff)
- `order_status_changed` - Cambio de estado de orden
- `support_response` - Respuesta de soporte
- `kitchen_status` - Estado de cocina

## 🧪 Testing

\`\`\`bash
npm test
\`\`\`

## 📊 Base de Datos

### Tablas Principales
- `users` - Usuarios del sistema
- `categories` - Categorías de productos
- `products` - Productos/platos del menú
- `tables` - Mesas del restaurante
- `orders` - Órdenes de clientes
- `order_items` - Items de cada orden
- `reservations` - Reservas de mesas

### Características de la BD
- Uso de UUIDs como claves primarias
- Índices optimizados para consultas frecuentes
- Triggers para actualización automática de timestamps
- Constraints para integridad de datos
- Soporte para transacciones

## 🔒 Seguridad Implementada

- **Autenticación JWT** con expiración
- **Hash de contraseñas** con bcrypt (salt rounds: 10)
- **Rate limiting** (100 requests/15min)
- **Helmet** para headers de seguridad
- **CORS** configurado
- **Validación de entrada** en todas las rutas
- **Sanitización de datos**
- **Protección contra inyección SQL** con queries parametrizadas

## 🚀 Despliegue

### Variables de Entorno para Producción
\`\`\`env
NODE_ENV=production
PORT=5000
DB_HOST=tu_host_postgresql
DB_NAME=Restaurant
DB_USER=tu_usuario
DB_PASSWORD=tu_password_seguro
JWT_SECRET=jwt_secret_muy_seguro_para_produccion
\`\`\`

### Comandos de Despliegue
\`\`\`bash
# Instalar dependencias de producción
npm ci --only=production

# Ejecutar migraciones
npm run migrate

# Iniciar servidor
npm start
\`\`\`

## 📈 Escalabilidad

El backend está diseñado para ser escalable:
- **Conexión pooling** con PostgreSQL
- **Transacciones** para operaciones críticas
- **Índices optimizados** en la base de datos
- **Middleware de compresión**
- **Logging estructurado**
- **Manejo de errores centralizado**

## 👨‍💻 Autor

Desarrollado como proyecto académico para demostrar competencias en desarrollo backend con Node.js y PostgreSQL.
---
