"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Car, Wrench, Phone, User, CreditCard, Calendar } from "lucide-react"
import type { Vehicle, Service, User as UserModel } from "@prisma/client"

type ServiceWithMechanic = Service & { mechanic: { name: string } }
type VehicleWithDetails = Vehicle & { services: ServiceWithMechanic[]; branch: { name: string } }

interface ClientData {
  clientName: string
  clientDNI: string
  clientPhone: string
  vehicles: VehicleWithDetails[]
}

interface ClientDetailClientProps {
  client: ClientData
}

const statusLabels: Record<string, { label: string; class: string }> = {
  ACTIVE: { label: "Activo", class: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "Completado", class: "bg-green-100 text-green-800" },
  PENDING: { label: "Pendiente", class: "bg-yellow-100 text-yellow-800" },
  IN_PROGRESS: { label: "En Progreso", class: "bg-blue-100 text-blue-800" },
}

export function ClientDetailClient({ client }: ClientDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"vehicles" | "services">("vehicles")

  const allServices = client.vehicles.flatMap((v) =>
    v.services.map((s) => ({ ...s, vehiclePlate: v.plate, vehicleBrand: v.brand, vehicleModel: v.model }))
  )
  const totalIncome = allServices.reduce((sum, s) => sum + (s.price ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clientes">
          <Button variant="outline" size="icon" className="h-10 w-10 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{client.clientName}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> {client.clientDNI}
            </span>
            <a href={`tel:${client.clientPhone}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 cursor-pointer">
              <Phone className="w-3.5 h-3.5" /> {client.clientPhone}
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Car className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-900">{client.vehicles.length}</p>
            <p className="text-xs text-slate-500">Vehículos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wrench className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-900">{allServices.length}</p>
            <p className="text-xs text-slate-500">Servicios</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Total</p>
            <p className="text-xl font-bold text-emerald-600">S/ {totalIncome.toFixed(2)}</p>
            <p className="text-xs text-slate-500">Ingresos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("vehicles")}
          className={`px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "vehicles"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Car className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Vehículos ({client.vehicles.length})
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={`px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "services"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Wrench className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Servicios ({allServices.length})
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "vehicles" ? (
        <div className="space-y-3">
          {client.vehicles.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {v.brand.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">{v.brand} {v.model}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${statusLabels[v.status]?.class}`}>
                        {statusLabels[v.status]?.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{v.plate} · {v.year}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Ingreso: {new Date(v.entryTime).toLocaleDateString("es-PE", { timeZone: "America/Lima" })}
                      </span>
                      {v.exitTime && (
                        <span className="flex items-center gap-1">
                          Salida: {new Date(v.exitTime).toLocaleDateString("es-PE", { timeZone: "America/Lima" })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{v.branch.name}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-md font-semibold">
                        {v.services.length} servicios
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {client.vehicles.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">No hay vehículos registrados</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {allServices.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white flex-shrink-0">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">{s.serviceType}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${statusLabels[s.status]?.class}`}>
                        {statusLabels[s.status]?.label}
                      </span>
                    </div>
                    {s.description && (
                      <p className="text-xs text-slate-600 mt-0.5">{s.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span className="font-mono">{s.vehiclePlate}</span>
                      <span>{s.vehicleBrand} {s.vehicleModel}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3" /> {s.mechanic.name}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(s.startTime).toLocaleDateString("es-PE", { timeZone: "America/Lima" })}
                      </span>
                      {s.price != null && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          S/ {s.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {allServices.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">No hay servicios registrados</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
