import prisma from "../lib/prisma"

const SERVICE_TYPES = [
  "Cambio de aceite",
  "Cambio de filtro de aire",
  "Cambio de filtro de aceite",
  "Cambio de filtro de combustible",
  "Cambio de bujías",
  "Revisión de frenos",
  "Cambio de pastillas de freno",
  "Alineación y balanceo",
  "Cambio de llantas",
  "Revisión eléctrica",
  "Cambio de batería",
  "Revisión de suspensión",
  "Cambio de amortiguadores",
  "Revisión de motor",
  "Limpieza de inyectores",
  "Cambio de correa de distribución",
  "Cambio de líquido de frenos",
  "Revisión de transmisión",
  "Cambio de aceite de caja",
  "Otro",
]

async function main() {
  console.log("Seeding service types...")
  let created = 0
  for (const name of SERVICE_TYPES) {
    await prisma.serviceType.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    created++
  }
  console.log(`✓ ${created} tipos de servicio creados/verificados`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
