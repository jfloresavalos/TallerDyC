"use server"

import prisma from "@/lib/prisma"
import { ServiceStatus } from "@prisma/client"

export async function getCertificationQueue(branchId?: string | null) {
  return prisma.service.findMany({
    where: {
      status: ServiceStatus.COMPLETED,
      certification: null,
      ...(branchId ? { vehicle: { branchId } } : {}),
    },
    include: {
      vehicle: { include: { branch: true } },
      mechanic: { select: { id: true, name: true } },
      coMechanic: { select: { id: true, name: true } },
      items: { include: { product: { select: { name: true, unit: true } } } },
      handoffs: {
        include: {
          fromMechanic: { select: { id: true, name: true } },
          toMechanic: { select: { id: true, name: true } },
        },
        orderBy: { handoffTime: "asc" },
      },
    },
    orderBy: { completionTime: "asc" },
  })
}

export async function certifyService(
  serviceId: string,
  certifierId: string,
  passed: boolean,
  notes?: string
) {
  return prisma.serviceCertification.create({
    data: { serviceId, certifierId, passed, notes },
    include: {
      certifier: { select: { id: true, name: true } },
    },
  })
}

export async function getCertifiedServices(branchId?: string | null) {
  return prisma.serviceCertification.findMany({
    where: branchId
      ? { service: { vehicle: { branchId } } }
      : {},
    include: {
      service: {
        include: {
          vehicle: { include: { branch: true } },
          mechanic: { select: { id: true, name: true } },
          coMechanic: { select: { id: true, name: true } },
        },
      },
      certifier: { select: { id: true, name: true } },
    },
    orderBy: { certifiedAt: "desc" },
    take: 100,
  })
}
