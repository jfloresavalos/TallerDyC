"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { getCompletedVehiclesForReport } from "@/lib/actions/vehicles"
import { BranchSelector } from "@/components/taller/branch-selector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Car, Wrench, Clock } from "lucide-react"
import type { Branch, Vehicle, Service, User } from "@prisma/client"

type VehicleWithRelations = Vehicle & { branch: Branch; services: (Service & { mechanic: User })[] }

interface ReportServicesClientProps {
  initialVehicles: VehicleWithRelations[]
  branches: Branch[]
}

export function ReportServicesClient({ initialVehicles, branches }: ReportServicesClientProps) {
  const [vehicles, setVehicles] = useState(initialVehicles)
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const handleBranchChange = async (branchId: string | "all") => {
    setSelectedBranch(branchId)
    const updated = await getCompletedVehiclesForReport(
      branchId === "all" ? undefined : branchId,
      dateFrom || undefined,
      dateTo || undefined,
    )
    setVehicles(updated as VehicleWithRelations[])
  }

  const handleDateFilter = async () => {
    const updated = await getCompletedVehiclesForReport(
      selectedBranch === "all" ? undefined : selectedBranch,
      dateFrom || undefined,
      dateTo || undefined,
    )
    setVehicles(updated as VehicleWithRelations[])
  }

  const filteredVehicles = useMemo(() => {
    if (!searchQuery) return vehicles
    const q = searchQuery.toLowerCase()
    return vehicles.filter(
      (v) =>
        v.plate.toLowerCase().includes(q) ||
        v.clientName.toLowerCase().includes(q) ||
        v.clientDNI.includes(q)
    )
  }, [vehicles, searchQuery])

  const totalServices = useMemo(
    () => filteredVehicles.reduce((sum, v) => sum + v.services.length, 0),
    [filteredVehicles]
  )

  const avgDuration = useMemo(() => {
    const durations = filteredVehicles
      .filter((v) => v.exitTime)
      .map((v) => new Date(v.exitTime!).getTime() - new Date(v.entryTime).getTime())
    if (durations.length === 0) return 0
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60000)
  }, [filteredVehicles])

  const formatTime = (date: Date | string) =>
    new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("es-PE")

  const calculateDuration = (entryTime: Date | string, exitTime: Date | string | null) => {
    if (!exitTime) return "En proceso"
    const mins = Math.floor((new Date(exitTime).getTime() - new Date(entryTime).getTime()) / 60000)
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/reportes">
          <Button variant="outline" size="icon" className="h-10 w-10 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Servicios Realizados</h1>
          <p className="text-sm text-muted-foreground">Historial de servicios completados por vehículo</p>
        </div>
      </div>

      <BranchSelector branches={branches} selected={selectedBranch} onChange={handleBranchChange} />

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Desde</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Hasta</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10" />
            </div>
          </div>
          <Button onClick={handleDateFilter} className="w-full h-10 cursor-pointer">Aplicar Filtro de Fecha</Button>
          <Input
            placeholder="Buscar por placa, cliente o DNI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10"
          />
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 text-center">
            <Car className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <p className="text-2xl font-bold text-blue-600">{filteredVehicles.length}</p>
            <p className="text-xs text-blue-700">Vehículos</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 text-center">
            <Wrench className="w-5 h-5 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold text-green-600">{totalServices}</p>
            <p className="text-xs text-green-700">Servicios</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4 text-center">
            <Clock className="w-5 h-5 mx-auto text-orange-600 mb-1" />
            <p className="text-2xl font-bold text-orange-600">{avgDuration}m</p>
            <p className="text-xs text-orange-700">Promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle list */}
      {filteredVehicles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No se encontraron vehículos completados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{vehicle.brand} {vehicle.model}</CardTitle>
                    <CardDescription className="font-mono">{vehicle.plate}</CardDescription>
                    <CardDescription className="text-xs mt-1">{vehicle.branch.name}</CardDescription>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0 text-xs">Completado</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-medium">{vehicle.clientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">DNI</p>
                    <p className="font-medium">{vehicle.clientDNI}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Entrada</p>
                    <p className="font-medium">{formatDate(vehicle.entryTime)} {formatTime(vehicle.entryTime)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Salida</p>
                    <p className="font-medium">{vehicle.exitTime ? `${formatDate(vehicle.exitTime)} ${formatTime(vehicle.exitTime)}` : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duración</p>
                    <p className="font-medium">{calculateDuration(vehicle.entryTime, vehicle.exitTime)}</p>
                  </div>
                </div>
                {vehicle.services.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Servicios Realizados</p>
                    <div className="space-y-2">
                      {vehicle.services.map((service) => (
                        <div key={service.id} className="p-2.5 bg-muted rounded-lg text-sm">
                          <p className="font-medium">{service.serviceType}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {service.mechanic.name} - {formatTime(service.startTime)}
                          </p>
                          {service.price != null && (
                            <p className="text-xs font-medium text-green-600 mt-0.5">
                              S/. {service.price.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
