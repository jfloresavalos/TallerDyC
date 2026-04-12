"use server"

import prisma from "@/lib/prisma"

export interface ClientSummary {
  clientName: string
  clientDNI: string
  clientPhone: string
  totalVehicles: number
  totalServices: number
  totalSales: number
  source: "vehicle" | "sale" | "contact"
}

/** Busca clientes unificando Vehicle, Sale y ClientContact por DNI */
export async function getClients(search?: string): Promise<ClientSummary[]> {
  const q = search?.trim()

  // ── 1. Vehículos ──
  const vehicleWhere = q ? {
    OR: [
      { clientName: { contains: q, mode: "insensitive" as const } },
      { clientDNI: { contains: q } },
      { clientPhone: { contains: q } },
    ],
  } : {}

  const vehicles = await prisma.vehicle.findMany({
    where: vehicleWhere,
    select: {
      clientDNI: true, clientName: true, clientPhone: true,
      _count: { select: { services: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // ── 2. Ventas directas (clientes que solo compraron sin traer auto) ──
  const saleWhere = q ? {
    clientDNI: { not: null as null },
    OR: [
      { clientName: { contains: q, mode: "insensitive" as const } },
      { clientDNI: { contains: q } },
      { clientPhone: { contains: q } },
    ],
  } : { clientDNI: { not: null as null } }

  const sales = await prisma.sale.findMany({
    where: saleWhere,
    select: { clientDNI: true, clientName: true, clientPhone: true },
    orderBy: { createdAt: "desc" },
  })

  // ── 3. ClientContacts (clientes registrados manualmente) ──
  const contactWhere = q ? {
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { dni:  { contains: q } },
      { phone: { contains: q } },
    ],
  } : {}

  const contacts = await prisma.clientContact.findMany({
    where: contactWhere,
    select: { dni: true, name: true, phone: true },
    orderBy: { createdAt: "desc" },
  })

  // ── Unificar por DNI ──
  const map = new Map<string, ClientSummary>()

  for (const v of vehicles) {
    const existing = map.get(v.clientDNI)
    if (existing) {
      existing.totalVehicles += 1
      existing.totalServices += v._count.services
    } else {
      map.set(v.clientDNI, {
        clientName: v.clientName, clientDNI: v.clientDNI, clientPhone: v.clientPhone,
        totalVehicles: 1, totalServices: v._count.services, totalSales: 0, source: "vehicle",
      })
    }
  }

  for (const s of sales) {
    if (!s.clientDNI) continue
    const existing = map.get(s.clientDNI)
    if (existing) {
      existing.totalSales += 1
      // Actualizar nombre si no tenía
      if (!existing.clientName && s.clientName) existing.clientName = s.clientName ?? ""
    } else {
      map.set(s.clientDNI, {
        clientName: s.clientName ?? "", clientDNI: s.clientDNI, clientPhone: s.clientPhone ?? "",
        totalVehicles: 0, totalServices: 0, totalSales: 1, source: "sale",
      })
    }
  }

  for (const c of contacts) {
    const existing = map.get(c.dni)
    if (existing) {
      // Ya existe por vehículo/venta — solo actualizar teléfono si falta
      if (!existing.clientPhone && c.phone) existing.clientPhone = c.phone ?? ""
    } else {
      map.set(c.dni, {
        clientName: c.name, clientDNI: c.dni, clientPhone: c.phone ?? "",
        totalVehicles: 0, totalServices: 0, totalSales: 0, source: "contact",
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => a.clientName.localeCompare(b.clientName))
}

/** Crea o actualiza un cliente en ClientContact */
export async function upsertClientContact(data: {
  name: string; dni: string; phone?: string; notes?: string
}) {
  if (!data.name.trim() || !data.dni.trim()) throw new Error("Nombre y DNI son requeridos")
  return prisma.clientContact.upsert({
    where: { dni: data.dni.trim() },
    create: { name: data.name.trim(), dni: data.dni.trim(), phone: data.phone?.trim(), notes: data.notes?.trim() },
    update: { name: data.name.trim(), phone: data.phone?.trim(), notes: data.notes?.trim() },
  })
}

/** Búsqueda rápida para autocomplete (ventas + vehículos + contactos) */
export async function searchClientQuick(q: string) {
  if (!q || q.trim().length < 2) return []

  const [vehicles, contacts, sales] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        OR: [
          { clientDNI:  { contains: q.trim() } },
          { clientName: { contains: q.trim(), mode: "insensitive" } },
        ],
      },
      select: { clientDNI: true, clientName: true, clientPhone: true },
      orderBy: { entryTime: "desc" },
      take: 30,
    }),
    prisma.clientContact.findMany({
      where: {
        OR: [
          { dni:  { contains: q.trim() } },
          { name: { contains: q.trim(), mode: "insensitive" } },
        ],
      },
      select: { dni: true, name: true, phone: true },
      take: 10,
    }),
    prisma.sale.findMany({
      where: {
        clientDNI: { not: null },
        OR: [
          { clientDNI:  { contains: q.trim() } },
          { clientName: { contains: q.trim(), mode: "insensitive" } },
        ],
      },
      select: { clientDNI: true, clientName: true, clientPhone: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  const seen = new Map<string, { clientDNI: string; clientName: string; clientPhone: string }>()
  // Prioridad: ClientContact > Vehicle > Sale
  for (const c of contacts) {
    seen.set(c.dni, { clientDNI: c.dni, clientName: c.name, clientPhone: c.phone ?? "" })
  }
  for (const v of vehicles) {
    if (!seen.has(v.clientDNI)) seen.set(v.clientDNI, v)
  }
  for (const s of sales) {
    if (s.clientDNI && !seen.has(s.clientDNI)) {
      seen.set(s.clientDNI, {
        clientDNI: s.clientDNI,
        clientName: s.clientName ?? "",
        clientPhone: s.clientPhone ?? "",
      })
    }
  }
  return Array.from(seen.values()).slice(0, 6)
}

/** Últimos N clientes (para mostrar al abrir la página sin buscar) */
export async function getRecentClients(limit = 15): Promise<ClientSummary[]> {
  // Traer los últimos registros de cada fuente, ordenados por fecha
  const [recentVehicles, recentContacts, recentSales] = await Promise.all([
    prisma.vehicle.findMany({
      select: {
        clientDNI: true, clientName: true, clientPhone: true,
        _count: { select: { services: true } },
        entryTime: true,
      },
      orderBy: { entryTime: "desc" },
      take: 50,
    }),
    prisma.clientContact.findMany({
      select: { dni: true, name: true, phone: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.sale.findMany({
      where: { clientDNI: { not: null } },
      select: { clientDNI: true, clientName: true, clientPhone: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ])

  // Unificar por DNI con timestamp más reciente para ordenar
  const map = new Map<string, ClientSummary & { lastSeen: Date }>()

  for (const v of recentVehicles) {
    const existing = map.get(v.clientDNI)
    if (existing) {
      existing.totalVehicles += 1
      existing.totalServices += v._count.services
      if (v.entryTime > existing.lastSeen) existing.lastSeen = v.entryTime
    } else {
      map.set(v.clientDNI, {
        clientName: v.clientName, clientDNI: v.clientDNI, clientPhone: v.clientPhone,
        totalVehicles: 1, totalServices: v._count.services, totalSales: 0,
        source: "vehicle", lastSeen: v.entryTime,
      })
    }
  }

  for (const s of recentSales) {
    if (!s.clientDNI) continue
    const existing = map.get(s.clientDNI)
    if (existing) {
      existing.totalSales += 1
      if (s.createdAt > existing.lastSeen) existing.lastSeen = s.createdAt
    } else {
      map.set(s.clientDNI, {
        clientName: s.clientName ?? "", clientDNI: s.clientDNI, clientPhone: s.clientPhone ?? "",
        totalVehicles: 0, totalServices: 0, totalSales: 1,
        source: "sale", lastSeen: s.createdAt,
      })
    }
  }

  for (const c of recentContacts) {
    const existing = map.get(c.dni)
    if (existing) {
      if (!existing.clientPhone && c.phone) existing.clientPhone = c.phone ?? ""
      // Contacto puede ser más reciente
      if (c.createdAt > existing.lastSeen) existing.lastSeen = c.createdAt
    } else {
      map.set(c.dni, {
        clientName: c.name, clientDNI: c.dni, clientPhone: c.phone ?? "",
        totalVehicles: 0, totalServices: 0, totalSales: 0,
        source: "contact", lastSeen: c.createdAt,
      })
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
    .slice(0, limit)
    .map(({ lastSeen: _, ...rest }) => rest)
}

/** Exportar todos los clientes como CSV */
export async function exportClientsCSV(): Promise<string> {
  const clients = await getClients() // sin filtro = todos

  const header = "Nombre,DNI,Teléfono,Vehículos,Servicios,Compras"
  const rows = clients.map(c => {
    const name = c.clientName.replace(/"/g, '""')
    const phone = c.clientPhone.replace(/"/g, '""')
    return `"${name}","${c.clientDNI}","${phone}",${c.totalVehicles},${c.totalServices},${c.totalSales}`
  })

  return [header, ...rows].join("\n")
}

export async function getClientByDNI(dni: string) {
  const [vehicles, sales, contact] = await Promise.all([
    prisma.vehicle.findMany({
      where: { clientDNI: dni },
      include: {
        services: {
          include: { mechanic: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        branch: { select: { name: true } },
      },
      orderBy: { entryTime: "desc" },
    }),
    prisma.sale.findMany({
      where: { clientDNI: dni },
      include: {
        items: { include: { product: { select: { id: true, name: true, unit: true } } } },
        branch: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.clientContact.findUnique({ where: { dni } }),
  ])

  if (vehicles.length === 0 && sales.length === 0 && !contact) return null

  const latestVehicle = vehicles[0]
  const latestSale = sales[0]
  // Prioridad: ClientContact > Vehicle > Sale
  const clientName = contact?.name ?? latestVehicle?.clientName ?? latestSale?.clientName ?? ""
  const clientPhone = contact?.phone ?? latestVehicle?.clientPhone ?? latestSale?.clientPhone ?? ""
  const clientNotes = contact?.notes ?? null

  return {
    clientName,
    clientDNI: dni,
    clientPhone,
    clientNotes,
    vehicles,
    sales,
  }
}
