const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // ── 1. Borrar todo (orden FK: items → servicios → vehículos) ──
  await prisma.serviceItem.deleteMany({})
  await prisma.serviceHandoff.deleteMany({})
  await prisma.serviceDeletion.deleteMany({})
  await prisma.serviceCertification.deleteMany({})
  await prisma.service.deleteMany({})
  await prisma.vehicle.deleteMany({})
  console.log('Todos los vehículos y servicios eliminados')

  const branch = await prisma.branch.findFirst()
  const st = await prisma.serviceType.findMany({ take: 6 })
  if (!branch) { console.error('No hay branch'); return }
  console.log('Branch:', branch.name, '| ServiceTypes:', st.map(s => s.name))

  const now = new Date()

  const vehicles = [
    // ── GENERAL (orden #1, #2, #3) ──
    { id: 'demo-g1', plate: 'TOY-001', brand: 'Toyota',    model: 'Corolla',  clientName: 'Pedro Quispe',  clientPhone: '987111001', clientDNI: '11100001', visitType: 'general',  branchId: branch.id, arrivalOrder: 1 },
    { id: 'demo-g2', plate: 'HON-002', brand: 'Honda',     model: 'Civic',    clientName: 'Rosa Mamani',   clientPhone: '987111002', clientDNI: '11100002', visitType: 'general',  branchId: branch.id, arrivalOrder: 2 },
    { id: 'demo-g3', plate: 'CHE-003', brand: 'Chevrolet', model: 'Cruze',    clientName: 'Luis Huanca',   clientPhone: '987111003', clientDNI: '11100003', visitType: 'general',  branchId: branch.id, arrivalOrder: 3 },
    // ── GARANTIA (orden #1, #2, #3) ──
    { id: 'demo-a1', plate: 'NIS-001', brand: 'Nissan',    model: 'Sentra',   clientName: 'Maria Condori', clientPhone: '987222001', clientDNI: '22200001', visitType: 'garantia', branchId: branch.id, arrivalOrder: 4 },
    { id: 'demo-a2', plate: 'HYU-002', brand: 'Hyundai',   model: 'Tucson',   clientName: 'Jorge Apaza',   clientPhone: '987222002', clientDNI: '22200002', visitType: 'garantia', branchId: branch.id, arrivalOrder: 5 },
    { id: 'demo-a3', plate: 'SUB-003', brand: 'Subaru',    model: 'Impreza',  clientName: 'Elena Ramos',   clientPhone: '987222003', clientDNI: '22200003', visitType: 'garantia', branchId: branch.id, arrivalOrder: 6 },
    // ── REVISION (orden #1, #2, #3) ──
    { id: 'demo-r1', plate: 'VOL-001', brand: 'Volkswagen',model: 'Jetta',    clientName: 'Juan Choque',   clientPhone: '987333001', clientDNI: '33300001', visitType: 'revision', branchId: branch.id, arrivalOrder: 7 },
    { id: 'demo-r2', plate: 'PEU-002', brand: 'Peugeot',   model: '208',      clientName: 'Sandra Vega',   clientPhone: '987333002', clientDNI: '33300002', visitType: 'revision', branchId: branch.id, arrivalOrder: 8 },
    { id: 'demo-r3', plate: 'REN-003', brand: 'Renault',   model: 'Logan',    clientName: 'Hugo Paredes',  clientPhone: '987333003', clientDNI: '33300003', visitType: 'revision', branchId: branch.id, arrivalOrder: 9 },
    // ── VENTA (sin placa real, sin servicio, sin orden) ──
    { id: 'demo-v1', plate: 'S/P-001', brand: '-', model: '-', clientName: 'Gloria Sucre',  clientPhone: '987444001', clientDNI: '44400001', visitType: 'venta', branchId: branch.id, arrivalOrder: 10 },
    { id: 'demo-v2', plate: 'S/P-002', brand: '-', model: '-', clientName: 'Marcos Ticona', clientPhone: '987444002', clientDNI: '44400002', visitType: 'venta', branchId: branch.id, arrivalOrder: 11 },
    { id: 'demo-v3', plate: 'S/P-003', brand: '-', model: '-', clientName: 'Lucia Huallpa', clientPhone: '987444003', clientDNI: '44400003', visitType: 'venta', branchId: branch.id, arrivalOrder: 12 },
  ]

  // Tipos de servicio por tipo de visita
  const serviceByType = {
    general:  ['Cambio de aceite', 'Alineación y balanceo', 'Revisión de frenos'],
    garantia: ['Diagnóstico de garantía', 'Cambio de piezas garantía', 'Revisión post-garantía'],
    revision: ['Revisión técnica anual', 'Inspección de seguridad', 'Revisión de emisiones'],
  }

  let gIdx = 0, aIdx = 0, rIdx = 0

  for (const v of vehicles) {
    await prisma.vehicle.create({ data: { ...v, entryTime: now } })

    if (v.visitType === 'general') {
      const sname = serviceByType.general[gIdx % 3]
      await prisma.service.create({ data: { vehicleId: v.id, serviceType: sname } })
      gIdx++
    } else if (v.visitType === 'garantia') {
      const sname = serviceByType.garantia[aIdx % 3]
      await prisma.service.create({ data: { vehicleId: v.id, serviceType: sname } })
      aIdx++
    } else if (v.visitType === 'revision') {
      const sname = serviceByType.revision[rIdx % 3]
      await prisma.service.create({ data: { vehicleId: v.id, serviceType: sname } })
      rIdx++
    }
    // venta: sin servicio
  }

  console.log('✓ 12 vehículos creados: 3 general, 3 garantia, 3 revision, 3 venta')

  // ── Productos de prueba E2E ──
  await prisma.saleItem.deleteMany({ where: { product: { name: { contains: 'Pruebax' } } } })
  await prisma.stockEntry.deleteMany({ where: { product: { name: { contains: 'Pruebax' } } } })
  await prisma.product.deleteMany({ where: { name: { contains: 'Pruebax' } } })

  const branches = await prisma.branch.findMany({ orderBy: { createdAt: 'asc' } })
  for (const b of branches) {
    await prisma.product.create({
      data: {
        name: 'Pruebax',
        price: 25.50,
        cost: 15.00,
        stock: 50,
        unit: 'unidad',
        category: 'TEST',
        minStock: 5,
        active: true,
        branchId: b.id,
      }
    })
    await prisma.product.create({
      data: {
        name: 'Pruebax2',
        price: 10.00,
        cost: 6.00,
        stock: 30,
        unit: 'unidad',
        category: 'TEST',
        minStock: 3,
        active: true,
        branchId: b.id,
      }
    })
  }
  console.log('✓ Productos de prueba "Pruebax" y "Pruebax2" creados en todas las sedes')

  // ── Cliente de prueba E2E (ClientContact conocido) ──
  await prisma.clientContact.upsert({
    where: { dni: '99887700' },
    create: { name: 'Ana Torres E2E', dni: '99887700', phone: '999000111' },
    update: { name: 'Ana Torres E2E', phone: '999000111' },
  })
  console.log('✓ ClientContact de prueba "Ana Torres E2E" (DNI 99887700) listo')

  // ── Usuario certifier de prueba E2E ──
  const bcrypt = require('bcryptjs')
  const certHash = await bcrypt.hash('cert123', 10)
  await prisma.user.upsert({
    where: { username: 'certifier' },
    create: {
      username: 'certifier',
      name: 'Pedro Certificador',
      password: certHash,
      role: 'CERTIFIER',
      branchId: branch.id,
      active: true,
    },
    update: {
      name: 'Pedro Certificador',
      password: certHash,
      role: 'CERTIFIER',
      branchId: branch.id,
      active: true,
    },
  })
  console.log('✓ Usuario certifier "certifier" (contraseña: cert123) listo')

  // ── Servicios COMPLETED para la cola de certificación ──
  // Obtener el mecánico juan para asignarlo
  const mechJuan = await prisma.user.findFirst({ where: { username: 'juan' } })

  // Crear 2 vehículos completados (no activos) para certificar
  // ServiceDeletion no soporta filtro anidado por vehicle → obtener IDs primero
  const oldCertVehicles = await prisma.vehicle.findMany({
    where: { plate: { in: ['CERT-001', 'CERT-002'] } },
    select: { id: true },
  })
  if (oldCertVehicles.length > 0) {
    const oldVIds = oldCertVehicles.map(v => v.id)
    const oldServices = await prisma.service.findMany({
      where: { vehicleId: { in: oldVIds } },
      select: { id: true },
    })
    const oldSIds = oldServices.map(s => s.id)
    if (oldSIds.length > 0) {
      await prisma.serviceItem.deleteMany({ where: { serviceId: { in: oldSIds } } })
      await prisma.serviceDeletion.deleteMany({ where: { serviceId: { in: oldSIds } } })
      await prisma.serviceHandoff.deleteMany({ where: { serviceId: { in: oldSIds } } })
      await prisma.serviceCertification.deleteMany({ where: { serviceId: { in: oldSIds } } })
      await prisma.service.deleteMany({ where: { id: { in: oldSIds } } })
    }
    await prisma.vehicle.deleteMany({ where: { id: { in: oldVIds } } })
  }

  const certVehicle1 = await prisma.vehicle.create({
    data: {
      id: 'cert-v1',
      plate: 'CERT-001',
      brand: 'Toyota',
      model: 'Yaris',
      clientName: 'Cliente Cert1',
      clientPhone: '987000001',
      clientDNI: '88800001',
      visitType: 'general',
      branchId: branch.id,
      arrivalOrder: 20,
      entryTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // hace 3 horas
    }
  })
  const certVehicle2 = await prisma.vehicle.create({
    data: {
      id: 'cert-v2',
      plate: 'CERT-002',
      brand: 'Honda',
      model: 'Jazz',
      clientName: 'Cliente Cert2',
      clientPhone: '987000002',
      clientDNI: '88800002',
      visitType: 'garantia',
      branchId: branch.id,
      arrivalOrder: 21,
      entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // hace 2 horas
    }
  })

  const completedTime = new Date(Date.now() - 30 * 60 * 1000) // hace 30 min

  await prisma.service.create({
    data: {
      vehicleId: certVehicle1.id,
      serviceType: 'Cambio de aceite',
      status: 'COMPLETED',
      mechanicId: mechJuan?.id ?? null,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      completionTime: completedTime,
      description: 'Cambio completo de aceite y filtro',
    }
  })
  await prisma.service.create({
    data: {
      vehicleId: certVehicle2.id,
      serviceType: 'Diagnóstico de garantía',
      status: 'COMPLETED',
      mechanicId: mechJuan?.id ?? null,
      startTime: new Date(Date.now() - 90 * 60 * 1000),
      completionTime: completedTime,
      description: 'Diagnóstico eléctrico y revisión de garantía',
    }
  })
  console.log('✓ 2 servicios COMPLETED (CERT-001, CERT-002) listos para certificar')
}

main().catch(console.error).finally(() => prisma.$disconnect())
