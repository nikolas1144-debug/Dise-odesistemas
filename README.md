# Aplicación de administración de bodega

Solución full stack para la gestión de inventario de una bodega corporativa. El frontend está
construido con **React + Vite** y el backend con **Node.js + Express** conectándose a **MongoDB**.
El sistema contempla tres roles de usuario:

- **Administrador**: control total, crea usuarios, registra productos, carga guías y gestiona
  asignaciones.
- **Encargado de bodega**: puede registrar productos, asignarlos/desasignarlos y consultar guías.
- **Visualizador de stock**: solo consulta inventario e historial de asignaciones.

## Características principales

- Autenticación mediante JWT y control de roles.
- Registro de productos comprados o en arriendo asociados a guías de despacho.
- Carga y descarga de guías de despacho almacenadas en el servidor.
- Historial detallado de asignaciones/desasignaciones indicando usuario, ubicación, fecha y quién
  ejecutó la acción.
- Integración simulada con Active Directory para validar cuentas corporativas.
- Interfaz React responsiva con formularios y tablas para administrar inventario.

## Requisitos previos

- Node.js 18+
- MongoDB 6+

## Configuración rápida

1. Clonar el repositorio y ubicarse en él.
2. Configurar variables de entorno:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   Ajusta `MONGODB_URI` y `JWT_SECRET` en `backend/.env` según tu entorno. Define `VITE_API_URL`
   (en desarrollo por defecto `http://localhost:4000/api`; en producción, si no se especifica,
   el frontend usará `https://dise-odesistemas1.onrender.com/api`).
3. Instalar dependencias (requiere acceso a npm):
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```
4. Crea el primer usuario de alguna de estas formas:
   - Ejecuta el seed incluido en el backend:
     ```bash
     cd backend
     npm run seed
     ```
     Esto generará un administrador por defecto (`admin@bodega.com` / `Admin123!`).
     Puedes personalizar nombre, correo y contraseña exportando las variables de entorno
     `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` antes de ejecutar el comando.
   - O bien realiza una petición `POST /api/auth/register` (sin cabecera `Authorization`). Ese
     primer usuario será administrador automáticamente. Para crear cuentas adicionales envía el
     token JWT de un admin en la cabecera `Authorization: Bearer <token>`.
5. Ejecutar los servicios en terminales separadas:
   ```bash
   # Backend
   cd backend
   npm run start

   # Frontend
   cd frontend
   npm run dev
   ```
6. Abrir `http://localhost:5173` en el navegador y autenticarte.

## Endpoints relevantes (backend)

- `POST /api/auth/register` – Crea usuarios. El primero queda como admin; los siguientes requieren
  token de administrador.
- `POST /api/auth/login` – Autenticación, retorna token JWT.
- `GET /api/products` – Lista de productos (requiere token válido).
- `POST /api/products` – Crea producto (roles ADMIN o MANAGER).
- `POST /api/products/:id/assign` – Asigna producto a usuario AD simulado.
- `POST /api/products/:id/unassign` – Libera producto.
- `GET /api/products/:id/assignments` – Historial de asignaciones.
- `POST /api/dispatch-guides` – Sube guía de despacho (archivo + metadatos).
- `GET /api/dispatch-guides` – Lista guías disponibles.
- `GET /api/dispatch-guides/:id/download` – Descarga archivo.
- `GET /api/ad/users` – Consulta usuarios del Active Directory simulado.

## Integración con Active Directory (simulada)

El archivo [`backend/src/services/activeDirectoryService.js`](backend/src/services/activeDirectoryService.js)
contiene una implementación mock que devuelve usuarios corporativos. Puedes inyectar otros
usuarios mediante la variable de entorno `AD_MOCK_USERS` (JSON) o extendiendo el servicio para
conectarse a LDAP/Microsoft Graph en un entorno real.

## Scripts útiles

- **Backend**
  - `npm run start` – Inicia el servidor Express en modo producción.
  - `npm run dev` – Inicia el servidor con recarga automática (requiere `nodemon`).
- **Frontend**
  - `npm run dev` – Arranca Vite con hot reload.
  - `npm run build` – Genera build de producción.

## Estructura del repositorio

```
backend/
  src/
    controllers/    # Lógica de negocio para auth, productos y guías
    middleware/     # Autenticación y autorización JWT
    models/         # Modelos Mongoose (User, Product, DispatchGuide, Assignment)
    routes/         # Definición de rutas Express
    services/       # Servicio simulado de Active Directory
    utils/          # Utilidades para hashing de contraseñas
  uploads/          # Carpeta donde se almacenan archivos de guías de despacho
frontend/
  src/
    api/            # Cliente fetch reutilizable
    components/     # Componentes UI reutilizables
    context/        # Contexto de autenticación
    pages/          # Vistas (Login, Dashboard)
    styles/         # Estilos globales
```

## Notas

- Al asignar o desasignar un producto el sistema crea un registro en la colección `assignments`
  indicando fecha, ubicación, usuario de Active Directory y quién ejecutó la acción.
- Los archivos de guías quedan disponibles mediante `/uploads/<archivo>` y protegidos por JWT
  cuando se descargan a través del endpoint dedicado.
- Para entornos sin conexión a Active Directory es posible mantener la lista mock y actualizarla
  desde la interfaz (`POST /api/ad/mock/sync`).
