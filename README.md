# 🌿 FamiCash - Backend REST API & PostgreSQL

Repositorio del backend para el sistema de finanzas familiares **FamiCash**.
Construido con **Node.js**, **Express** y **PostgreSQL**.

---

## 🗄️ Guía Paso a Paso para Configurar la Base de Datos en DBeaver

**DBeaver** es un cliente gráfico de base de datos. Para cargar la base de datos de FamiCash en DBeaver:

### Paso 1: Abrir DBeaver y Conectar a PostgreSQL
1. Abre **DBeaver** en tu computadora.
2. En la barra superior, haz clic en el icono de **"Nueva Conexión"** (el enchufe con un símbolo `+`) o presiona `Ctrl + N`.
3. Selecciona **PostgreSQL** y haz clic en **Siguiente**.
4. En la ventana de configuración de conexión:
   - **Host:** `localhost`
   - **Puerto:** `5432`
   - **Base de datos:** `postgres` (para conectarte inicialmente)
   - **Nombre de usuario:** `postgres`
   - **Contraseña:** *(Ingresa la contraseña que configuraste al instalar PostgreSQL)*
5. Haz clic en **"Probar Conexión"** para confirmar que conecta con éxito y luego clic en **Finalizar**.

---

### Paso 2: Crear la Base de Datos `famicash_db`
1. En el panel izquierdo de DBeaver ("Navegador de bases de datos"), expande tu conexión PostgreSQL.
2. Haz clic derecho sobre **"Bases de datos"** (o *Databases*).
3. Selecciona **"Crear nueva base de datos"** (o *Create New Database*).
4. Asigna el nombre:
   ```text
   famicash_db
   ```
5. Haz clic en **Aceptar**. Verás `famicash_db` en la lista.

---

### Paso 3: Inicializar la Base de Datos
Puedes hacerlo de dos formas:

#### Opción A (Automática mediante comando):
Ejecuta en la terminal del backend:
```bash
npm run setup-db
```
*Este comando crea la base de datos `famicash_db`, ejecuta `schema.sql` y carga `seed.sql` automáticamente.*

#### Opción B (Desde DBeaver):
1. Haz doble clic en la base de datos `famicash_db` para seleccionarla como activa.
2. Abre y ejecuta primero [schema.sql](file:///c:/Users/Sandro/Desktop/Famicash-Back/database/schema.sql) con `Alt + X` (para crear tablas, índices y triggers).
3. Abre y ejecuta después [seed.sql](file:///c:/Users/Sandro/Desktop/Famicash-Back/database/seed.sql) con `Alt + X` (para insertar los datos iniciales).

---

## 🚀 Cómo Iniciar el Backend

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Configura tu archivo `.env` con la contraseña de tu PostgreSQL:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=tu_contraseña_aqui
   DB_NAME=famicash_db
   ```

3. Inicia el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```

El servidor quedará disponible en:
```
http://localhost:5000/api
```

---

## 📡 Endpoints del CRUD

- `POST /api/auth/login` - Iniciar sesión
- `GET  /api/cuentas` - Listar cuentas y saldos
- `POST /api/cuentas` - Crear nueva cuenta
- `PUT  /api/cuentas/:id` - Actualizar cuenta
- `DELETE /api/cuentas/:id` - Eliminar cuenta
- `GET  /api/categorias` - Listar categorías
- `GET  /api/movimientos` - Listar gastos e ingresos
- `POST /api/movimientos` - Registrar movimiento y actualizar saldo
- `DELETE /api/movimientos/:id` - Eliminar movimiento y revertir saldo
- `GET  /api/resumen` - Métricas de balance general y presupuesto
