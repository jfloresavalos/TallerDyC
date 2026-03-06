"use server"

import prisma from "@/lib/prisma"

export async function getCompany() {
  return prisma.company.findFirst()
}

export async function updateCompany(data: {
  name?: string
  ruc?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  logo?: string | null
}) {
  const company = await prisma.company.findFirst()
  if (!company) {
    return prisma.company.create({ data: { name: data.name ?? "Mi Empresa", ...data } })
  }
  return prisma.company.update({ where: { id: company.id }, data })
}
