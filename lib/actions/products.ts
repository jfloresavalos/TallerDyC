"use server"

import prisma from "@/lib/prisma"
import { unstable_cache, revalidateTag } from "next/cache"

// ---- CACHÉ DE PRODUCTOS ----
// Se invalida automáticamente con revalidateTag("products") en cada mutación.
// Filtrado/búsqueda ocurre en el cliente con useMemo, sin round-trips extra a BD.

export const getAllProductsCached = unstable_cache(
  async () => {
    return prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    })
  },
  ["all-products"],
  { tags: ["products"] },
)

export async function getProducts(branchId?: string, search?: string) {
  const where: Record<string, unknown> = { active: true }
  if (branchId) where.branchId = branchId
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
    ]
  }
  return prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
  })
}

export async function getAllProducts() {
  return prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  })
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({ where: { id } })
}

export async function getLowStockProducts(branchId?: string) {
  const where: Record<string, unknown> = { active: true }
  if (branchId) where.branchId = branchId
  const products = await prisma.product.findMany({ where })
  return products.filter(p => p.stock <= p.minStock)
}

export async function createProduct(data: {
  name: string
  code?: string
  description?: string
  unit?: string
  price: number
  cost?: number
  stock?: number
  minStock?: number
  category?: string
  brand?: string
  branchId?: string
}) {
  const result = await prisma.product.create({ data })
  revalidateTag("products")
  return result
}

export async function updateProduct(id: string, data: {
  name?: string
  code?: string
  description?: string
  unit?: string
  price?: number
  cost?: number
  stock?: number
  minStock?: number
  category?: string
  brand?: string
  branchId?: string
  active?: boolean
}) {
  const result = await prisma.product.update({ where: { id }, data })
  revalidateTag("products")
  return result
}

export async function deleteProduct(id: string) {
  const result = await prisma.product.update({ where: { id }, data: { active: false } })
  revalidateTag("products")
  return result
}

export async function addStock(id: string, quantity: number) {
  const result = await prisma.product.update({
    where: { id },
    data: { stock: { increment: quantity } },
  })
  revalidateTag("products")
  return result
}

export async function getCategories() {
  const products = await prisma.product.findMany({
    where: { active: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  })
  return products.map(p => p.category).filter(Boolean) as string[]
}

export type KardexEntry = {
  id: string
  date: string           // ISO string (serializable)
  type: "venta" | "servicio"
  reference: string      // Nro de venta o placa del vehículo
  detail: string         // Nombre del servicio o "Venta directa"
  client: string         // Nombre del cliente
  quantity: number
  unitPrice: number
  subtotal: number
}

export async function getProductKardex(productId: string): Promise<KardexEntry[]> {
  const [saleItems, serviceItems] = await Promise.all([
    prisma.saleItem.findMany({
      where: { productId },
      include: {
        sale: {
          select: {
            saleNumber: true,
            clientName: true,
            createdAt: true,
          },
        },
      },
      orderBy: { sale: { createdAt: "desc" } },
    }),
    prisma.serviceItem.findMany({
      where: { productId },
      include: {
        service: {
          select: {
            serviceType: true,
            createdAt: true,
            vehicle: {
              select: { plate: true, clientName: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const ventas: KardexEntry[] = saleItems.map(i => ({
    id: i.id,
    date: i.sale.createdAt.toISOString(),
    type: "venta",
    reference: i.sale.saleNumber,
    detail: "Venta directa",
    client: i.sale.clientName ?? "—",
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    subtotal: i.subtotal,
  }))

  const servicios: KardexEntry[] = serviceItems.map(i => ({
    id: i.id,
    date: i.createdAt.toISOString(),
    type: "servicio",
    reference: i.service.vehicle.plate,
    detail: i.service.serviceType,
    client: i.service.vehicle.clientName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    subtotal: i.subtotal,
  }))

  return [...ventas, ...servicios].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}

// ---- INGRESOS DE STOCK ----

export async function createStockEntry(data: {
  productId: string
  quantity: number
  costPrice?: number
  note?: string
  branchId?: string
}) {
  const [entry] = await prisma.$transaction([
    prisma.stockEntry.create({ data }),
    prisma.product.update({
      where: { id: data.productId },
      data: { stock: { increment: data.quantity } },
    }),
  ])
  revalidateTag("products")
  return entry
}

export async function createBulkStockEntries(entries: {
  productId: string
  quantity: number
  costPrice?: number
  note?: string
  branchId?: string
}[]) {
  const ops = entries.flatMap(e => [
    prisma.stockEntry.create({ data: e }),
    prisma.product.update({
      where: { id: e.productId },
      data: { stock: { increment: e.quantity } },
    }),
  ])
  await prisma.$transaction(ops)
  revalidateTag("products")
  return {
    count: entries.length,
    totalUnits: entries.reduce((s, e) => s + e.quantity, 0),
  }
}

// ---- HISTORIAL GLOBAL DE MOVIMIENTOS ----

export type MovementEntry = {
  id: string
  date: string
  type: "entrada" | "venta" | "servicio"
  productId: string
  productName: string
  reference: string
  detail: string
  client: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export async function getAllMovements(opts?: {
  branchId?: string
  type?: "entrada" | "venta" | "servicio" | "all"
  dateFrom?: string
  dateTo?: string
  search?: string
}): Promise<MovementEntry[]> {
  const { branchId, type = "all", dateFrom, dateTo, search } = opts ?? {}

  // Fechas en zona Lima (UTC-5): medianoche Lima = 05:00 UTC
  // dateFrom "2026-03-17" → gte 2026-03-17T05:00:00Z
  // dateTo   "2026-03-17" → lte 2026-03-18T04:59:59Z (fin del día Lima)
  const limaToUtcStart = (d: string) => new Date(d + "T05:00:00Z")
  const limaToUtcEnd   = (d: string) => {
    const dt = new Date(d + "T05:00:00Z")
    dt.setUTCDate(dt.getUTCDate() + 1)
    dt.setUTCSeconds(dt.getUTCSeconds() - 1)
    return dt
  }
  const dateFilter = (dateFrom || dateTo) ? {
    gte: dateFrom ? limaToUtcStart(dateFrom) : undefined,
    lte: dateTo   ? limaToUtcEnd(dateTo)     : undefined,
  } : undefined

  const [stockEntries, saleItems, serviceItems] = await Promise.all([
    (type === "all" || type === "entrada") ? prisma.stockEntry.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...(search ? { product: { name: { contains: search, mode: "insensitive" } } } : {}),
      },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }) : Promise.resolve([]),

    (type === "all" || type === "venta") ? prisma.saleItem.findMany({
      where: {
        ...(branchId ? { sale: { branchId } } : {}),
        ...(dateFilter ? { sale: { createdAt: dateFilter } } : {}),
        ...(search ? { product: { name: { contains: search, mode: "insensitive" } } } : {}),
      },
      include: {
        product: { select: { id: true, name: true } },
        sale: { select: { saleNumber: true, clientName: true, createdAt: true } },
      },
      orderBy: { sale: { createdAt: "desc" } },
    }) : Promise.resolve([]),

    (type === "all" || type === "servicio") ? prisma.serviceItem.findMany({
      where: {
        ...(branchId ? { service: { vehicle: { branchId } } } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...(search ? { product: { name: { contains: search, mode: "insensitive" } } } : {}),
      },
      include: {
        product: { select: { id: true, name: true } },
        service: {
          select: {
            serviceType: true, createdAt: true,
            vehicle: { select: { plate: true, clientName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }) : Promise.resolve([]),
  ])

  const entradas: MovementEntry[] = stockEntries.map(e => ({
    id: e.id,
    date: e.createdAt.toISOString(),
    type: "entrada",
    productId: e.product.id,
    productName: e.product.name,
    reference: "Ingreso manual",
    detail: e.note ?? "—",
    client: "—",
    quantity: e.quantity,
    unitPrice: e.costPrice ?? 0,
    subtotal: (e.costPrice ?? 0) * e.quantity,
  }))

  const ventas: MovementEntry[] = saleItems.map(i => ({
    id: i.id,
    date: i.sale.createdAt.toISOString(),
    type: "venta",
    productId: i.product.id,
    productName: i.product.name,
    reference: i.sale.saleNumber,
    detail: "Venta directa",
    client: i.sale.clientName ?? "—",
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    subtotal: i.subtotal,
  }))

  const servicios: MovementEntry[] = serviceItems.map(i => ({
    id: i.id,
    date: i.createdAt.toISOString(),
    type: "servicio",
    productId: i.product.id,
    productName: i.product.name,
    reference: i.service.vehicle.plate,
    detail: i.service.serviceType,
    client: i.service.vehicle.clientName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    subtotal: i.subtotal,
  }))

  return [...entradas, ...ventas, ...servicios].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}
