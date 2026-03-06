"use server"

import prisma from "@/lib/prisma"
import { VehicleStatus } from "@prisma/client"

export async function getActiveVehicles(branchId?: string) {
  const where: Record<string, unknown> = { status: VehicleStatus.ACTIVE }
  if (branchId) where.branchId = branchId

  return prisma.vehicle.findMany({
    where,
    include: { branch: true, services: { include: { mechanic: true } } },
    orderBy: { arrivalOrder: "asc" },
  })
}

export async function getVehicles(branchId?: string) {
  const where: Record<string, unknown> = {}
  if (branchId) where.branchId = branchId

  return prisma.vehicle.findMany({
    where,
    include: { branch: true, services: { include: { mechanic: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function getVehicleById(id: string) {
  return prisma.vehicle.findUnique({
    where: { id },
    include: { branch: true, services: { include: { mechanic: true } } },
  })
}

export async function addVehicle(data: {
  plate: string
  brand: string
  model: string
  year: number
  clientName: string
  clientPhone: string
  clientDNI: string
  branchId: string
}) {
  const count = await prisma.vehicle.count({
    where: { branchId: data.branchId, status: VehicleStatus.ACTIVE },
  })

  return prisma.vehicle.create({
    data: {
      ...data,
      plate: data.plate.toUpperCase(),
      arrivalOrder: count + 1,
    },
  })
}

export async function updateVehicle(id: string, data: {
  plate?: string
  brand?: string
  model?: string
  year?: number
  clientName?: string
  clientPhone?: string
  clientDNI?: string
  status?: VehicleStatus
  exitTime?: Date | null
}) {
  return prisma.vehicle.update({
    where: { id },
    data,
  })
}

export async function completeVehicleExit(vehicleId: string, totalPrice: number) {
  const services = await prisma.service.findMany({
    where: { vehicleId, status: "COMPLETED" },
  })

  const pricePerService = services.length > 0 ? totalPrice / services.length : 0

  await prisma.$transaction([
    ...services.map((service) =>
      prisma.service.update({
        where: { id: service.id },
        data: { price: pricePerService },
      })
    ),
    prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        status: VehicleStatus.COMPLETED,
        exitTime: new Date(),
      },
    }),
  ])
}

export async function hasServices(vehicleId: string) {
  const count = await prisma.service.count({
    where: {
      vehicleId,
      status: { not: "PENDING_CORRECTION" },
    },
  })
  return count > 0
}

export async function getCompletedVehiclesForReport(branchId?: string, dateFrom?: string, dateTo?: string) {
  const where: Record<string, unknown> = { status: VehicleStatus.COMPLETED }
  if (branchId) where.branchId = branchId

  if (dateFrom || dateTo) {
    const exitTimeFilter: Record<string, Date> = {}
    if (dateFrom) exitTimeFilter.gte = new Date(dateFrom + "T00:00:00")
    if (dateTo) {
      const to = new Date(dateTo + "T00:00:00")
      to.setDate(to.getDate() + 1)
      exitTimeFilter.lt = to
    }
    where.exitTime = exitTimeFilter
  }

  return prisma.vehicle.findMany({
    where,
    include: { branch: true, services: { include: { mechanic: true } } },
    orderBy: { exitTime: "desc" },
  })
}

export async function getIncomeReport(branchId?: string, dateFrom?: string, dateTo?: string) {
  const where: Record<string, unknown> = { status: VehicleStatus.COMPLETED }
  if (branchId) where.branchId = branchId

  if (dateFrom || dateTo) {
    const exitTimeFilter: Record<string, Date> = {}
    if (dateFrom) exitTimeFilter.gte = new Date(dateFrom + "T00:00:00")
    if (dateTo) {
      const to = new Date(dateTo + "T00:00:00")
      to.setDate(to.getDate() + 1)
      exitTimeFilter.lt = to
    }
    where.exitTime = exitTimeFilter
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: { branch: true, services: { where: { price: { not: null } } } },
    orderBy: { exitTime: "desc" },
  })

  const totalIncome = vehicles.reduce(
    (sum, v) => sum + v.services.reduce((s, svc) => s + (svc.price ?? 0), 0),
    0
  )
  const totalVehicles = vehicles.length
  const avgPerVehicle = totalVehicles > 0 ? totalIncome / totalVehicles : 0

  return { vehicles, totalIncome, totalVehicles, avgPerVehicle }
}

export async function getDashboardStats(branchId?: string) {
  const branchFilter = branchId ? { branchId } : {}

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [activeVehicles, completedToday, services, allCompletedServices] = await Promise.all([
    prisma.vehicle.count({
      where: { ...branchFilter, status: VehicleStatus.ACTIVE },
    }),
    prisma.vehicle.count({
      where: {
        ...branchFilter,
        status: VehicleStatus.COMPLETED,
        exitTime: { gte: today, lt: tomorrow },
      },
    }),
    prisma.service.findMany({
      where: {
        status: "COMPLETED",
        price: { not: null },
        vehicle: {
          ...branchFilter,
          exitTime: { gte: today, lt: tomorrow },
        },
      },
    }),
    prisma.service.findMany({
      where: {
        completionTime: { not: null },
        vehicle: branchFilter,
      },
    }),
  ])

  const totalIncome = services.reduce((sum, s) => sum + (s.price ?? 0), 0)

  const avgTime =
    allCompletedServices.length > 0
      ? allCompletedServices.reduce((sum, s) => {
          const start = new Date(s.startTime).getTime()
          const end = new Date(s.completionTime!).getTime()
          return sum + (end - start)
        }, 0) /
        allCompletedServices.length /
        (1000 * 60)
      : 0

  return {
    activeVehicles,
    completedToday,
    totalIncome,
    averageServiceTime: Math.round(avgTime),
  }
}
