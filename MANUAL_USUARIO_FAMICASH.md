# 📘 Manual Funcional, Técnico y de Auditoría — FamiCash v2.0

**Proyecto:** Sistema de Gestión Financiera Familiar **FamiCash v2.0**  
**Integrantes del Hogar:** Anthony, Vanessa y Lara  
**Moneda y Zona Horaria:** Soles Peruanos (`S/`) · `America/Lima`  
**Arquitectura:** React + Vite (Frontend PC/Móvil) · Node.js + Express + Prisma ORM (Backend API) · PostgreSQL 18 (`bd_billetera`)

---

## 📑 Índice General

1. [Resumen Ejecutivo y Propósito del Sistema](#1-resumen-ejecutivo-y-propósito-del-sistema)
2. [Diferencia entre Usuarios de Base de Datos e Integrantes del Hogar](#2-diferencia-entre-usuarios-de-base-de-datos-e-integrantes-del-hogar)
3. [Módulo 1: Resumen General (Dashboard y Balance del Hogar)](#3-módulo-1-resumen-general-dashboard-y-balance-del-hogar)
4. [Módulo 2: Anotar Movimiento (Flujo Ordenado 1 ➔ 2 ➔ 3 + Buscador Instantáneo)](#4-módulo-2-anotar-movimiento-flujo-ordenado-1--2--3--buscador-instantáneo)
5. [Módulo 3: Filtros en Cascada Colapsables y Gráficos Dinámicos](#5-módulo-3-filtros-en-cascada-colapsables-y-gráficos-dinámicos)
6. [Módulo 4: Topes de Presupuesto con Semáforo Inteligente](#6-módulo-4-topes-de-presupuesto-con-semáforo-inteligente)
7. [Módulo 5: Metas de Ahorro, Abonos, Retiros/Ajustes y Auditoría en BD (Detalle Especial)](#7-módulo-5-metas-de-ahorro-abonos-retirosajustes-y-auditoría-en-bd-detalle-especial)
8. [Módulo 6: Escalonado de Carpetas (Áreas ➔ Rubros ➔ Conceptos) y Excel (.xlsx)](#8-módulo-6-escalonado-de-carpetas-áreas--rubros--conceptos-y-excel-xlsx)
9. [Catálogo Completo de Historias de Usuario (HU)](#9-catálogo-completo-de-historias-de-usuario-hu)
10. [Configuración de Variables de Entorno (`.env`) y Credenciales](#10-configuración-de-variables-de-entorno-env-y-credenciales)

---

## 1. Resumen Ejecutivo y Propósito del Sistema

**FamiCash v2.0** es una plataforma web y móvil diseñada para llevar el control exacto de los **Ingresos (`💰`)**, **Gastos (`💸`)** y **Ahorros (`🐷`)** del hogar conformado por **Anthony, Vanessa y su hija Lara**.

El sistema combina dos mundos sin fricción:
1. **Uso diario ultrarrápido desde el celular o PC**: Nombres humanos amigables con íconos visuales, buscador instantáneo, secciones colapsables para no saturar la pantalla y ventanas emergentes (popups) intuitivas.
2. **Compatibilidad 100% exacta con el Cuadro Excel Familiar (`.xlsx`)**: Internamente conserva los códigos oficiales (`I_INGRESOS`, `II_GENERALES`, `_6_ALIMENTACION`, etc.), exporta las 10 columnas exactas para tablas dinámicas e incluye una **Plantilla Guía descargable (`.xlsx`)** para importar históricos sin duplicados.

---

## 2. Diferencia entre Usuarios de Base de Datos e Integrantes del Hogar

Para entender cómo se asignan los gastos, medios de pago y metas de ahorro, el sistema distingue claramente entre **Cuentas de Usuario (Login)** e **Integrantes / Destinatarios (`Persona`)**:

| Concepto | ¿Dónde vive en la BD? | ¿Quiénes son? | ¿Para qué sirve? |
| :--- | :--- | :--- | :--- |
| **1. Usuarios del Sistema (Cuentas de Login)** | Tabla `usuarios` | **1. Anthony** (`anthony@famicash.pe`)<br>**2. Vanessa** (`vanessa@famicash.pe`) | Son los dos adultos que inician sesión en la aplicación. Cada vez que registran un gasto o hacen un **abono/ajuste** en una meta, su `usuario.id` queda grabado en el campo `creado_por` para **auditoría**. |
| **2. Integrante / Destinatario (`Persona`)** | Enum `Persona` (`FAMILIA`, `ANTHONY`, `VANESSA`, `LARA`) | **🏠 Familiar (Ambos)**<br>**👨 Anthony**<br>**👩 Vanessa**<br>**👧 Lara (Hija)** | Indica **a quién corresponde** un gasto, una cuenta o una meta de ahorro. **Lara** no tiene correo ni contraseña en la tabla `usuarios` porque es niña, pero sus padres registran sus gastos escolares/salud y administran metas de ahorro para su futuro. |

---

## 3. Módulo 1: Resumen General (Dashboard y Balance del Hogar)

Al ingresar a la vista **Resumen**, el sistema presenta el estado financiero del periodo activo (**Mensual**, **Trimestral** o **Anual**):

1. **Tarjetas de Balance Principal**:
   - **Disponible del Mes (`Ingresos − Gastos − Ahorros`)**: Muestra cuánto dinero libre queda en el periodo y el porcentaje de variación frente al periodo anterior.
   - **Ingresos (`💰`)**, **Gastos (`💸`)** y **Ahorros (`🐷`)**: Cada tarjeta incluye su comparativa porcentual contra el mes/trimestre/año previo.
2. **Gráfico de Dona Interactiva (`¿En qué se va el dinero?`)**:
   - Muestra el reparto porcentual y en Soles (`S/`) por cada **Área Familiar**.
   - Al tocar cualquier área, navega automáticamente al desglose detallado de sus rubros.
3. **Últimos Movimientos con Acciones Directas**:
   - Lista los registros más recientes del periodo con botones para **Editar (`✏️`)** o **Eliminar (`🗑️`)** mediante un popup de confirmación seguro.

---

## 4. Módulo 2: Anotar Movimiento (Flujo Ordenado 1 ➔ 2 ➔ 3 + Buscador Instantáneo)

La pantalla **Anotar** ([`VistaRegistro.jsx`](file:///D:/FamiliCash/Famicash-Front/frontend/src/components/VistaRegistro.jsx)) fue rediseñada para eliminar cualquier confusión de "rubros sueltos" y seguir estrictamente la jerarquía lógica de carpetas:

```
1. Área Familiar  ➔  2. Rubro (Subcategoría)  ➔  3. Concepto Específico (Detalle)
```

### 4.1. Buscador Instantáneo Global (Parte Superior)
- En la parte superior hay una barra de búsqueda: **`🔍 ¿Buscas rápido un rubro o concepto? Escribe aquí...`**
- Busca en tiempo real entre **todas las Áreas, Rubros y Conceptos** de la base de datos — **incluyendo cualquier área, rubro o concepto nuevo que acabes de crear**.
- Al tocar un resultado (ej. `🏠 Hogar y Familia ➔ 💡 Servicios ➔ 📄 Luz`), el sistema selecciona automáticamente los 3 niveles y lleva el cursor directo al monto en Soles (`S/`).

### 4.2. Secuencia Paso a Paso (con Secciones Colapsables y Creación en el Sitio)
Cada uno de los pasos muestra en su cabecera qué opción está seleccionada y tiene un botón **`▲ / ▼`** para contraer o desplegar la sección si deseas ahorrar espacio en la pantalla:

1. **Paso `1` — Escoge el Área Familiar**:
   - Muestra todas las áreas registradas (`💰 Ingresos`, `🏠 Hogar y Familia`, `👧 Lara`, `👩 Vanessa`, `👨 Anthony`, `🐷 Ahorros` y cualquier área nueva).
   - Incluye el botón **`+ Nueva Área`** para crear una nueva carpeta principal sin salir de la pantalla.
2. **Paso `2` — Escoge el Rubro del Área Seleccionada**:
   - Muestra **únicamente los rubros que pertenecen al Área Familiar elegida en el Paso 1** (incluyendo los nuevos rubros creados).
   - Si el área tiene varios rubros, incluye un buscador interno (`Filtrar rubros...`) y el botón **`+ Nuevo Rubro`** para agregar uno al instante.
3. **Paso `3` — Escoge el Concepto del Rubro Seleccionado**:
   - Muestra todos los conceptos específicos dentro de ese rubro (ej. *Alimentos, Restaurantes, Gasolina, Luz*) y el botón **`+ Nuevo Concepto`**.
4. **Cuadro de Resumen de Ruta + Fecha (`📅 Fecha: Hoy`)**:
   - Muestra la ruta exacta que se va a guardar (`🏠 Hogar y Familia ➔ 🍽️ Alimentación ➔ 📄 Restaurantes`) y permite cambiar la fecha si estás anotando un movimiento de días anteriores.
5. **Paso `4` — ¿Con qué medio de pago fue?**:
   - Selección rápida de cuenta o tarjeta (*Tarjeta Vanessa, Yape/Plin Vanessa, Tarjeta Anthony, Yape/Plin Anthony, Cuenta BCP, Efectivo*).
6. **Paso `5` — ¿Cuánto dinero fue? (`S/`) + Nota + Botón de Confirmación**:
   - Campo numérico grande en Soles (`S/`), botones rápidos de billetes (`+S/ 10`, `+S/ 20`, `+S/ 50`, `+S/ 100`, `+S/ 200`), teclado en pantalla opcional y mensajes de confirmación justo encima del botón de guardado.

---

## 5. Módulo 3: Filtros en Cascada Colapsables y Gráficos Dinámicos

En las vistas **Resumen** y **Gráficos**, el botón **`Filtros`** despliega el panel de segmentadores ([`SegmentadoresFiltro.jsx`](file:///D:/FamiliCash/Famicash-Front/frontend/src/components/SegmentadoresFiltro.jsx)):

### 5.1. Secciones Colapsables a Voluntad
Para evitar que los filtros ocupen toda la pantalla (especialmente en el celular):
- **Cada bloque tiene su propio encabezado desplegable (`▼ / ▶`)**:
  - **`1. Área Familiar`** (muestra cuántas áreas están marcadas o `Todas`).
  - **`2. Rubro`** (se filtra en cascada según el Área elegida e incluye buscador interno).
  - **`3. Concepto específico`** (se filtra en cascada según el Rubro elegido e incluye buscador interno).
  - **`4. Medio de pago`** (permite filtrar por tarjeta, Yape/Plin, BCP o efectivo).
- **Botón global `Contraer secciones` / `Desplegar secciones`**: Permite plegar o abrir las 4 cajas simultáneamente con un solo toque.
- **En modo móvil (`< 960px`)**: Las cajas `2. Rubro`, `3. Concepto` y `4. Medio de pago` inician contraídas por defecto para dejar visibles los gráficos, pudiendo abrirse cualquiera a voluntad.

---

## 6. Módulo 4: Topes de Presupuesto con Semáforo Inteligente

La vista **Topes** ([`VistaPresupuestos.jsx`](file:///D:/FamiliCash/Famicash-Front/frontend/src/components/VistaPresupuestos.jsx)) permite fijar un límite de gasto para cada Área Familiar o Rubro (por Mes, Trimestre o Año) y compara automáticamente el **Monto Presupuestado** contra el **Gasto Real Ejecutado**:

- 🟢 **Verde (`< 80%`)**: Gasto controlado dentro del presupuesto.
- 🟡 **Amarillo (`80% – 100%`)**: Alerta preventiva; el rubro está próximo a alcanzar su tope.
- 🔴 **Rojo (`> 100%`)**: Presupuesto excedido; muestra el monto exacto de sobregiro en Soles.
- Incluye el botón **`Copiar del periodo anterior`** para no tener que digitar los presupuestos desde cero cada mes.

---

## 7. Módulo 5: Metas de Ahorro, Abonos, Retiros/Ajustes y Auditoría en BD (Detalle Especial)

Este módulo ([`VistaObjetivos.jsx`](file:///D:/FamiliCash/Famicash-Front/frontend/src/components/VistaObjetivos.jsx) + [`objetivos.routes.js`](file:///D:/FamiliCash/Famicash-Back/src/features/objetivos/objetivos.routes.js)) funciona como un sistema de **Alcancías Familiares Auditadas**. A continuación se detalla paso a paso su funcionamiento interno y operativo:

### 7.1. ¿Cómo se estructura cada Tarjeta de Meta de Ahorro?
Cada meta creada muestra **3 indicadores financieros directos** y su barra de avance porcentual:
1. **Llevamos ahorrado (`S/`)**: El dinero total acumulado hasta hoy en esa meta.
2. **Nos falta juntar (`S/`)**: La resta automática (`Meta Total − Ahorrado Actual`). Cuando llega a `0`, muestra **`¡Meta lograda! 🎉`**.
3. **Meta total (`S/`)**: El objetivo final que se propusieron alcanzar.

---

### 7.2. Cómo Crear una Meta y Crear tus Propios "Tipos de Meta"
Al pulsar **`+ Crear Nueva Meta`**, se abre una ventana emergente con 6 pasos claros:
1. **Nombre de la meta**: Para qué están ahorrando (ej. *Viaje a Cusco, Fondo de Emergencia, Inicial del Departamento, Laptop nueva*).
2. **Tipo de meta (Predefinido o Personalizado)**:
   - Puedes elegir con 1 clic uno de los tipos base (`🛡️ Fondo de emergencia`, `✈️ Vacaciones`, `🎓 Educación`, `🏠 Vivienda`, `🚗 Compra / Proyecto`).
   - **Crear un nuevo tipo de meta**: Al pulsar el botón **`+ Crear nuevo tipo de meta`**, se abre un campo donde puedes escribir cualquier categoría nueva (ej. *Salud, Inversión, Boda, Fiesta de Lara*). Al pulsar **`Usar este tipo`**, se agrega inmediatamente como botón seleccionable y se guarda en la base de datos para futuras metas.
3. **¿Cuánto quieren juntar en total? (`S/`)**: Monto objetivo (ej. `S/ 10,000`).
4. **¿Cuánto tienen guardado hoy? (`S/`)**: Saldo base con el que arranca la alcancía (puede ser `0` o un monto que ya tenían ahorrado antes de usar la app).
5. **¿De qué usuario o integrante es la meta?**:
   - Conecta con los usuarios reales de la tabla `usuarios` y los miembros del hogar:
     - `🏠 Familiar Compartida (Anthony y Vanessa)`
     - `👨 Usuario: Anthony (anthony@famicash.pe)`
     - `👩 Usuaria: Vanessa (vanessa@famicash.pe)`
     - `👧 Para Lara (Hija · administrado por ambos padres)`
6. **Fecha objetivo (Opcional)**: Fecha estimada en la que desean cumplir la meta.

---

### 7.3. Cómo Funcionan los Botones `+ Abonar dinero` y `Retirar / Ajustar`
Dentro de cada tarjeta de meta hay dos botones de operación directa:

#### A) Botón Verde `+ Abonar dinero` (Sumar plata a la meta)
Cuando separas dinero para esa meta y pulsas **`+ Abonar dinero`**, se abre el popup de depósito auditado:
1. **Monto a abonar (`S/`)**: Puedes escribir el monto o tocar los botones rápidos (`+S/ 50`, `+S/ 100`, `+S/ 200`, `+S/ 500`, `+S/ 1000`).
2. **¿Con qué cuenta o medio de pago?**: Seleccionas de dónde salió o dónde se depositó el dinero (*Cuenta BCP, Yape/Plin Vanessa, Yape/Plin Anthony, Efectivo, etc.*).
3. **Fecha del movimiento**: Por defecto hoy (`Hoy`), editable a cualquier fecha.
4. **Nota para la auditoría (Opcional)**: Ej. *"Aporte quincena Noviembre"* o *"Abono gratificación"*.

#### B) Botón `Retirar / Ajustar` (Descontar plata de la meta)
Si tuvieron que usar parte del ahorro de esa alcancía o desean corregir un monto hacia abajo, al pulsar **`Retirar / Ajustar`**:
1. Ingresas cuánto dinero se va a descontar (`S/`).
2. Indicas la cuenta/medio de pago, fecha y el motivo del retiro/ajuste (ej. *"Adelanto de pasajes aéreos"* o *"Ajuste de saldo"*).

---

### 7.4. ¿Cómo Funciona la Auditoría Interna en la Base de Datos?
Cada vez que confirmas un **Abono** o un **Retiro / Ajuste** en una meta (`POST /api/objetivos/:id/movimiento`), el backend ejecuta una **transacción atómica (`prisma.$transaction`)** que hace dos cosas al mismo tiempo en PostgreSQL:

1. **Actualiza el saldo acumulado de la meta** en la tabla `objetivos_ahorro`.
2. **Inserta un registro inmutable de auditoría en la tabla `transacciones`** con los siguientes datos:
   - `tipo`: `'AHORRO'`
   - `fecha`: Fecha exacta de la operación.
   - `monto`: Monto abonado o retirado en Soles (`S/`).
   - `creado_por` (`creadoPorId`): El `id` del usuario de la tabla `usuarios` que tenía la sesión iniciada (**Anthony** o **Vanessa**).
   - `medio_pago_id` y `medio_pago_nombre`: La cuenta o tarjeta utilizada (ej. `CUENTA BCP`).
   - `detalle_nombre`: El nombre de la meta (ej. `Viaje Familiar a Punta Cana`).
   - `observaciones`: Etiqueta estructurada de auditoría `[META:ID] [ABONO] <Nota>` o `[META:ID] [RETIRO] <Nota>`.

### 7.5. Cómo Consultar la Bitácora de Auditoría (`📜 Auditoría (X)`)
- En la esquina inferior derecha de cada tarjeta de meta aparece el botón **`📜 Auditoría (X)`** (donde `X` es el número de movimientos registrados en esa meta).
- Al hacer clic en **`📜 Auditoría`**, se despliega dentro de la misma tarjeta la **Bitácora de Auditoría en BD**, mostrando fila por fila:
  - **Etiqueta de operación**: `+ Abono` (en verde) o `− Retiro` (en rojo).
  - **Nota / Concepto**: Descripción del aporte o retiro.
  - **Fecha exacta**: `📅 YYYY-MM-DD`.
  - **Usuario auditor**: `👤 Por: Anthony` o `👤 Por: Vanessa` (extraído de la relación con la tabla `usuarios`).
  - **Medio de pago**: `💳 Cuenta BCP`, `Yape / Plin`, etc.
  - **Monto**: `+ S/ 200.00` o `- S/ 150.00`.
- Además, al estar guardado en la tabla `transacciones`, también queda respaldado cuando exportas tu archivo **Excel (`.xlsx`)**.

---

## 8. Módulo 6: Escalonado de Carpetas (`Áreas ➔ Rubros ➔ Conceptos`) y Excel (`.xlsx`)

En la vista **Excel y Ajustes** ([`VistaAdminTaxonomia.jsx`](file:///D:/FamiliCash/Famicash-Front/frontend/src/components/VistaAdminTaxonomia.jsx)) tienes 3 pestañas de administración total:

### 8.1. Pestaña 1: `📁 Carpetas: Áreas, Rubros y Conceptos` (Diseño Escalonado)
Muestra toda la estructura del hogar como un **explorador de carpetas en cascada de 3 escalones**:
- **📁 Escalón 1 — Carpeta de Área Familiar (`Categoría`)**:
  - Muestra el nombre amigable, color, cantidad de rubros, código de Excel y responsable.
  - Botones directos en la carpeta: **`+ Nuevo Rubro`** (abre popup modal), **`✏️ Editar`** y **`🗑️ Eliminar / Archivar`**.
- **📂 Escalón 2 — Subcarpeta Indentada de Rubro (`Subcategoría`)**:
  - Al abrir un Área Familiar, se despliegan debajo sus Rubros con sangría y línea guía (`├─`).
  - Botones directos en cada Rubro: **`+ Nuevo Concepto`** (abre popup modal), **`✏️ Editar`** y **`🗑️ Eliminar / Archivar`**.
- **📄 Escalón 3 — Ítems Doblemente Indentados de Conceptos (`Detalles`)**:
  - Al abrir un Rubro, se despliegan sus conceptos específicos (`├─ 📄` / `└─ 📄`) con una barra rápida para agregar conceptos en línea o mediante popup modal, además de sus botones **`✏️ Editar`** y **`🗑️ Eliminar`**.
- **Protección de Historial (Borrado Seguro)**:
  - Si intentas eliminar un Área, Rubro, Concepto o Medio de Pago que ya tiene movimientos históricos registrados, el sistema **no rompe la base de datos ni borra tus reportes**: lo archiva automáticamente (`activa: false`) y te avisa con un mensaje claro.

### 8.2. Pestaña 2: `Descargar o Subir Excel (.xlsx)` + Plantilla Guía Oficial
1. **Descargar tu cuadro en Excel (`.xlsx`)**:
   - Genera el archivo `.xlsx` con las **10 columnas oficiales**:
     `Año | Mes | Día | Fecha | Categoría | Subcategoría | Detalle | Monto S/ | Medio de pago | Observaciones`
   - Conserva el mes `9` como **`"Set"`**, formato contable en Soles y autofiltros activados.
2. **Botón `Descargar Plantilla Guía (.xlsx)`**:
   - Ubicado al lado del título **Subir tu Excel Histórico (`.xlsx`)**.
   - Descarga el archivo `Plantilla_FamiCash_Importacion.xlsx` con **2 hojas**:
     - **Hoja 1 (`Plantilla_Importar`)**: Las 10 columnas listas con el diseño oficial y 5 filas de ejemplo reales para que sepas exactamente cómo llenarla.
     - **Hoja 2 (`Catalogo_Valido_Guia`)**: La lista completa de todas tus Áreas, Rubros, Conceptos y Medios de Pago válidos actuales.
3. **Subir Excel Histórico con Vista Previa Anti-Duplicados**:
   - Al elegir tu archivo `.xlsx`, primero analiza las filas sin guardar nada y te muestra: **Filas leídas**, **Nuevas a importar**, **Duplicadas omitidas** y una tabla de vista previa.
   - Al pulsar **`Confirmar e Importar`**, inserta únicamente los movimientos nuevos.

---

## 9. Catálogo Completo de Historias de Usuario (HU)

| Código | Historia de Usuario | Estado |
| :--- | :--- | :---: |
| **HU-01** | **Como** integrante del hogar, **quiero** registrar un gasto, ingreso o ahorro siguiendo el orden `1. Área ➔ 2. Rubro ➔ 3. Concepto` o usando el buscador instantáneo, **para** anotar cualquier movimiento en segundos sin confundirme. | ✅ Cumplido |
| **HU-02** | **Como** usuario en celular o PC, **quiero** poder contraer y desplegar a voluntad cada sección de los **Filtros** (`Área`, `Rubro`, `Concepto`, `Medio de pago`) y de **Anotar**, **para** que no ocupen espacio innecesario en mi pantalla. | ✅ Cumplido |
| **HU-03** | **Como** administrador familiar, **quiero** gestionar mis **Áreas, Rubros y Conceptos** en un diseño **escalonado de carpetas desplegables** con ventanas emergentes (popups) para crear, editar y eliminar en los 3 niveles, **para** adaptar el catálogo a las necesidades de mi familia. | ✅ Cumplido |
| **HU-04** | **Como** usuario, **quiero** crear **Metas de Ahorro** pudiendo inventar mis propios **Tipos de Meta**, asignarlas a un usuario de la BD (`Anthony`, `Vanessa`), al hogar (`Familiar`) o a nuestra hija (`Lara`), y registrar **Abonos o Retiros/Ajustes** que dejen una **bitácora de auditoría en la base de datos**, **para** saber exactamente quién abonó, cuándo y desde qué cuenta. | ✅ Cumplido |
| **HU-05** | **Como** dueño de mis datos en Excel, **quiero** descargar una **Plantilla Guía (`.xlsx`)**, importar mi Excel histórico sin duplicar filas y exportar mis movimientos en cualquier momento con las 10 columnas oficiales, **para** mantener compatibilidad total con mis tablas dinámicas. | ✅ Cumplido |

---

## 10. Configuración de Variables de Entorno (`.env`) y Credenciales

### 10.1. Archivos `.env` Configurados
- **Frontend ([`Famicash-Front/frontend/.env`](file:///D:/FamiliCash/Famicash-Front/frontend/.env))**:
  ```env
  VITE_API_URL=http://localhost:5000/api
  ```
- **Backend ([`Famicash-Back/.env`](file:///D:/FamiliCash/Famicash-Back/.env))**:
  ```env
  PORT=5000
  NODE_ENV=development
  DATABASE_URL="postgresql://postgres:123456@localhost:5432/bd_billetera?schema=public"
  FRONTEND_ORIGIN="http://localhost:5173"
  ```

### 10.2. Usuarios de Acceso en la Base de Datos (`usuarios`)
| Usuario | Correo | Contraseña | Rol en el Hogar |
| :--- | :--- | :--- | :--- |
| **Anthony** | `anthony@famicash.pe` | `famicash123` | Esposo / Padre (`ANTHONY`) |
| **Vanessa** | `vanessa@famicash.pe` | `famicash123` | Esposa / Madre (`VANESSA`) |
