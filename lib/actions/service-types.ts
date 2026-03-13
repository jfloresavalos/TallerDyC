"use server"

import prisma from "@/lib/prisma"

export async function getServiceTypes() {
  return prisma.serviceType.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  })
}

export async function getAllServiceTypes() {
  return prisma.serviceType.findMany({ orderBy: { name: "asc" } })
}

export async function createServiceType(name: string, color: string = "green") {
  return prisma.serviceType.create({ data: { name, color } })
}

export async function toggleServiceType(id: string, active: boolean) {
  return prisma.serviceType.update({ where: { id }, data: { active } })
}

export async function deleteServiceType(id: string) {
  return prisma.serviceType.update({ where: { id }, data: { active: false } })
}

export async function updateServiceTypeColor(id: string, color: string) {
  return prisma.serviceType.update({ where: { id }, data: { color } })
}
