"use server"

import prisma from "@/lib/prisma"
import { VehicleStatus } from "@prisma/client"

export async function getActiveVehicles(branchId?: string) {
  const where: Record<string, unknown> = { status: VehicleStatus.ACTIVE }
  if (branchId) where.branchId = branchId

  return prisma.vehicle.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      services: {
        select: {
          id: true,
          status: true,
          serviceType: true,
          mechanicId: true,
          mechanic: { select: { id: true, name: true } },
          coMechanicId: true,
          coMechanic: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { arrivalOrder: "asc" },
  })
}

export async function getVehicleForCheckout(vehicleId: string) {
  return prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      services: {
        where: { status: "COMPLETED" },
        include: {
          mechanic: { select: { id: true, name: true } },
          coMechanic: { select: { id: true, name: true } },
          items: {
            include: { product: { select: { id: true, name: true, unit: true } } },
          },
        },
      },
    },
  })
}

export async function getVehicles(branchId?: string) {
  const where: Record<string, unknown> = {}
  if (branchId) where.branchId = branchId

  return prisma.vehicle.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      services: {
        select: {
          id: true,
          status: true,
          serviceType: true,
          price: true,
          mechanic: { select: { id: true, name: true } },
        },
      },
    },
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
  year?: number | null
  clientName: string
  clientPhone: string
  clientDNI: string
  branchId: string
  isConverted?: boolean
}) {
  const count = await prisma.vehicle.count({
    where: { branchId: data.branchId, status: VehicleStatus.ACTIVE },
  })

  return prisma.vehicle.create({
    data: {
      plate: data.plate.toUpperCase(),
      brand: data.brand,
      model: data.model,
      ...(data.year ? { year: data.year } : {}),
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientDNI: data.clientDNI,
      branchId: data.branchId,
      isConverted: data.isConverted ?? false,
      arrivalOrder: count + 1,
    },
  })
}

export async function addVehicleWithService(data: {
  plate: string
  brand: string
  model: string
  year?: number | null
  clientName: string
  clientPhone: string
  clientDNI: string
  branchId: string
  isConverted?: boolean
  serviceType: string
  visitType?: string
}) {
  const count = await prisma.vehicle.count({
    where: { branchId: data.branchId, status: VehicleStatus.ACTIVE },
  })

  const visitType = data.visitType ?? "general"

  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.create({
      data: {
        plate: data.plate.toUpperCase(),
        brand: data.brand,
        model: data.model,
        ...(data.year ? { year: data.year } : {}),
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientDNI: data.clientDNI,
        branchId: data.branchId,
        isConverted: data.isConverted ?? false,
        visitType,
        arrivalOrder: count + 1,
      },
    })

    // Solo venta: no se crea servicio (solo es un registro de ingreso)
    if (visitType !== "venta") {
      await tx.service.create({
        data: {
          vehicleId: vehicle.id,
          serviceType: data.serviceType,
        },
      })
    }

    return vehicle
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

export async function checkoutVehicle(data: {
  vehicleId: string
  services: { id: string; price: number; discount: number }[]
  serviceItems: { id: string; unitPrice: number; quantity: number; discount: number }[]
  extraItems: { serviceId: string; productId: string; quantity: number; unitPrice: number; discount: number }[]
  totalAmount: number
  discount: number
  voucherType: string
  clientRuc?: string
  clientBusinessName?: string
  paymentMethod1: string
  paymentAmount1: number
  paymentMethod2?: string
  paymentAmount2?: number
  checkoutNotes?: string
}) {
  await prisma.$transaction(async (tx) => {
    for (const svc of data.services) {
      await tx.service.update({
        where: { id: svc.id },
        data: { price: svc.price, discount: svc.discount },
      })
    }
    for (const item of data.serviceItems) {
      const subtotal = item.unitPrice * item.quantity - (item.discount ?? 0)
      await tx.serviceItem.update({
        where: { id: item.id },
        data: { unitPrice: item.unitPrice, subtotal, discount: item.discount },
      })
    }
    for (const extra of data.extraItems) {
      const subtotal = extra.unitPrice * extra.quantity - (extra.discount ?? 0)
      await tx.serviceItem.create({
        data: {
          serviceId: extra.serviceId,
          productId: extra.productId,
          quantity: extra.quantity,
          unitPrice: extra.unitPrice,
          subtotal,
          discount: extra.discount,
        },
      })
      await tx.product.update({
        where: { id: extra.productId },
        data: { stock: { decrement: extra.quantity } },
      })
    }
    await tx.vehicle.update({
      where: { id: data.vehicleId },
      data: {
        status: VehicleStatus.COMPLETED,
        exitTime: new Date(),
        totalAmount: data.totalAmount,
        discount: data.discount,
        voucherType: data.voucherType,
        clientRuc: data.clientRuc ?? null,
        clientBusinessName: data.clientBusinessName ?? null,
        paymentMethod1: data.paymentMethod1,
        paymentAmount1: data.paymentAmount1,
        paymentMethod2: data.paymentMethod2 ?? null,
        paymentAmount2: data.paymentAmount2 ?? null,
        checkoutNotes: data.checkoutNotes ?? null,
      },
    })
  })
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

  const dateFilter: Record<string, Date> = {}
  if (dateFrom || dateTo) {
    if (dateFrom) dateFilter.gte = new Date(dateFrom + "T00:00:00")
    if (dateTo) {
      const to = new Date(dateTo + "T00:00:00")
      to.setDate(to.getDate() + 1)
      dateFilter.lt = to
    }
    where.exitTime = dateFilter
  }

  const salesWhere: Record<string, unknown> = {}
  if (branchId) salesWhere.branchId = branchId
  if (dateFrom || dateTo) salesWhere.createdAt = dateFilter

  const [vehicles, sales] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: { branch: true, services: { where: { price: { not: null } } } },
      orderBy: { exitTime: "desc" },
    }),
    prisma.sale.findMany({
      where: salesWhere,
      include: {
        branch: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        items: { include: { product: { select: { name: true, unit: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const serviceIncome = vehicles.reduce(
    (sum, v) => sum + v.services.reduce((s, svc) => s + (svc.price ?? 0), 0),
    0
  )
  const salesIncome = sales.reduce((sum, s) => sum + s.total, 0)
  const totalIncome = serviceIncome + salesIncome
  const totalVehicles = vehicles.length
  const avgPerVehicle = totalVehicles > 0 ? serviceIncome / totalVehicles : 0

  return { vehicles, sales, totalIncome, serviceIncome, salesIncome, totalVehicles, avgPerVehicle }
}

export async function getDashboardStats(branchId?: string) {
  const branchFilter = branchId ? { branchId } : {}

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get all active vehicles to compute "without service" count
  const activeVehiclesList = await prisma.vehicle.findMany({
    where: { ...branchFilter, status: VehicleStatus.ACTIVE },
    select: { id: true, _count: { select: { services: true } } },
  })

  const [completedToday, services] = await Promise.all([
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
  ])

  const activeVehicles = activeVehiclesList.length
  const pendingVehicles = activeVehiclesList.filter(v => v._count.services === 0).length
  const totalIncome = services.reduce((sum, s) => sum + (s.price ?? 0), 0)

  return {
    activeVehicles,
    completedToday,
    totalIncome,
    pendingVehicles,
  }
}
