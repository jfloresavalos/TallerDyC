"use server"

import prisma from "@/lib/prisma"
import { unstable_cache, revalidateTag } from "next/cache"

export const getServiceTypesCached = unstable_cache(
  async () => prisma.serviceType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ["service-types"],
  { tags: ["service-types"] },
)

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
  const result = await prisma.serviceType.create({ data: { name, color } })
  revalidateTag("service-types")
  return result
}

export async function toggleServiceType(id: string, active: boolean) {
  const result = await prisma.serviceType.update({ where: { id }, data: { active } })
  revalidateTag("service-types")
  return result
}

export async function deleteServiceType(id: string) {
  const result = await prisma.serviceType.update({ where: { id }, data: { active: false } })
  revalidateTag("service-types")
  return result
}

export async function updateServiceTypeColor(id: string, color: string) {
  const result = await prisma.serviceType.update({ where: { id }, data: { color } })
  revalidateTag("service-types")
  return result
}
