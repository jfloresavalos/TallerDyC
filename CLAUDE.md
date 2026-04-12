# TallerDyC — Sistema de Gestión de Taller Mecánico

## Descripción
Sistema web para gestionar el flujo operativo de un taller mecánico: registro de vehículos, asignación de servicios a mecánicos, seguimiento de estados y reportes de ingresos. Soporte multi-sede con 3 roles de usuario.

## Stack Tecnológico
- **Frontend**: Next.js 15.2.4, React 19, Tailwind CSS 4, shadcn/ui (Radix UI)
- **Backend**: Next.js Server Actions, NextAuth v4 (JWT + CredentialsProvider)
- **Base de datos**: PostgreSQL + Prisma 6.19.2
- **Validación**: Zod + React Hook Form
- **Seguridad**: bcryptjs (hash contraseñas, 10 rounds)
- **Package manager**: **pnpm** (usar siempre pnpm, no npm)
- **Íconos**: lucide-react
- **Fechas**: date-fns
- **Toasts**: sonner

## Estructura del Proyecto
```
app/
├── (auth)/login/         # Login público
├── (dashboard)/          # Rutas protegidas
│   ├── layout.tsx        # Sidebar + validación sesión
│   ├── dashboard/        # KPIs — solo ADMIN
│   ├── taller/           # Autos activos, registrar, asignar
│   ├── mis-autos/        # Servicios asignados — solo MECHANIC
│   ├── certificar/       # Cola de certificación — solo CERTIFIER
│   ├── clientes/         # Listado y detalle por DNI — ADMIN
│   │   └── [dni]/        # Detalle del cliente (tabs: Vehículos/Servicios/Compras)
│   ├── reportes/         # Servicios e ingresos — solo ADMIN
│   ├── ventas/           # Ventas de mostrador — ADMIN/RECEPTIONIST
│   ├── inventario/       # Productos y repuestos — ADMIN
│   └── configuracion/    # Usuarios, sedes, marcas, servicios, empresa — solo ADMIN
│       ├── usuarios/
│       └── servicios/    # Tipos de servicio con color
├── api/auth/[...nextauth]/ # Endpoint NextAuth
components/
├── ui/                   # Primitivas shadcn/ui
├── taller/               # Componentes de dominio
│   ├── active-vehicles.tsx         # Tablero admin + CheckoutDialog
│   ├── my-assigned-vehicles.tsx    # Vista mecánico: trabajos + disponibles
│   ├── checkout-dialog.tsx         # Cobro con pago mixto
│   ├── certification-queue.tsx     # Vista certificador
│   ├── client-list.tsx             # Búsqueda unificada + Nuevo Cliente
│   ├── client-detail.tsx           # Detalle con tabs: vehículos/servicios/compras
│   ├── sales-client.tsx            # Listado ventas con filtros y dialog detalle
│   ├── new-sale-dialog.tsx         # Dialog nueva venta: carrito + cliente + pago
│   ├── service-types-client.tsx    # CRUD tipos de servicio con paleta de color
│   └── inventory-client.tsx        # CRUD inventario productos
└── sidebar-menu.tsx      # Menú lateral responsivo
lib/
├── auth.ts               # Configuración NextAuth
├── prisma.ts             # Singleton Prisma
├── utils.ts              # cn()
└── actions/              # Server Actions
    ├── vehicles.ts
    ├── services.ts
    ├── users.ts
    ├── clients.ts        # + upsertClientContact + searchClientQuick (3 fuentes)
    ├── sales.ts          # + getSalesToday
    ├── products.ts
    ├── service-types.ts  # + updateServiceTypeColor
    ├── certifications.ts # NUEVO
    ├── brands.ts
    └── company.ts
prisma/
├── schema.prisma
├── seed.ts               # Seed inicial (admin, sedes, etc.)
├── seed-brands.ts        # Seed de marcas de autos
└── seed-demo.js          # Seed demo con 12 vehículos (4 tipos) para testing
scripts/
└── seed-demo.js          # (alias) Seed rápido para demos y e2e
```

## Base de Datos

### Modelos
- **User**: id, username (único), name, password (hash), role, branchId?, active
- **Branch**: id, name, code (único), address?, phone?, active
- **Vehicle**: id, plate, brand, model, year, clientName, clientPhone, clientDNI, entryTime, exitTime?, status, arrivalOrder, entryType ("DIRECT"|"DIAGNOSTIC"), visitType ("general"|"garantia"|"revision"|"venta"), branchId, totalAmount?, discount?, voucherType?, clientRuc?, clientBusinessName?, paymentMethod1/2?, paymentAmount1/2?, checkoutNotes?
- **Service**: id, vehicleId, serviceType, description, mechanicId?, coMechanicId?, startTime, completionTime?, status, correctionRequested, correctionReason?, price?, discount?, items ServiceItem[], certifiedAt?, certifiedById?
- **ServiceItem**: id, serviceId, productId, quantity, unitPrice, subtotal, discount?, createdAt — `onDelete: Cascade`
- **Product**: id, name, code?, description?, unit, price, cost?, stock, minStock, category?, brand?, branchId?, active, serviceItems ServiceItem[], saleItems SaleItem[]
- **Sale**: id, saleNumber (único), clientName?, clientDNI?, clientPhone?, total, paymentMethod1?, paymentAmount1?, paymentMethod2?, paymentAmount2?, branchId, createdById, items SaleItem[], createdAt
- **SaleItem**: id, saleId, productId, quantity, unitPrice, subtotal
- **ServiceType**: id, name (único), color String? (hex), active
- **ClientContact**: id, name, dni (único), phone?, notes?, createdAt, updatedAt — registro manual de clientes
- **Company**: id, name, ruc?, address?, phone?, email?, logo?
- **CarBrand**: id, name (único), active, models CarModel[]
- **CarModel**: id, name, brandId, active — UNIQUE(name, brandId)

### Enums
```
UserRole: ADMIN | MECHANIC | RECEPTIONIST | CERTIFIER
VehicleStatus: ACTIVE | COMPLETED
ServiceStatus: PENDING | IN_PROGRESS | COMPLETED | PAUSED | PENDING_CORRECTION | ACTIVE
```

## Roles y Permisos

| Rol | branchId | Acceso | Rutas |
|-----|----------|--------|-------|
| **ADMIN** | null (ve todo) | Completo | Todas |
| **MECHANIC** | sede asignada | Solo sus servicios | `/mis-autos` |
| **RECEPTIONIST** | sede asignada | Registro + Ventas | `/taller/registrar`, `/ventas` |
| **CERTIFIER** | sede asignada | Solo certificar | `/certificar` |

- ADMIN: sin sede fija, ve todas las sedes con selector
- MECHANIC/RECEPTIONIST/CERTIFIER: vinculados a 1 sede, filtros automáticos por branchId
- Redirección post-login por rol: ADMIN→`/dashboard`, RECEPTIONIST→`/taller/registrar`, MECHANIC→`/mis-autos`, CERTIFIER→`/certificar`

## Flujo Principal
```
1. RECEPTIONIST/ADMIN → /taller/registrar → registra auto (placa, marca, cliente)
   - Elige tipo: "Servicio directo" (trabajo definido) o "Diagnóstico" (problema desconocido)
2. ADMIN → /taller/asignar → asigna servicio + mecánico al auto
   O bien: MECHANIC → /mis-autos (tab "Disponibles") → se auto-asigna el auto
3. MECHANIC → /mis-autos → trabaja, agrega repuestos usados, agrega servicios adicionales
   - Marca servicio como COMPLETED cuando termina
   - Puede eliminar un servicio propio si lo agregó por error (solo IN_PROGRESS)
4. ADMIN → /taller → reasigna mecánico si necesario | registra salida con precio total
5. ADMIN → /reportes → consulta ingresos y servicios
6. ADMIN/RECEPTIONIST → /ventas → ventas de mostrador (productos sin servicio)
```

## Autenticación

**Configuración** (`lib/auth.ts`):
- Estrategia: JWT (no sesión en BD)
- Provider: CredentialsProvider (username + password)
- Hash: bcryptjs `compare(password, user.password)`
- Soft delete: valida `user.active = true`

**Datos en sesión** (`session.user`):
```typescript
{
  id: string
  username: string
  name: string
  role: UserRole        // ADMIN | MECHANIC | RECEPTIONIST
  branchId: string | null
  branchCode: string | null
}
```

**Obtener sesión en Server Component:**
```typescript
const session = await getServerSession(authOptions)
if (!session) redirect('/login')
```

## Server Actions (`lib/actions/`)

### vehicles.ts
- `getActiveVehicles(branchId?)` — autos ACTIVE ordenados por arrivalOrder (con branch + services)
- `addVehicle(data)` — registra auto, asigna arrivalOrder automático, acepta `entryType?`
- `completeVehicleExit(vehicleId, totalPrice)` — marca COMPLETED, distribuye precio entre servicios
- `getDashboardStats(branchId?)` — KPIs del día
- `getIncomeReport(branchId?, dateFrom?, dateTo?)` — reporte combinado servicios + ventas
- `getCompletedVehiclesForReport(branchId?, dateFrom?, dateTo?)` — para reporte de servicios

### services.ts
- `addService(data)` — crea servicio IN_PROGRESS
- `completeService(id)` — marca COMPLETED + timestamp
- `requestCorrection(id, reason)` — marca PENDING_CORRECTION
- `updateService(id, data)` — actualiza descripción/notas
- `getServicesByMechanic(mechanicId, status?)` — incluye `items { product }` para vista del mecánico
- `addServiceItem(data)` — valida stock, crea ServiceItem, descuenta product.stock (transacción)
- `removeServiceItem(itemId)` — devuelve stock al producto, elimina ítem (transacción)
- `deleteService(serviceId, mechanicId)` — verifica IN_PROGRESS + ownership, devuelve stock de ítems, elimina servicio
- `reassignMechanic(serviceId, newMechanicId)` — cambia mecánico de un servicio (solo ADMIN)
- `getUnassignedVehicles(branchId?)` — autos ACTIVE sin mecánico asignado, excluye `visitType: "venta"` (para auto-asignación del mecánico)
- `assignMechanicToService(serviceId, data)` — asigna mecánico a un servicio existente sin mecánico

### users.ts
- `createUser(data)` — hashea contraseña, asigna branchId si no es ADMIN
- `deleteUser(id)` — soft delete (active = false)
- `getMechanicsByBranch(branchId)` — para selector en asignar servicio
- `getBranchesCached()` — **cacheada** (tag `"branches"`), usar en page.tsx en lugar de `getBranches()`
- `getBranches()` / `createBranch()` / `deleteBranch()` — gestión de sedes (mutaciones invalidan caché)

### clients.ts
- `getClients(search?)` — unifica Vehicle + Sale + ClientContact por DNI, retorna `ClientSummary[]`
- `getClientByDNI(dni)` — historial completo: vehículos (services+branch) + ventas directas (items+branch+createdBy) + ClientContact
- `upsertClientContact(data)` — crea o actualiza un ClientContact (upsert por DNI)
- `searchClientQuick(q)` — autocomplete para ventas: busca en Vehicle + ClientContact + Sale (prioridad: Contact > Vehicle > Sale)

### brands.ts
- `getBrandsForSelect()` — para dropdown Marca → Modelo en formularios
- `createBrand(name)` — reactiva si existía inactiva
- `deleteBrand(id)` — soft delete en cascada a modelos

### company.ts
- `getCompany()` / `updateCompany(data)` — upsert único registro de empresa

### products.ts
- `getAllProductsCached()` — **cacheada** (tag `"products"`), carga todos los productos activos para inventario
- `getProducts(branchId?, search?)` — búsqueda con filtros (sin caché)
- `createProduct(data)` / `updateProduct(id, data)` / `deleteProduct(id)` / `addStock(id, qty)` — invalidan caché
- `createStockEntry(data)` / `createBulkStockEntries(entries)` — ingreso de stock, invalidan caché
- `getAllMovements(opts?)` — historial de movimientos con filtros fecha (zona Lima UTC-5), tipo y sede

### sales.ts
- `createSale(data)` — registra venta + items, descuenta stock
- `getSales(branchId?, dateFrom?, dateTo?)` — historial de ventas con paginación por fecha
- `getSalesToday(branchId?)` — stats del día (total + count)
- `getSalesByBranch(branchId?)` — para reportes

### service-types.ts
- `getServiceTypesCached()` — **cacheada** (tag `"service-types"`), usar en page.tsx
- `getServiceTypes()` — sin caché (para uso interno en actions)
- `createServiceType(name)` / `updateServiceTypeColor(id, color)` / `toggleServiceType(id, active)` — invalidan caché

### certifications.ts
- `getCertificationQueue(branchId?)` — servicios COMPLETED para certificar
- `certifyService(serviceId, certifierId)` — marca servicio como certificado
- `getCertifiedServices(branchId?, dateFrom?, dateTo?)` — historial de certificaciones

## Comandos Útiles
```bash
pnpm dev          # Servidor de desarrollo (puerto 3000)
pnpm build        # Build de producción
pnpm start        # Iniciar servidor producción
pnpm dlx prisma generate   # Regenerar cliente Prisma
pnpm dlx prisma db push    # Aplicar schema a BD
pnpm dlx prisma studio     # Explorador BD visual
pnpm dlx prisma db seed    # Ejecutar seed
```

## Variables de Entorno
```env
# .env (local)
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/tallerdyc"
NEXTAUTH_SECRET="genera-con-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# .env (producción VPS)
DATABASE_URL="postgresql://nelaglow_user:NelaGlow2025@localhost:5432/tallerdyc_db"
NEXTAUTH_SECRET="secreto-produccion-diferente"
NEXTAUTH_URL="https://tallerdyc.com"  # o http://212.85.12.168:3003
```

## Deploy VPS

| Item | Valor |
|------|-------|
| **IP** | `212.85.12.168` |
| **Puerto** | `3003` |
| **Ruta** | `/var/www/tallerdyc` |
| **PM2 name** | `tallerdyc` |
| **Repo** | `https://github.com/jfloresavalos/TallerDyC.git` |

**Primer deploy:**
```bash
cd /var/www/tallerdyc
chmod +x deploy.sh
./deploy.sh --setup
```

**Actualizaciones:**
```bash
# Desde local:
git push origin main
# En VPS:
ssh root@212.85.12.168 "cd /var/www/tallerdyc && ./deploy.sh"
```

**Estado actual:** BD en VPS pendiente de crear, `.env` de producción pendiente.

## Últimos Cambios (Sesión 2026-03-22 — Caché + Optimizaciones de Performance)

### Caché con `unstable_cache` + `revalidateTag`

#### `lib/actions/products.ts`
- `getAllProductsCached()` — caché con tag `"products"`. Usado en `/inventario` para cargar todos los productos al inicio sin tocar BD en visitas repetidas.
- `revalidateTag("products")` agregado en: `createProduct`, `updateProduct`, `deleteProduct`, `addStock`, `createStockEntry`, `createBulkStockEntries`.

#### `lib/actions/users.ts`
- `getBranchesCached()` — caché con tag `"branches"`. Reemplaza `getBranches()` en todas las páginas del dashboard (10 páginas). Sedes casi nunca cambian → sin queries innecesarias.
- `revalidateTag("branches")` en: `createBranch`, `updateBranch`, `deleteBranch`.

#### `lib/actions/service-types.ts`
- `getServiceTypesCached()` — caché con tag `"service-types"`. Reemplaza `getServiceTypes()` en páginas que lo usan.
- `revalidateTag("service-types")` en: `createServiceType`, `toggleServiceType`, `deleteServiceType`, `updateServiceTypeColor`.

### Inventario — Filtrado local con `useMemo`
- `getAllProductsCached()` carga todos los productos al inicio de la página (cacheados).
- `InventoryClient` ya no llama a `getProducts` por cada búsqueda — filtrado 100% local con `useMemo`.
- Top 20 productos visibles por defecto; filtros activos muestran todos los resultados.
- Mensaje al pie: "Mostrando 20 de N productos — usa el buscador para filtrar".

### Optimizaciones React (`active-vehicles.tsx`)
- `useTransition` reemplaza `isLoading` state manual → React gestiona el estado de carga sin bloquear UI.
- `stats` + `visitTypeCounts`: de 8 `.filter()` separados → **1 solo loop** con `useMemo`.
- `filteredVehicles`: `useMemo` con dependencias correctas, solo recalcula cuando cambia el filtro.
- `grouped` + `typeOrderIndex`: `useMemo` compartido, elimina el O(n²) implícito.

### Optimizaciones React (`certification-queue.tsx`)
- Lógica duplicada `refresh` + `handleBranchChange` → centralizada en `fetchData(branchId)`.
- `useTransition` para feedback visual durante carga por cambio de sede.

### Optimizaciones React (`admin-dashboard.tsx`)
- `timeLabel` + `dateLabel`: de recalcularse en cada render → `useMemo([], [])` una sola vez al montar.
- `useTransition` reemplaza `isLoading` en cambio de sede.

### Fix Timezone — Módulo Movimientos (`lib/actions/products.ts`)
- `getAllMovements` ahora interpreta `dateFrom`/`dateTo` en zona Lima (UTC-5).
- `limaToUtcStart(d)` → `d + "T05:00:00Z"` (medianoche Lima = 05:00 UTC).
- `limaToUtcEnd(d)` → día siguiente a las 04:59:59 UTC.
- Antes: filtro "17 marzo" mostraba registros de "16 marzo" por diferencia de timezone.

## Últimos Cambios (Sesión 2026-03-15 — Módulo Clientes + Ventas Mejoradas)

### ClientContact — Nuevo modelo Prisma
- `ClientContact(id, name, dni UNIQUE, phone?, notes?, createdAt, updatedAt)` — clientes registrados manualmente independiente de vehículos/ventas
- `pnpm exec prisma db push` aplicado correctamente
- `upsertClientContact(data)` — crea o actualiza por DNI único

### Módulo de Clientes completamente rehecho
- `getClients(q)` — unifica Vehicle + Sale + ClientContact por DNI con contadores independientes (`totalVehicles`, `totalServices`, `totalSales`, `source`)
- `getClientByDNI(dni)` — incluye ventas directas (Sale) además de vehículos; prioridad: Contact > Vehicle > Sale para nombre/teléfono
- `searchClientQuick(q)` — ahora busca en **3 fuentes**: ClientContact (prioridad 1) + Vehicle (prioridad 2) + Sale (prioridad 3). Antes solo buscaba en 2, por lo que clientes registrados solo por ventas no aparecían en el autocomplete
- `client-list.tsx` rehecho: búsqueda lazy (≥2 chars), stats row (4 columnas), botón "Nuevo Cliente", dialog de creación (nombre+DNI+teléfono+notas), badge "contacto", "Sin resultados" muestra opción de agregar
- `client-detail.tsx` rehecho: header con `clientNotes`, panel financiero oscuro (servicios taller / compras directas / total), 3 tabs (Vehículos/Servicios/Compras) con contadores. Vehículos muestra visitType badge + totalAmount + año. Compras muestra ítems desglosados + métodos de pago

### Módulo de Ventas (`/ventas`) mejorado
- Carga solo ventas del día por defecto (fecha Lima con `toLocaleDateString("en-CA", { timeZone: "America/Lima" })`)
- Filtros de fecha (Desde/Hasta) + búsqueda local (nombre/DNI/número de venta)
- Click en venta → Dialog con detalle completo (cliente + productos + pago + total + usuario)
- `getSalesToday(branchId?)` nueva action para stats del día

### new-sale-dialog.tsx — UX cliente mejorado
- `clientMode` state machine: `"search"` | `"manual"` | `"filled"`
- `onMouseDown` + `e.preventDefault()` en sugerencias (evita blur-antes-del-click)
- Badge "Clientes varios" visible bajo el input de búsqueda cuando el campo está vacío
- Pago simple: monto readonly (div gris mostrando el total) — imposible guardar monto incorrecto
- Pago mixto: ambos montos requeridos y deben sumar exactamente el total (`payError` explícito)
- "No encontrado" → banner amarillo + "+ Agregar nuevo" → modo manual con pre-carga de DNI numérico

## Últimos Cambios (Sesión 2026-03-12 — Revisión Anual + Cobro/Salida)

### Revisión Anual — Reglas especiales (`my-assigned-vehicles.tsx`)
- `visitType === "revision"` requiere 2 mecánicos: mecánico principal + co-mecánico
- Al tomar un auto de revisión, el dialog pide seleccionar co-mecánico (opcional en el momento)
- Si se toma sin co-mecánico: banner teal "Esperando co-mecánico" + solo botón Eliminar visible
- **No se puede pausar** (`canPause = !isRevision`) — botón Pausar oculto para revisiones
- 2do mecánico ve el auto en "Disponibles" (query lo incluye cuando `coMechanicId === null`)
- Al tomarlo, el 2do mecánico se une como co-mecánico (no como mecánico principal)
- Ambos ven el trabajo en "Mis Trabajos" — cualquiera puede marcarlo terminado
- Nueva action `assignCoMechanicToService(serviceId, coMechanicId)` en `services.ts`

### Co-mecánico en Disponibles (`services.ts`)
- `getUnassignedVehicles` ahora incluye en el OR: revisiones con `mechanicId != null` y `coMechanicId === null`
- `UnassignedService` type ahora incluye `coMechanicId` para detectar el caso del 2do mecánico
- El click en la tarjeta detecta si es "unirse como co-mecánico" y va directo a confirmación

### startTime correcto (`services.ts`)
- `assignMechanicToService` ahora actualiza `startTime: new Date()` al asignar
- Antes quedaba con la hora del registro del admin; ahora captura la hora real de inicio de trabajo

### Schema — Campos de cobro (`prisma/schema.prisma`)
Nuevos campos en `Vehicle`:
- `totalAmount Float?`, `discount Float?`, `voucherType String?`
- `clientRuc String?`, `clientBusinessName String?`
- `paymentMethod1/2 String?`, `paymentAmount1/2 Float?`, `checkoutNotes String?`

Nuevos campos en `Service`: `discount Float? @default(0)`
Nuevos campos en `ServiceItem`: `discount Float? @default(0)`

### CheckoutDialog — Cobro y Salida (`components/taller/checkout-dialog.tsx`)
Nuevo componente que reemplaza el dialog simple de salida. Incluye:
1. **Servicios**: precio editable + descuento por servicio, colapsables
2. **Repuestos**: qty/precio/descuento editable por ítem + agregar extras con buscador
3. **Total**: calculado automáticamente (servicios + repuestos - descuentos)
4. **Comprobante**: Boleta (usa DNI) / Factura (pide RUC + razón social) / Ninguno
5. **Forma de pago**: Efectivo/Tarjeta/Transferencia + pago mixto con validación de montos
6. **Observaciones**: campo opcional
- Carga datos con `getVehicleForCheckout(vehicleId)` (nueva action — incluye services.items.product)
- Guarda con `checkoutVehicle(data)` (nueva action en `vehicles.ts`)
- `active-vehicles.tsx` usa `checkoutVehicleId/Label` state + `handleOpenCheckout()`

### Nuevas actions en `vehicles.ts`
- `getVehicleForCheckout(vehicleId)` — vehículo con services COMPLETED + items + products
- `checkoutVehicle(data)` — transacción: actualiza precios/descuentos, crea extras, cierra vehículo

### Prisma generate
- Siempre usar `pnpm exec prisma generate` (no dlx) con dev server detenido
- Después de `db push` el cliente se regenera automáticamente

## Reporte pendiente
- `/reportes/vehiculo` — ficha completa por placa: línea de tiempo (ingreso → tomó → terminó → salida), servicios realizados, repuestos, mecánicos, tiempos

## Últimos Cambios (Sesión 2026-03-10 — visitType + Orden por tipo + UX Mobile)

### visitType en Vehicle
- Campo `visitType: String @default("general")` — 4 valores: `general`, `garantia`, `revision`, `venta`
- Selector en formulario de registro (`vehicle-registration.tsx`)
- **Venta**: registro de cliente que solo compra, sin servicio mecánico — no aparece en "Disponibles" para mecánicos, no tiene número de orden

### Orden independiente por tipo (`active-vehicles.tsx`)
- `typeOrderIndex`: Map calculado en frontend al renderizar. Cada tipo (general/garantia/revision) tiene su propio `#1, #2, #3...`
- El `arrivalOrder` en BD sigue siendo global (para ordenar la query), el número visible es el índice dentro del tipo
- Venta muestra ícono `ShoppingBag` en lugar de número

### Auto-asignación mejorada (`my-assigned-vehicles.tsx`)
- Si el auto ya tiene servicio sin mecánico: click en card → directo al Dialog de confirmación (sin paso intermedio)
- Si el auto no tiene servicio: click → Dialog de detalle con selector de tipo → confirmación
- `handleTakeVehicle` usa `assignMechanicToService` si ya existe servicio, o `addService` si no hay ninguno
- Estados separados: `detailVehicle` (selector de servicio) y `confirmVehicle` (confirmación)

### UX Mobile — Dialog compacto
- Dialog de detalle en `/taller`: `max-h-[85vh] flex flex-col`, header `shrink-0`, cuerpo `overflow-y-auto flex-1`
- Padding y tamaños reducidos para que quepa en pantallas pequeñas sin cortar contenido

### Filtro visitType en pills (`active-vehicles.tsx`)
- `flex-wrap` en lugar de `overflow-x-auto` — todos los pills siempre visibles sin scroll lateral

### seed-demo.js
- Elimina TODOS los vehículos y servicios antes de crear los demo
- Crea 12 vehículos: 3 general, 3 garantia, 3 revision, 3 venta
- `arrivalOrder` 1-12 global; números visibles calculados por tipo en frontend

## Últimos Cambios (Sesión 2026-03-07 — Repuestos + Diagnóstico + Auto-asignación)

### ServiceItem — Repuestos por servicio
- Nuevo modelo `ServiceItem` en schema (+ migración aplicada)
- `addServiceItem(data)` — valida stock, crea ítem, descuenta `product.stock` en transacción
- `removeServiceItem(itemId)` — devuelve stock al producto, elimina ítem
- Mecánico ve repuestos expandibles por servicio en `/mis-autos` con botón Trash por ítem

### entryType en Vehicle — Flujo de diagnóstico
- Campo `entryType: "DIRECT" | "DIAGNOSTIC"` en Vehicle
- Selector en formulario de registro (`vehicle-registration.tsx`): botones pill Diagnóstico / Servicio directo
- Badge amarillo "Diag." en cards de `/taller` cuando `entryType === "DIAGNOSTIC"`

### Auto-asignación del mecánico
- `getUnassignedVehicles(branchId?)` — autos ACTIVE sin servicios de la sede del mecánico
- Tab "Disponibles" en `/mis-autos`: mecánico ve autos sin asignar, botón "Tomar este auto" → selecciona tipo → crea servicio

### Reasignación de mecánico (Admin)
- `reassignMechanic(serviceId, newMechanicId)` — actualiza mechanic del servicio
- Botón `UserCheck` en cada servicio expandido de `/taller` → dialog de reasignación

### Eliminar servicio (Mecánico)
- `deleteService(serviceId, mechanicId)` — verifica `IN_PROGRESS` + ownership, devuelve stock de ítems, cascade elimina ServiceItems
- Botón "Eliminar este servicio" visible solo si `status === "IN_PROGRESS"` (en `/mis-autos`)

### Fixes
- `client-detail.tsx`: teléfono ahora es `<a href="tel:...">` clickable
- Todos los archivos: build limpio ✅ (24 páginas)

### Nuevas Server Actions en `lib/actions/services.ts`
- `addServiceItem`, `removeServiceItem`, `deleteService`, `reassignMechanic`, `getUnassignedVehicles`
- `getServicesByMechanic()` ahora incluye `items: { include: { product: true } }`

## Últimos Cambios (Sesión 2026-03-06 — UI/UX Mobile-First Completo)

### Módulos implementados en fases anteriores
1. **Inventario** (`/inventario`): CRUD de productos/repuestos con stock, alertas, categorías, CRUD dialog
2. **Ventas** (`/ventas`): nueva venta con carrito + historial. `NewSaleDialog` multi-step
3. **Correcciones** (`/taller/correcciones`): vista admin de servicios pendientes de corrección
4. **Tipos de servicio dinámicos** (`/configuracion/servicios`): crear/activar/desactivar tipos desde config
5. **Reportes de ingresos** combinados: servicios de taller + ventas de mostrador en un mismo reporte

### Rediseño UI/UX (Mobile-First)
- **sidebar-menu.tsx**: grupos de navegación (Taller/Negocio/Sistema), avatar inicial de usuario, ChevronRight activo, bottom nav con línea indicadora, overlay `backdrop-blur-sm`, touch targets `min-h-[44px]`
- **admin-dashboard.tsx**: KPIs con `font-black tabular-nums`, badges estado (VIVO/HOY/PROM.), 4 acciones rápidas 2×2
- **branch-selector.tsx**: pill buttons compactos (`h-7 rounded-full`), `bg-slate-900` activo, sin card container
- **Todos los inputs**: `h-11` mínimo (44px iOS touch target). Antes: `h-10` / `h-9`
- **Todos los botones de acción**: `h-11`+ (antes `h-9`)
- **inventory-client.tsx**: native `<select>` → shadcn `Select`
- **report-services.tsx**: progreso mechanic con `w-16 md:w-24` (antes inline style `width: 80px`), contadores con `tabular-nums`
- **service-types-client.tsx**: toggle buttons `p-2.5 -mr-1`, `min-h-[56px]`
- **active-vehicles.tsx**: teléfono con `min-h-[44px]`, stats bar con `font-black tabular-nums`
- **new-sale-dialog.tsx**: products list `max-h-64` (antes `max-h-48`)
- **globals.css**: smooth scroll, scrollbar 4px, `.content-wrapper`

### Design System (TallerDyC)
```
Primary:    #2563EB (blue-600)   — acción principal
Success:    #16A34A (green-600)  — completado
Warning:    #EA580C (orange-600) — pendiente/sin servicio
Danger:     #DC2626 (red-600)   — correcciones
Info:       #7C3AED (violet-600) — mecánico
```

### Reglas de UI a mantener
- Touch targets: `min-h-[44px]` o `h-11`+ en todos los botones e inputs
- Inputs numéricos: siempre `tabular-nums`
- Selects: usar shadcn `Select`, nunca `<select>` nativo
- Botones de icono solo: `h-11 w-11` mínimo + `aria-label`
- Transitions: `transition-all duration-150` o `transition-colors duration-200`
- Cursor: `cursor-pointer` en todos los elementos clicables
- Modales: `max-w-[calc(100vw-2rem)] max-h-[85vh] flex flex-col rounded-2xl p-0 overflow-hidden` — header `shrink-0`, cuerpo `overflow-y-auto flex-1`
- Stats numéricas: `font-black tabular-nums` para grandes, `font-bold tabular-nums` para tablas

## Notas Técnicas

### 1. ClientContact — Clientes registrados manualmente
`ClientContact` es el modelo dedicado para clientes (dni único). Los clientes también se derivan de `Vehicle` y `Sale` cuando no existe un `ClientContact` explícito.
- `getClients(q)` — unifica las 3 fuentes (Vehicle + Sale + ClientContact) agrupando por DNI
- `searchClientQuick(q)` — autocomplete: busca en las 3 fuentes, prioridad Contact > Vehicle > Sale
- `upsertClientContact(data)` — crea/actualiza cliente manual por DNI
- Módulo `/clientes`: búsqueda lazy (≥2 chars), botón "Nuevo Cliente" con dialog, badge "contacto" para clientes sin vehículo/venta

### 2. Soft Delete
Nunca se hace DELETE en BD. Todos los registros tienen `active: Boolean`. Usar siempre:
- `where: { active: true }` en queries
- `update({ active: false })` para eliminar

### 3. arrivalOrder y orden por tipo
- `arrivalOrder` es global por sede (se calcula `MAX + 1` al registrar).
- En `/taller` (`active-vehicles.tsx`), el número visible `#1, #2, #3...` es **independiente por `visitType`**: se calcula en frontend con `typeOrderIndex` (Map) al renderizar. General, Garantía y Revisión tienen su propio contador. **Venta no tiene número** (muestra ícono de bolsa).
- `getUnassignedVehicles` excluye `visitType: "venta"` — las ventas no son servicios mecánicos.

### 4. Distribución de precio
`completeVehicleExit(vehicleId, totalPrice)` distribuye el precio total entre todos los servicios COMPLETED del vehículo de forma equitativa.

### 18. Patrón de Caché (`unstable_cache` + `revalidateTag`)
Para datos que cambian raramente (productos, sedes, tipos de servicio):
- En actions: `export const getFooCached = unstable_cache(async () => prisma.foo.findMany(...), ["foo"], { tags: ["foo"] })`
- En page.tsx: usar `getFooCached()` en lugar de `getFoo()`
- En mutaciones: llamar `revalidateTag("foo")` después de crear/actualizar/eliminar
- Para inventario: cargar `initialProducts` en page.tsx y filtrar localmente con `useMemo` en el Client Component (evita Server Actions por cada keystroke)

### 19. `useTransition` vs `isLoading` state manual
Patrón preferido para operaciones async en Client Components:
```typescript
const [isPending, startTransition] = useTransition()
const loadData = () => startTransition(async () => { ... })
```
- `isPending` es gestionado por React automáticamente
- No bloquea renders urgentes (ej: typing en inputs)
- Reemplaza el patrón `setIsLoading(true) / finally { setIsLoading(false) }`

### 5. useSearchParams — NO usar
Next.js 15 causa "CSR bailout" con `useSearchParams()`. Patrón correcto:
- Server Component extrae params y los pasa como props primitivas
- Client Component recibe props y usa `usePathname()` + `router.push()` para navegar

### 6. next.config.mjs
Actualmente vacío. Si el build falla por errores TS/ESLint, agregar:
```js
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
}
```

### 7. Middleware
`middleware.ts` usa `withAuth` de NextAuth. Protege todas las rutas excepto `/login` y `/`. No valida roles (eso lo hace cada page con `getServerSession`).

### 8. Selector Marca → Modelo
`getBrandsForSelect()` retorna marcas con modelos anidados. En formularios: seleccionar marca filtra los modelos disponibles (estado local en Client Component).

### 9. Colores de estado en ActiveVehicles
- Sin servicios (unassigned): naranja — badge `bg-orange-100 text-orange-800`
- En progreso (active): azul — badge `bg-blue-100 text-blue-800`
- Todos completados (completed): verde — badge `bg-green-100 text-green-800` — habilitado para salida

### 10. Prisma — versión local vs dlx
SIEMPRE usar `pnpm exec prisma` (versión local v6.19.2).
NUNCA `pnpm dlx prisma` (descarga v7 que es incompatible — rompe la config de datasource).

### 11. ServiceItem — Repuestos en servicios
- Stock se descuenta al AGREGAR un repuesto a un servicio (`addServiceItem`)
- Stock se devuelve al ELIMINAR un repuesto (`removeServiceItem`)
- Al ELIMINAR un servicio (`deleteService`): devuelve stock de todos sus ítems antes de borrarlos (cascade en BD)
- Transacciones atómicas en todas las operaciones de stock

### 12. entryType en Vehicle
- `"DIRECT"` — trabajo ya definido al registrar (default)
- `"DIAGNOSTIC"` — cliente no sabe el problema, el mecánico diagnostica primero
- Badge amarillo "Diag." visible en `/taller` (active-vehicles) y `/mis-autos` (unassigned tab)
- El mecánico puede auto-asignarse autos sin servicios desde tab "Disponibles" en `/mis-autos`

### 13. Soft delete de Service
Solo el mecánico que creó el servicio puede eliminarlo, y solo si está en `IN_PROGRESS`.
`deleteService(serviceId, mechanicId)` verifica ambas condiciones antes de proceder.

### 14. Módulo de Ventas (`/ventas`)
- Carga por defecto solo las ventas del día (filtros `dateFrom` y `dateTo` inicializados con la fecha de Lima)
- Fecha Lima: `new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })` — retorna `YYYY-MM-DD`
- Búsqueda local (sin request) por nombre, DNI o número de venta con `useMemo`
- Click en una venta abre un Dialog con detalle completo (cliente, productos, pago, total)
- Pago: modo simple (monto readonly = total automático) y mixto (2 métodos con validación de suma)
- `payError` valida: en mixto ambos montos requeridos Y deben sumar exactamente el total

### 15. Módulo de Clientes — `new-sale-dialog.tsx` UX
- `clientMode`: `"search"` | `"manual"` | `"filled"` — máquina de estados para selección de cliente
- Búsqueda lazy con debounce 300ms → `searchClientQuick` → dropdown con `onMouseDown` (evita blur antes de click)
- Badge "Clientes varios": acceso rápido bajo el input de búsqueda (visible cuando campo vacío) → `setClientName("Varios"); setClientMode("filled")`
- "No encontrado" → banner amarillo con "+ Agregar nuevo" → modo manual con pre-carga del DNI si era numérico
- Modo manual: form azul con nombre/DNI/teléfono + botón "Confirmar cliente"
- Modo filled: caja verde con campos editables + botón "Cambiar"

### 16. Tipos de Servicio con Color (`/configuracion/servicios`)
- `ServiceType.color` (String? hex) — se muestra como borde izquierdo de las cards en `/taller`
- Paleta de 8 colores predefinidos + picker inline en `service-types-client.tsx`
- Colores en `/taller`: pasados como `initialServiceTypes` desde `page.tsx` para que funcionen sin abrir ningún dialog
- Colores en `/mis-autos` (Disponibles): agrupados por `vehicle.visitType` con `VISIT_TYPE_CONFIG` fijo (general=#16a34a, garantia=#dc2626, revision=#0d9488)

### 17. Certificaciones (`/certificar`)
- Rol CERTIFIER: ve servicios COMPLETED listos para certificar
- `certifyService(serviceId, certifierId)` — actualiza `certifiedAt` y `certifiedById` en el service
- Cola separada de historial de certificaciones con filtros por fecha y sede

## Flujo de Trabajo

> ⚠️ REGLA CRÍTICA: Nunca hacer commit ni deploy sin OK explícito del usuario.

**TODO cambio (feature, fix, integración, rediseño) se prueba en local primero.**

### Pasos obligatorios:
1. Implementar el cambio en local
2. Decirle al usuario: **"Listo, ya puedes probarlo en `localhost:3000`. ¿Funciona bien?"**
3. Esperar confirmación explícita del usuario ("OK", "bien", "sí", etc.)
4. **Preguntar**: "¿Despliego al VPS?"
5. Solo si el usuario dice que sí → commit → push → deploy

### Comandos de deploy:
```bash
pnpm dev          # Probar en local (localhost:3000)
git add ... && git commit -m "..."
git push origin main
ssh root@212.85.12.168 "cd /var/www/tallerdyc && ./deploy.sh"
```
