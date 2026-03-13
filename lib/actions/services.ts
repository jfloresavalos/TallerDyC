"use server"

import prisma from "@/lib/prisma"
import { ServiceStatus } from "@prisma/client"

// ── Servicios ─────────────────────────────────────────────────────────────

export async function addService(data: {
  vehicleId: string
  serviceType: string
  description?: string
  mechanicId?: string
  coMechanicId?: string
}) {
  // Si hay mecánico, verificar que no tenga servicios IN_PROGRESS en OTROS vehículos
  // (PAUSED no bloquea — el mecánico puede tomar otro auto si pausó el anterior)
  if (data.mechanicId) {
    const activeInOtherVehicles = await prisma.service.count({
      where: {
        mechanicId: data.mechanicId,
        status: ServiceStatus.IN_PROGRESS,
        vehicleId: { not: data.vehicleId },
      },
    })
    if (activeInOtherVehicles > 0) {
      throw new Error("Ya tienes un trabajo activo en otro vehículo. Pausa ese trabajo antes de tomar uno nuevo.")
    }
  }

  return prisma.service.create({
    data: {
      vehicleId: data.vehicleId,
      serviceType: data.serviceType,
      description: data.description,
      mechanicId: data.mechanicId ?? null,
      coMechanicId: data.coMechanicId ?? null,
      status: data.mechanicId ? ServiceStatus.IN_PROGRESS : ServiceStatus.IN_PROGRESS,
    },
    include: {
      mechanic: true,
      coMechanic: true,
      vehicle: true,
    },
  })
}

export async function updateService(id: string, data: {
  serviceType?: string
  description?: string
  status?: ServiceStatus
  completionTime?: Date | null
  price?: number | null
}) {
  return prisma.service.update({
    where: { id },
    data,
  })
}

export async function completeService(id: string, description: string) {
  if (!description || !description.trim()) {
    throw new Error("La descripción del trabajo realizado es obligatoria")
  }
  return prisma.service.update({
    where: { id },
    data: {
      status: ServiceStatus.COMPLETED,
      completionTime: new Date(),
      description: description.trim(),
    },
  })
}

export async function pauseService(serviceId: string, mechanicId: string, reason: string) {
  if (!reason || !reason.trim()) {
    throw new Error("El motivo de la pausa es obligatorio")
  }
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service) throw new Error("Servicio no encontrado")
  if (service.mechanicId !== mechanicId) throw new Error("No tienes permisos para pausar este servicio")
  if (service.status !== ServiceStatus.IN_PROGRESS) throw new Error("Solo se pueden pausar servicios en progreso")

  return prisma.service.update({
    where: { id: serviceId },
    data: { status: ServiceStatus.PAUSED, pauseReason: reason.trim() },
  })
}

export async function resumeService(serviceId: string, mechanicId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service) throw new Error("Servicio no encontrado")
  if (service.mechanicId !== mechanicId) throw new Error("No tienes permisos para reanudar este servicio")
  if (service.status !== ServiceStatus.PAUSED) throw new Error("El servicio no está pausado")

  // Verificar que no tenga otro servicio IN_PROGRESS en otro vehículo
  const activeInOther = await prisma.service.count({
    where: {
      mechanicId,
      status: ServiceStatus.IN_PROGRESS,
      vehicleId: { not: service.vehicleId },
    },
  })
  if (activeInOther > 0) {
    throw new Error("Tienes un trabajo activo en otro vehículo. Termínalo o páusalo antes de reanudar este.")
  }

  return prisma.service.update({
    where: { id: serviceId },
    data: { status: ServiceStatus.IN_PROGRESS, pauseReason: null },
  })
}

export async function deleteService(serviceId: string, mechanicId: string, reason: string) {
  if (!reason || !reason.trim()) {
    throw new Error("El motivo de eliminación es obligatorio")
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { items: true },
  })
  if (!service) throw new Error("Servicio no encontrado")
  if (service.status === ServiceStatus.COMPLETED) throw new Error("No se pueden eliminar servicios ya completados")
  if (service.mechanicId !== mechanicId) throw new Error("No tienes permisos para eliminar este servicio")

  // Devolver stock de cada ítem
  for (const item of service.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    })
  }

  // Registrar eliminación en log
  await prisma.serviceDeletion.create({
    data: {
      serviceId,
      vehicleId: service.vehicleId,
      mechanicId,
      serviceType: service.serviceType,
      reason: reason.trim(),
      deletedById: mechanicId,
    },
  })

  await prisma.service.delete({ where: { id: serviceId } })
}

export async function handoffService(
  serviceId: string,
  fromMechanicId: string,
  toMechanicId: string,
  note?: string
) {
  // Verificar que el mecánico receptor no tenga auto IN_PROGRESS (PAUSED no bloquea)
  const activeCount = await prisma.service.count({
    where: { mechanicId: toMechanicId, status: ServiceStatus.IN_PROGRESS },
  })
  if (activeCount > 0) {
    throw new Error("El mecánico seleccionado ya tiene un trabajo activo en curso")
  }

  return prisma.$transaction(async (tx) => {
    await tx.serviceHandoff.create({
      data: { serviceId, fromMechanicId, toMechanicId, note },
    })
    return tx.service.update({
      where: { id: serviceId },
      data: { mechanicId: toMechanicId },
      include: { mechanic: true, coMechanic: true },
    })
  })
}

export async function reassignMechanic(serviceId: string, newMechanicId: string) {
  return prisma.service.update({
    where: { id: serviceId },
    data: { mechanicId: newMechanicId },
    include: { mechanic: true },
  })
}

export async function assignMechanicToService(serviceId: string, data: {
  mechanicId: string
  coMechanicId?: string
  serviceType?: string
  description?: string
}) {
  // Verificar que el mecánico no tenga otro auto IN_PROGRESS (PAUSED no bloquea)
  const activeCount = await prisma.service.count({
    where: { mechanicId: data.mechanicId, status: ServiceStatus.IN_PROGRESS, id: { not: serviceId } },
  })
  if (activeCount > 0) {
    throw new Error("Ya tienes un trabajo activo. Pausa o transfiere ese trabajo antes de tomar uno nuevo.")
  }

  return prisma.service.update({
    where: { id: serviceId },
    data: {
      mechanicId: data.mechanicId,
      coMechanicId: data.coMechanicId ?? null,
      startTime: new Date(), // hora real en que el mecánico toma el trabajo
      ...(data.serviceType ? { serviceType: data.serviceType } : {}),
      ...(data.description ? { description: data.description } : {}),
    },
    include: { mechanic: true, coMechanic: true, vehicle: true },
  })
}

export async function assignCoMechanicToService(serviceId: string, coMechanicId: string) {
  // Verificar que el co-mecánico no tenga otro auto IN_PROGRESS
  const activeCount = await prisma.service.count({
    where: {
      OR: [{ mechanicId: coMechanicId }, { coMechanicId }],
      status: ServiceStatus.IN_PROGRESS,
      id: { not: serviceId },
    },
  })
  if (activeCount > 0) {
    throw new Error("Ya tienes un trabajo activo. Termínalo antes de tomar uno nuevo.")
  }
  return prisma.service.update({
    where: { id: serviceId },
    data: { coMechanicId },
    include: { mechanic: true, coMechanic: true, vehicle: true },
  })
}

// ── Consultas ─────────────────────────────────────────────────────────────

export async function getServicesByVehicle(vehicleId: string) {
  return prisma.service.findMany({
    where: { vehicleId },
    include: {
      mechanic: { select: { id: true, name: true } },
      coMechanic: { select: { id: true, name: true } },
      handoffs: {
        include: {
          fromMechanic: { select: { id: true, name: true } },
          toMechanic: { select: { id: true, name: true } },
        },
        orderBy: { handoffTime: "asc" },
      },
    },
    orderBy: { startTime: "asc" },
  })
}

export async function getServicesByMechanic(mechanicId: string, status?: ServiceStatus | "ACTIVE") {
  // "ACTIVE" es un alias para IN_PROGRESS + PAUSED
  const statusFilter = status === "ACTIVE"
    ? { status: { in: [ServiceStatus.IN_PROGRESS, ServiceStatus.PAUSED] } }
    : status
      ? { status }
      : {}

  return prisma.service.findMany({
    where: {
      ...statusFilter,
      OR: [
        { mechanicId },
        { coMechanicId: mechanicId },
      ],
    },
    include: {
      vehicle: { include: { branch: true } },
      mechanic: { select: { id: true, name: true } },
      coMechanic: { select: { id: true, name: true } },
      items: { include: { product: true }, orderBy: { createdAt: "asc" } },
      handoffs: {
        include: {
          fromMechanic: { select: { id: true, name: true } },
          toMechanic: { select: { id: true, name: true } },
        },
        orderBy: { handoffTime: "asc" },
      },
    },
    orderBy: { startTime: "desc" },
  })
}

export async function getUnassignedVehicles(branchId?: string) {
  return prisma.vehicle.findMany({
    where: {
      status: "ACTIVE",
      visitType: { not: "venta" },
      OR: [
        // Sin ningún servicio todavía
        { services: { none: {} } },
        // Servicio activo sin mecánico principal
        { services: { some: { mechanicId: null, status: { notIn: ["COMPLETED"] } } } },
        // Revisión anual con mecánico pero sin co-mecánico (esperando 2do mecánico)
        {
          visitType: "revision",
          services: { some: { mechanicId: { not: null }, coMechanicId: null, status: { notIn: ["COMPLETED"] } } },
        },
      ],
      ...(branchId ? { branchId } : {}),
    },
    include: {
      branch: true,
      services: {
        select: { id: true, serviceType: true, mechanicId: true, coMechanicId: true, status: true },
      },
    },
    orderBy: { arrivalOrder: "asc" },
  })
}

export async function getServicesForReports(branchId?: string) {
  const where: Record<string, unknown> = {}
  if (branchId) where.vehicle = { branchId }

  return prisma.service.findMany({
    where,
    include: {
      vehicle: { include: { branch: true } },
      mechanic: { select: { id: true, name: true } },
      coMechanic: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "desc" },
  })
}

export async function getServiceDeletions(branchId?: string) {
  return prisma.serviceDeletion.findMany({
    where: branchId ? { vehicle: { branchId } } as Record<string, unknown> : {},
    include: {
      deletedBy: { select: { id: true, name: true } },
    },
    orderBy: { deletedAt: "desc" },
    take: 200,
  })
}

// ── Mecánicos disponibles ─────────────────────────────────────────────────

export async function getMechanicsByBranch(branchId?: string) {
  return prisma.user.findMany({
    where: { ...(branchId ? { branchId } : {}), role: "MECHANIC", active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

// ── Repuestos usados en servicios ──────────────────────────────────────────

export async function addServiceItem(data: {
  serviceId: string
  productId: string
  quantity: number
  unitPrice: number
}) {
  const product = await prisma.product.findUnique({ where: { id: data.productId } })
  if (!product) throw new Error("Producto no encontrado")
  if (product.stock < data.quantity) throw new Error(`Stock insuficiente (disponible: ${product.stock} ${product.unit})`)

  const [item] = await prisma.$transaction([
    prisma.serviceItem.create({
      data: {
        serviceId: data.serviceId,
        productId: data.productId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        subtotal: data.quantity * data.unitPrice,
      },
      include: { product: true },
    }),
    prisma.product.update({
      where: { id: data.productId },
      data: { stock: { decrement: data.quantity } },
    }),
  ])
  return item
}

export async function removeServiceItem(itemId: string) {
  const item = await prisma.serviceItem.findUnique({
    where: { id: itemId },
    include: { product: true },
  })
  if (!item) throw new Error("Ítem no encontrado")

  await prisma.$transaction([
    prisma.serviceItem.delete({ where: { id: itemId } }),
    prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    }),
  ])
}

