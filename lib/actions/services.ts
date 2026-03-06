"use server"

import prisma from "@/lib/prisma"
import { ServiceStatus } from "@prisma/client"

export async function addService(data: {
  vehicleId: string
  serviceType: string
  description: string
  mechanicId: string
}) {
  return prisma.service.create({
    data: {
      ...data,
      status: ServiceStatus.IN_PROGRESS,
    },
    include: { mechanic: true, vehicle: true },
  })
}

export async function updateService(id: string, data: {
  serviceType?: string
  description?: string
  status?: ServiceStatus
  completionTime?: Date | null
  correctionRequested?: boolean
  correctionReason?: string
  price?: number | null
}) {
  return prisma.service.update({
    where: { id },
    data,
  })
}

export async function completeService(id: string) {
  return prisma.service.update({
    where: { id },
    data: {
      status: ServiceStatus.COMPLETED,
      completionTime: new Date(),
    },
  })
}

export async function requestCorrection(id: string, reason: string) {
  return prisma.service.update({
    where: { id },
    data: {
      status: ServiceStatus.PENDING_CORRECTION,
      correctionRequested: true,
      correctionReason: reason,
    },
  })
}

export async function getServicesByVehicle(vehicleId: string) {
  return prisma.service.findMany({
    where: { vehicleId },
    include: { mechanic: true },
    orderBy: { startTime: "asc" },
  })
}

export async function getServicesByMechanic(mechanicId: string, status?: ServiceStatus) {
  const where: Record<string, unknown> = { mechanicId }
  if (status) where.status = status

  return prisma.service.findMany({
    where,
    include: { vehicle: { include: { branch: true } }, mechanic: true },
    orderBy: { startTime: "desc" },
  })
}

export async function getServicesForReports(branchId?: string, date?: string) {
  const where: Record<string, unknown> = {}

  if (branchId) {
    where.vehicle = { branchId }
  }

  return prisma.service.findMany({
    where,
    include: { vehicle: { include: { branch: true } }, mechanic: true },
    orderBy: { startTime: "desc" },
  })
}
