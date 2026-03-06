"use server"

import prisma from "@/lib/prisma"

export async function getBrands() {
  return prisma.carBrand.findMany({
    where: { active: true },
    include: {
      _count: { select: { models: { where: { active: true } } } },
    },
    orderBy: { name: "asc" },
  })
}

export async function getBrandWithModels(brandId: string) {
  return prisma.carBrand.findUnique({
    where: { id: brandId },
    include: {
      models: {
        where: { active: true },
        orderBy: { name: "asc" },
      },
    },
  })
}

export async function createBrand(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("El nombre de la marca es requerido")

  const exists = await prisma.carBrand.findUnique({ where: { name: trimmed } })
  if (exists) {
    if (!exists.active) {
      return prisma.carBrand.update({ where: { id: exists.id }, data: { active: true } })
    }
    throw new Error("Ya existe una marca con ese nombre")
  }

  return prisma.carBrand.create({ data: { name: trimmed } })
}

export async function updateBrand(id: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("El nombre de la marca es requerido")

  return prisma.carBrand.update({ where: { id }, data: { name: trimmed } })
}

export async function deleteBrand(id: string) {
  await prisma.carModel.updateMany({ where: { brandId: id }, data: { active: false } })
  return prisma.carBrand.update({ where: { id }, data: { active: false } })
}

export async function createModel(brandId: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("El nombre del modelo es requerido")

  const exists = await prisma.carModel.findUnique({
    where: { name_brandId: { name: trimmed, brandId } },
  })
  if (exists) {
    if (!exists.active) {
      return prisma.carModel.update({ where: { id: exists.id }, data: { active: true } })
    }
    throw new Error("Ya existe un modelo con ese nombre en esta marca")
  }

  return prisma.carModel.create({ data: { name: trimmed, brandId } })
}

export async function updateModel(id: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("El nombre del modelo es requerido")

  return prisma.carModel.update({ where: { id }, data: { name: trimmed } })
}

export async function deleteModel(id: string) {
  return prisma.carModel.update({ where: { id }, data: { active: false } })
}

export async function getBrandsForSelect() {
  return prisma.carBrand.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      models: {
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })
}
