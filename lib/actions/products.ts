"use server"

import prisma from "@/lib/prisma"

export async function getProducts(branchId?: string, search?: string) {
  const where: Record<string, unknown> = { active: true }
  if (branchId) where.branchId = branchId
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ]
  }
  return prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
  })
}

export async function getAllProducts() {
  return prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  })
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({ where: { id } })
}

export async function getLowStockProducts(branchId?: string) {
  const where: Record<string, unknown> = { active: true }
  if (branchId) where.branchId = branchId
  const products = await prisma.product.findMany({ where })
  return products.filter(p => p.stock <= p.minStock)
}

export async function createProduct(data: {
  name: string
  code?: string
  description?: string
  unit?: string
  price: number
  cost?: number
  stock?: number
  minStock?: number
  category?: string
  branchId?: string
}) {
  return prisma.product.create({ data })
}

export async function updateProduct(id: string, data: {
  name?: string
  code?: string
  description?: string
  unit?: string
  price?: number
  cost?: number
  stock?: number
  minStock?: number
  category?: string
  branchId?: string
  active?: boolean
}) {
  return prisma.product.update({ where: { id }, data })
}

export async function deleteProduct(id: string) {
  return prisma.product.update({ where: { id }, data: { active: false } })
}

export async function addStock(id: string, quantity: number) {
  return prisma.product.update({
    where: { id },
    data: { stock: { increment: quantity } },
  })
}

export async function getCategories() {
  const products = await prisma.product.findMany({
    where: { active: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  })
  return products.map(p => p.category).filter(Boolean) as string[]
}
