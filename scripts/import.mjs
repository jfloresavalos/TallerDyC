// Node ES module script to import exported localStorage JSON into Postgres via Prisma
// Usage: node scripts/import.mjs data/export.json

import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: node scripts/import.mjs <path-to-export.json>')
    process.exit(1)
  }
  const filePath = path.resolve(process.cwd(), arg)
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath)
    process.exit(1)
  }
  const raw = fs.readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw)
  const vehicles = data.vehicles || []
  const services = data.services || []

  console.log(`Importing ${vehicles.length} vehicles and ${services.length} services...`)

  for (const v of vehicles) {
    try {
      // upsert to avoid duplicates
      await prisma.vehicle.upsert({
        where: { id: v.id },
        update: {
          ...mapVehicleFields(v)
        },
        create: {
          id: v.id,
          ...mapVehicleFields(v)
        }
      })
    } catch (e) {
      console.error('Error importing vehicle', v.id, e)
    }
  }

  for (const s of services) {
    try {
      await prisma.service.upsert({
        where: { id: s.id },
        update: {
          ...mapServiceFields(s)
        },
        create: {
          id: s.id,
          ...mapServiceFields(s)
        }
      })
    } catch (e) {
      console.error('Error importing service', s.id, e)
    }
  }

  console.log('Import finished')
}

function mapVehicleFields(v) {
  return {
    plate: v.plate || '',
    brand: v.brand || '',
    model: v.model || '',
    year: v.year ? Number(v.year) : 0,
    clientName: v.clientName || '',
    clientPhone: v.clientPhone || '',
    clientDNI: v.clientDNI || '',
    entryTime: v.entryTime ? new Date(v.entryTime) : new Date(),
    exitTime: v.exitTime ? new Date(v.exitTime) : null,
    branch: v.branch || '',
    status: v.status || 'active',
    arrivalOrder: v.arrivalOrder ? Number(v.arrivalOrder) : 0
  }
}

function mapServiceFields(s) {
  return {
    vehicleId: s.vehicleId,
    serviceType: s.serviceType || '',
    description: s.description || '',
    mechanicId: s.mechanicId || '',
    mechanicName: s.mechanicName || '',
    startTime: s.startTime ? new Date(s.startTime) : new Date(),
    completionTime: s.completionTime ? new Date(s.completionTime) : null,
    status: s.status || 'in-progress',
    correctionRequested: s.correctionRequested || false,
    correctionReason: s.correctionReason || null,
    price: s.price != null ? Number(s.price) : null
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
