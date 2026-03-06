"use server"

import prisma from "@/lib/prisma"

export async function getClients(search?: string) {
  const where = search
    ? {
        OR: [
          { clientName: { contains: search, mode: "insensitive" as const } },
          { clientDNI: { contains: search } },
          { clientPhone: { contains: search } },
        ],
      }
    : {}

  const vehicles = await prisma.vehicle.findMany({
    where,
    select: {
      clientDNI: true,
      clientName: true,
      clientPhone: true,
      _count: { select: { services: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Group by DNI to get unique clients
  const clientMap = new Map<
    string,
    { clientName: string; clientDNI: string; clientPhone: string; totalVehicles: number; totalServices: number }
  >()

  for (const v of vehicles) {
    const existing = clientMap.get(v.clientDNI)
    if (existing) {
      existing.totalVehicles += 1
      existing.totalServices += v._count.services
      // Keep the most recent name/phone
    } else {
      clientMap.set(v.clientDNI, {
        clientName: v.clientName,
        clientDNI: v.clientDNI,
        clientPhone: v.clientPhone,
        totalVehicles: 1,
        totalServices: v._count.services,
      })
    }
  }

  return Array.from(clientMap.values()).sort((a, b) => a.clientName.localeCompare(b.clientName))
}

export async function getClientByDNI(dni: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { clientDNI: dni },
    include: {
      services: {
        include: { mechanic: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      branch: { select: { name: true } },
    },
    orderBy: { entryTime: "desc" },
  })

  if (vehicles.length === 0) return null

  const latest = vehicles[0]

  return {
    clientName: latest.clientName,
    clientDNI: latest.clientDNI,
    clientPhone: latest.clientPhone,
    vehicles,
  }
}
