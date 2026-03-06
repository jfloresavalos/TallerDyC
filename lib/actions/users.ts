"use server"

import prisma from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { hashSync } from "bcryptjs"

export async function getUsers() {
  return prisma.user.findMany({
    where: { active: true },
    include: { branch: true },
    orderBy: { name: "asc" },
  })
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { branch: true },
  })
}

export async function createUser(data: {
  username: string
  name: string
  password: string
  role: UserRole
  branchId: string | null
}) {
  return prisma.user.create({
    data: {
      ...data,
      password: hashSync(data.password, 10),
    },
  })
}

export async function updateUser(id: string, data: {
  name?: string
  password?: string
  role?: UserRole
  branchId?: string | null
}) {
  const updateData: Record<string, unknown> = { ...data }
  if (data.password) {
    updateData.password = hashSync(data.password, 10)
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
  })
}

export async function deleteUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { active: false },
  })
}

export async function getMechanicsByBranch(branchId: string) {
  return prisma.user.findMany({
    where: {
      role: UserRole.MECHANIC,
      branchId,
      active: true,
    },
    orderBy: { name: "asc" },
  })
}

export async function getBranches() {
  return prisma.branch.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
  })
}

export async function createBranch(data: {
  name: string
  code: string
  address?: string
  phone?: string
}) {
  return prisma.branch.create({ data })
}

export async function updateBranch(id: string, data: {
  name?: string
  address?: string
  phone?: string
}) {
  return prisma.branch.update({ where: { id }, data })
}

export async function deleteBranch(id: string) {
  const [userCount, vehicleCount] = await Promise.all([
    prisma.user.count({ where: { branchId: id, active: true } }),
    prisma.vehicle.count({ where: { branchId: id, status: "ACTIVE" } }),
  ])

  if (userCount > 0 || vehicleCount > 0) {
    throw new Error("No se puede eliminar una sede con usuarios o vehículos activos")
  }

  return prisma.branch.update({ where: { id }, data: { active: false } })
}
