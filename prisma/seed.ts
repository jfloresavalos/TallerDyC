import { PrismaClient, UserRole } from "@prisma/client"
import { hashSync } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Crear sedes
  const sede1 = await prisma.branch.upsert({
    where: { code: "sede1" },
    update: {},
    create: { name: "Sede 1", code: "sede1" },
  })

  const sede2 = await prisma.branch.upsert({
    where: { code: "sede2" },
    update: {},
    create: { name: "Sede 2", code: "sede2" },
  })

  console.log("Branches created:", sede1.name, sede2.name)

  // Crear usuarios
  const users = [
    { username: "admin", name: "Administrador", password: "admin123", role: UserRole.ADMIN, branchId: null },
    { username: "receptionist", name: "Recepcionista", password: "1234", role: UserRole.RECEPTIONIST, branchId: sede1.id },
    { username: "juan", name: "Juan García", password: "1234", role: UserRole.MECHANIC, branchId: sede1.id },
    { username: "carlos", name: "Carlos López", password: "1234", role: UserRole.MECHANIC, branchId: sede1.id },
    { username: "pedro", name: "Pedro Martínez", password: "1234", role: UserRole.MECHANIC, branchId: sede2.id },
    { username: "luis", name: "Luis Rodríguez", password: "1234", role: UserRole.MECHANIC, branchId: sede2.id },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
        name: user.name,
        password: hashSync(user.password, 10),
        role: user.role,
        branchId: user.branchId,
      },
    })
    console.log(`User created: ${user.username} (${user.role})`)
  }

  // Crear empresa
  await prisma.company.upsert({
    where: { id: "default-company" },
    update: {},
    create: {
      id: "default-company",
      name: "DyC Conversiones",
    },
  })

  console.log("Company created: DyC Conversiones")
  console.log("Seed completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
