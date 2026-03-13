# TallerDyC — Plan de Mejoras Completo

> Marcar con `[x]` cada tarea al completarla. Implementar en orden de fases.

---

## Principio de Diseño: "Un toque, una acción"
Los mecánicos y recepcionistas trabajan con manos sucias, de pie, bajo presión, siempre desde el celular.
- Botones grandes (mínimo 52px alto)
- Texto grande y legible (mínimo 16px)
- Máximo 2 pasos para cualquier acción
- Colores claros que indican el estado de un vistazo
- Sin menús complicados — bottom nav para roles simples

---

## FASE 1 — UI Mobile-First + Flujos Críticos

### 1A. Base UI Global
- [x] `app/globals.css` — CSS variables, status colors, touch-target, pb-safe, iOS font-size fix
- [x] `app/(dashboard)/layout.tsx` — safe-area iOS, pb-safe para roles móviles
- [x] `components/sidebar-menu.tsx` — bottom navigation fija para MECHANIC y RECEPTIONIST, sidebar para ADMIN, badges de rol

### 1B. Login — más limpio y grande
- [x] `app/(auth)/login/page.tsx` — fondo oscuro gradiente, inputs con iconos h-14, spinner en botón, safe-area

### 1C. Recepcionista — Registrar Auto (flujo ultra simple)
- [x] `components/taller/vehicle-registration.tsx` — rediseño completo:
  - [x] Stepper visual: Paso 1 "Datos del Auto" → Paso 2 "Datos del Cliente" → Paso 3 Confirmación
  - [x] Inputs con `h-14` grandes, shadcn Select para Marca/Modelo
  - [x] Placa auto-uppercase, inputs numéricos con counter
  - [x] Resumen antes de confirmar con toda la info

### 1D. Admin — Autos Activos (vista principal más clara) + Asignación integrada
- [ ] `components/taller/active-vehicles.tsx` — rediseño completo:
  - Cards más grandes con estado visible de un vistazo
  - Badge de número de orden `#1`, `#2` bien visible (grande, esquina superior izquierda)
  - Indicador de color en borde izquierdo (naranja=sin servicio, azul=en trabajo, verde=listo)
  - **FLUJO UNIFICADO**: En la misma card, botón "Asignar Servicio" cuando `services.length === 0`
  - Formulario de asignación inline/dialog directo desde la card (eliminar módulo separado de asignación)
  - Botón "Registrar Salida" solo visible cuando el auto está listo (verde)
  - Lista de servicios del auto visible en la card (acordeón expandible)
  - Selector de precio con teclado numérico sugerido (`inputMode="decimal"`)

### 1E2. Dashboard Admin — Rediseño visual
- [ ] `components/taller/admin-dashboard.tsx` — mejorar:
  - KPIs más grandes y visuales con íconos grandes
  - Mostrar lista de autos listos para salir (acceso rápido)
  - Alerta visual si hay correcciones pendientes
  - Acceso rápido "Ver todos los autos activos"

### 1F2. Reportes — Rediseño completo
- [ ] `app/(dashboard)/reportes/page.tsx` — hub más visual:
  - Cards grandes con estadísticas resumidas del día/mes
  - Acceso directo a cada reporte
- [ ] `components/taller/report-services.tsx` — rediseño:
  - Vista tabla en desktop / cards en mobile
  - Resumen sticky con totales siempre visible
  - Por mecánico: tabla resumen de servicios por persona
- [ ] `components/taller/report-income.tsx` — rediseño:
  - Resumen sticky con total siempre visible arriba
  - Lista más compacta y ordenada
  - Breakdown por sede si hay múltiples

### 1E. Admin — Asignar Servicio (más rápido)
- [x] `components/taller/service-assignment.tsx` — rediseño:
  - [x] Select shadcn/ui para servicio y mecánico
  - [x] Cards con info clara de cada auto + toque para asignar
  - [x] Dialog con formulario mejorado y botón grande

### 1F. Mecánico — Vista de Trabajo (rediseño total)
- [x] `components/taller/my-assigned-vehicles.tsx` — rediseño completo:
  - [x] Card con header azul, teléfono clickeable, info completa
  - [x] Botón "TERMINAR TRABAJO" grande y verde
  - [x] "Agregar Nota", "+ Servicio" y "Reportar problema"
  - [x] addAdditionalService() en services.ts

### 1G. Admin — Vista de Correcciones (NUEVO)
- [x] `app/(dashboard)/taller/correcciones/page.tsx` — creada
- [x] `components/taller/corrections-list.tsx` — creado:
  - [x] Lista de servicios PENDING_CORRECTION con motivo
  - [x] Dialog para reasignar mecánico y resolver
  - [x] `resolveCorrection()` en services.ts

### 1H. Server Action nueva
- [x] `lib/actions/services.ts` — `getPendingCorrections()` + `resolveCorrection()` + `addService()` para mecánico

---

## FASE 2 — Módulo de Clientes (completar)

### 2A. Página de detalle (BUG CRÍTICO — link roto)
- [x] `app/(dashboard)/clientes/[dni]/page.tsx` — CREADA (bug crítico corregido)

### 2B. Mejorar detalle de cliente
- [ ] `components/taller/client-detail.tsx` — mejorar:
  - Botón "Llamar" directo (`tel:` link) — muy útil en mobile
  - Timeline de visitas (más visual)
  - Total gastado en el taller destacado
  - Último servicio y fecha

### 2C. Mejorar lista de clientes
- [ ] `components/taller/client-list.tsx` — ajustes:
  - Búsqueda más prominente (sticky en scroll)
  - Cards más grandes y tocables

---

## FASE 3 — Módulo de Productos / Inventario (NUEVO)

### 3A. Base de datos
- [ ] `prisma/schema.prisma` — agregar modelos:
  - `Product` (id, name, code, unit, price, cost, stock, minStock, category, branchId, active)
  - `ServiceItem` (id, serviceId, productId, quantity, unitPrice) — repuestos usados en un servicio
  - Modificar `Service` — agregar `items ServiceItem[]`
- [ ] Ejecutar `pnpm dlx prisma db push` y `pnpm dlx prisma generate`

### 3B. Server Actions
- [ ] `lib/actions/products.ts` — crear:
  - `getProducts(branchId?, search?)` — listar con stock
  - `createProduct(data)` — crear producto
  - `updateProduct(id, data)` — actualizar
  - `deleteProduct(id)` — soft delete
  - `addStockEntry(id, quantity)` — ingreso de stock
  - `useStock(id, quantity)` — descontar stock (usado desde servicio)
  - `getLowStockProducts(branchId?)` — productos bajo mínimo

### 3C. Páginas y componentes
- [ ] `app/(dashboard)/inventario/page.tsx` — rediseñar (actualmente placeholder):
  - Lista con stock actual, badge rojo si bajo mínimo
  - Búsqueda + filtro por categoría
- [ ] `components/taller/inventory-list.tsx` — tabla desktop + cards mobile
- [ ] `components/taller/product-form.tsx` — formulario crear/editar producto (Sheet en mobile)

### 3D. Integración con flujo de mecánico
- [ ] En la vista del mecánico — agregar sección "Repuestos usados":
  - Buscador de productos del inventario
  - Agregar cantidad usada
  - Se descuenta automáticamente del stock

---

## FASE 4 — Módulo de Ventas (NUEVO)

### 4A. Base de datos
- [ ] `prisma/schema.prisma` — agregar modelos:
  - `Sale` (id, saleNumber "DYC-0001", clientName?, clientDNI?, total, branchId, createdBy)
  - `SaleItem` (id, saleId, productId, quantity, unitPrice, subtotal)
  - Modificar `User` — agregar `sales Sale[]`
  - Modificar `Branch` — agregar `sales Sale[]`
- [ ] Ejecutar `pnpm dlx prisma db push` y `pnpm dlx prisma generate`

### 4B. Server Actions
- [ ] `lib/actions/sales.ts` — crear:
  - `createSale(data)` — crear venta + descontar stock
  - `getSales(branchId?, dateFrom?, dateTo?)` — listar ventas
  - `getSaleById(id)` — detalle
  - `getSalesReport(branchId?, dateFrom?, dateTo?)` — para reportes

### 4C. Páginas y componentes
- [ ] `app/(dashboard)/ventas/page.tsx` — lista de ventas con totales del día
- [ ] `app/(dashboard)/ventas/nueva/page.tsx` — crear venta:
  - Buscador de productos
  - Agregar items con cantidad
  - Datos opcionales del cliente
  - Total calculado en tiempo real
  - Botón grande "Confirmar Venta"
- [ ] `components/taller/sales-list.tsx` — lista con filtros
- [ ] `components/taller/new-sale-form.tsx` — formulario de nueva venta

### 4D. Navegación
- [ ] Agregar "Ventas" al sidebar (ADMIN y RECEPTIONIST)

---

## FASE 5 — Tipos de Servicio Dinámicos

### 5A. Base de datos
- [ ] `prisma/schema.prisma` — agregar modelo `ServiceType` (id, name, active)
- [ ] `prisma/seed.ts` — seed con los 20 tipos actuales hardcoded
- [ ] Ejecutar `pnpm dlx prisma db push` y `pnpm dlx prisma generate`

### 5B. Server Actions
- [ ] `lib/actions/service-types.ts` — CRUD básico

### 5C. Integración
- [ ] `components/taller/service-assignment.tsx` — leer tipos desde BD en lugar de array hardcoded
- [ ] `app/(dashboard)/configuracion/page.tsx` — agregar tab "Tipos de Servicio"
- [ ] `components/taller/service-types-management.tsx` — CRUD de tipos (agregar/desactivar)

---

## FASE 6 — Mejoras a Reportes

- [ ] `components/taller/report-services.tsx` — agregar sección "Por mecánico" (quién hace más)
- [ ] `app/(dashboard)/reportes/ventas/page.tsx` — reporte de ventas por fecha/sede
- [ ] `components/taller/report-income.tsx` — incluir ventas directas en el total de ingresos

---

## FASE 7 — Dashboard mejorado

- [ ] `components/taller/admin-dashboard.tsx` — agregar:
  - KPI de ventas del día
  - Alerta de productos con stock bajo
  - Lista rápida de correcciones pendientes
  - Acceso rápido a "Registrar Salida" de autos listos

---

## Navegación — sidebar actualizado

- [ ] Agregar al sidebar:
  - **Ventas** (ADMIN, RECEPTIONIST)
  - **Correcciones** (ADMIN) — con badge contador si hay pendientes
- [ ] Agregar `next.config.mjs` → `typescript: { ignoreBuildErrors: true }` para build estable

---

## Reglas de implementación

| Regla | Descripción |
|-------|-------------|
| **Mobile-First** | Diseñar primero para 375px, luego escalar a desktop |
| **Un toque** | Máximo 2 pasos para cualquier acción del mecánico/recepcionista |
| **Botones grandes** | Mínimo `h-12` (48px), idealmente `h-14` (56px) para acciones principales |
| **Colores claros** | Verde=listo, Naranja=pendiente, Azul=en proceso, Rojo=problema |
| **Sin `<select>` nativo** | Usar siempre `Select` de shadcn/ui |
| **Sin `useSearchParams`** | Params siempre desde Server Component como props |
| **Sin `window.location.reload`** | Usar `router.refresh()` |
| **Toast en toda acción** | Siempre confirmar visualmente el resultado |
| **`pnpm`** | Siempre usar pnpm, nunca npm |

---

## Estado general

| Fase | Estado |
|------|--------|
| Fase 1 — UI Mobile + Flujos | ⏳ Pendiente |
| Fase 2 — Clientes | ⏳ Pendiente |
| Fase 3 — Productos/Inventario | ⏳ Pendiente |
| Fase 4 — Ventas | ⏳ Pendiente |
| Fase 5 — Tipos de Servicio | ⏳ Pendiente |
| Fase 6 — Reportes | ⏳ Pendiente |
| Fase 7 — Dashboard | ⏳ Pendiente |
