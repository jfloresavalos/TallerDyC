"use server"

import prisma from "@/lib/prisma"

export async function getSales(branchId?: string, dateFrom?: string, dateTo?: string) {
  const where: Record<string, unknown> = {}
  if (branchId) where.branchId = branchId
  if (dateFrom || dateTo) {
    const filter: Record<string, Date> = {}
    if (dateFrom) filter.gte = new Date(dateFrom + "T00:00:00")
    if (dateTo) {
      const to = new Date(dateTo + "T00:00:00")
      to.setDate(to.getDate() + 1)
      filter.lt = to
    }
    where.createdAt = filter
  }
  return prisma.sale.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, unit: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getSaleById(id: string) {
  return prisma.sale.findUnique({
    where: { id },
    include: {
      branch: true,
      createdBy: { select: { id: true, name: true } },
      items: { include: { product: true } },
    },
  })
}

export async function createSale(data: {
  clientName?: string
  clientDNI?: string
  clientPhone?: string
  paymentMethod1: string
  paymentAmount1?: number
  paymentMethod2?: string
  paymentAmount2?: number
  branchId: string
  createdById: string
  items: { productId: string; quantity: number; unitPrice: number }[]
}) {
  const count = await prisma.sale.count()
  const saleNumber = `DYC-${String(count + 1).padStart(4, "0")}`
  const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  return prisma.$transaction(async (tx) => {
    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } })
      if (!product) throw new Error(`Producto no encontrado: ${item.productId}`)
      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para "${product.name}" (disponible: ${product.stock})`)
      }
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }

    return tx.sale.create({
      data: {
        saleNumber,
        clientName: data.clientName,
        clientDNI: data.clientDNI,
        clientPhone: data.clientPhone,
        total,
        paymentMethod1: data.paymentMethod1,
        paymentAmount1: data.paymentAmount1,
        paymentMethod2: data.paymentMethod2 || null,
        paymentAmount2: data.paymentMethod2 ? data.paymentAmount2 : null,
        branchId: data.branchId,
        createdById: data.createdById,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    })
  })
}

export async function getSalesToday(branchId?: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const where: Record<string, unknown> = { createdAt: { gte: today, lt: tomorrow } }
  if (branchId) where.branchId = branchId
  const sales = await prisma.sale.findMany({ where, include: { items: true } })
  const total = sales.reduce((sum, s) => sum + s.total, 0)
  return { sales, total, count: sales.length }
}
