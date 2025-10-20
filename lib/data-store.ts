// Data management with localStorage

export const PREDEFINED_SERVICES = [
  "Cambio de aceite",
  "Cambio de filtro de aire",
  "Cambio de filtro de combustible",
  "Revisión de frenos",
  "Cambio de pastillas de freno",
  "Alineación",
  "Balanceo de llantas",
  "Cambio de llantas",
  "Revisión de suspensión",
  "Cambio de batería",
  "Revisión de motor",
  "Reparación de transmisión",
  "Revisión de sistema eléctrico",
  "Lavado y detallado",
  "Reparación de carrocería",
  "Pintura",
  "Cambio de correa de distribución",
  "Revisión de radiador",
  "Reparación de aire acondicionado",
  "Otro",
]

export interface Vehicle {
  id: string
  plate: string
  brand: string
  model: string
  year: number
  clientName: string
  clientPhone: string
  clientDNI: string
  entryTime: string
  exitTime: string | null
  branch: "sede1" | "sede2"
  status: "active" | "completed"
  arrivalOrder: number
}

export interface Service {
  id: string
  vehicleId: string
  serviceType: string // Predefined service type
  description: string // Additional details
  mechanicId: string
  mechanicName: string
  startTime: string
  completionTime: string | null
  status: "in-progress" | "completed" | "pending-correction"
  correctionRequested?: boolean
  correctionReason?: string
  price: number | null
}

const VEHICLES_KEY = "vehicles"
const SERVICES_KEY = "services"

export function getVehicles(): Vehicle[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(VEHICLES_KEY)
  return data ? JSON.parse(data) : []
}

export function addVehicle(vehicle: Omit<Vehicle, "id" | "arrivalOrder">): Vehicle {
  const vehicles = getVehicles()
  const vehiclesInBranch = vehicles.filter((v) => v.branch === vehicle.branch)
  const arrivalOrder = vehiclesInBranch.length + 1
  const newVehicle: Vehicle = {
    ...vehicle,
    id: Date.now().toString(),
    arrivalOrder,
  }
  vehicles.push(newVehicle)
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles))
  return newVehicle
}

export function updateVehicle(id: string, updates: Partial<Vehicle>): Vehicle | null {
  const vehicles = getVehicles()
  const index = vehicles.findIndex((v) => v.id === id)
  if (index === -1) return null
  vehicles[index] = { ...vehicles[index], ...updates }
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles))
  return vehicles[index]
}

export function getVehiclesByBranch(branch: "sede1" | "sede2"): Vehicle[] {
  return getVehicles().filter((v) => v.branch === branch)
}

export function getActiveVehicles(branch: "sede1" | "sede2"): Vehicle[] {
  return getVehicles()
    .filter((v) => v.branch === branch && v.status === "active")
    .sort((a, b) => a.arrivalOrder - b.arrivalOrder)
}

export function hasServices(vehicleId: string): boolean {
  return getServices().some((s) => s.vehicleId === vehicleId && s.status !== "pending-correction")
}

export function getServices(): Service[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(SERVICES_KEY)
  return data ? JSON.parse(data) : []
}

export function addService(service: Omit<Service, "id" | "price">): Service {
  const services = getServices()
  const newService: Service = {
    ...service,
    id: Date.now().toString(),
    price: null,
  }
  services.push(newService)
  localStorage.setItem(SERVICES_KEY, JSON.stringify(services))
  return newService
}

export function updateService(id: string, updates: Partial<Service>): Service | null {
  const services = getServices()
  const index = services.findIndex((s) => s.id === id)
  if (index === -1) return null
  services[index] = { ...services[index], ...updates }
  localStorage.setItem(SERVICES_KEY, JSON.stringify(services))
  return services[index]
}

export function getServicesByVehicle(vehicleId: string): Service[] {
  return getServices().filter((s) => s.vehicleId === vehicleId)
}

export function getServicesByMechanic(mechanicId: string): Service[] {
  return getServices().filter((s) => s.mechanicId === mechanicId)
}
