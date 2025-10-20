"use client"

import { useState, useEffect } from "react"
import { getVehicles, getServices, getServicesByMechanic, type Vehicle, type Service } from "@/lib/data-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ReportsProps {
  branch: "sede1" | "sede2" | "both"
  isAdmin: boolean
  mechanicId: string
  onBranchChange?: (branch: "sede1" | "sede2" | "both") => void
}

export default function Reports({ branch, isAdmin, mechanicId, onBranchChange }: ReportsProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0])
  const [searchQuery, setSearchQuery] = useState("")
  const [localBranch, setLocalBranch] = useState<"sede1" | "sede2" | "both">(branch)

  useEffect(() => {
    const branchToUse = isAdmin ? localBranch : branch
    let allVehicles: Vehicle[] = []

    if (branchToUse === "both") {
      const sede1 = getVehicles().filter((v) => v.branch === "sede1")
      const sede2 = getVehicles().filter((v) => v.branch === "sede2")
      allVehicles = [...sede1, ...sede2]
    } else {
      allVehicles = getVehicles().filter((v) => v.branch === branchToUse)
    }

    setVehicles(allVehicles)

    if (isAdmin) {
      setServices(getServices())
    } else {
      setServices(getServicesByMechanic(mechanicId))
    }
  }, [branch, isAdmin, mechanicId, localBranch])

  const handleBranchChange = (newBranch: "sede1" | "sede2" | "both") => {
    setLocalBranch(newBranch)
    onBranchChange?.(newBranch)
  }

  const activeVehicles = vehicles.filter((v) => v.status === "active")
  const completedVehicles = vehicles.filter((v) => v.status === "completed")

  const filteredCompletedVehicles = dateFilter
    ? completedVehicles.filter((v) => {
        const vehicleDate = new Date(v.exitTime || "").toLocaleDateString("es-PE")
        return vehicleDate === new Date(dateFilter).toLocaleDateString("es-PE")
      })
    : completedVehicles

  const visibleCompletedVehicles = isAdmin
    ? filteredCompletedVehicles
    : filteredCompletedVehicles.filter((v) => {
        const vehicleServices = services.filter((s) => s.vehicleId === v.id)
        return vehicleServices.length > 0
      })

  const filteredBySearch = searchQuery
    ? visibleCompletedVehicles.filter(
        (v) => v.plate.toLowerCase().includes(searchQuery.toLowerCase()) || v.clientDNI.includes(searchQuery),
      )
    : visibleCompletedVehicles

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("es-CO")
  }

  const calculateDuration = (entryTime: string, exitTime: string | null) => {
    if (!exitTime) return "En proceso"
    const entry = new Date(entryTime)
    const exit = new Date(exitTime)
    const minutes = Math.floor((exit.getTime() - entry.getTime()) / 60000)
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-semibold">Reportes</h2>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Historial de autos y servicios realizados" : "Tus servicios asignados"}
        </p>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <label className="text-sm font-medium text-slate-700 block mb-3">Seleccionar Sede:</label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={localBranch === "sede1" ? "default" : "outline"}
              size="sm"
              onClick={() => handleBranchChange("sede1")}
              className="text-xs md:text-sm"
            >
              Sede 1
            </Button>
            <Button
              variant={localBranch === "sede2" ? "default" : "outline"}
              size="sm"
              onClick={() => handleBranchChange("sede2")}
              className="text-xs md:text-sm"
            >
              Sede 2
            </Button>
            <Button
              variant={localBranch === "both" ? "default" : "outline"}
              size="sm"
              onClick={() => handleBranchChange("both")}
              className="text-xs md:text-sm"
            >
              Ambos
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="completed" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="completed" className="text-xs md:text-sm">
            Completados
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="history" className="text-xs md:text-sm">
              Historial
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="completed" className="space-y-4">
          {isAdmin && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Filtrar por fecha - Sede:{" "}
                {localBranch === "sede1" ? "Sede 1" : localBranch === "sede2" ? "Sede 2" : "Ambas"}
              </label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {visibleCompletedVehicles.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No hay autos completados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredBySearch.map((vehicle) => {
                const vehicleServices = services.filter((s) => s.vehicleId === vehicle.id)
                return (
                  <Card key={vehicle.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base">
                            {vehicle.brand} {vehicle.model}
                          </CardTitle>
                          <CardDescription className="font-mono text-xs md:text-sm">{vehicle.plate}</CardDescription>
                          <CardDescription className="text-xs mt-1">
                            Sede: {vehicle.branch === "sede1" ? "Sede 1" : "Sede 2"}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0">
                          Completado
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="font-medium text-xs md:text-sm">Cliente</p>
                          <p className="text-xs md:text-sm text-muted-foreground">{vehicle.clientName}</p>
                        </div>
                        <div>
                          <p className="font-medium text-xs md:text-sm">DNI</p>
                          <p className="text-xs md:text-sm text-muted-foreground">{vehicle.clientDNI}</p>
                        </div>
                        <div>
                          <p className="font-medium text-xs md:text-sm">Teléfono</p>
                          <p className="text-xs md:text-sm text-muted-foreground">{vehicle.clientPhone}</p>
                        </div>
                        <div>
                          <p className="font-medium text-xs md:text-sm">Entrada</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {formatDate(vehicle.entryTime)} {formatTime(vehicle.entryTime)}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-xs md:text-sm">Salida</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {vehicle.exitTime ? formatTime(vehicle.exitTime) : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-xs md:text-sm">Duración</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {calculateDuration(vehicle.entryTime, vehicle.exitTime)}
                          </p>
                        </div>
                      </div>

                      {vehicleServices.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="font-medium text-xs md:text-sm mb-2">Servicios Realizados</p>
                          <div className="space-y-2">
                            {vehicleServices.map((service) => (
                              <div key={service.id} className="p-2 bg-muted rounded text-xs md:text-sm">
                                <p className="font-medium">{service.serviceType}</p>
                                <p className="text-xs text-muted-foreground">
                                  {service.mechanicName} • {formatTime(service.startTime)}
                                </p>
                                {service.price && (
                                  <p className="text-xs font-medium text-green-600">
                                    Precio: S/. {service.price.toLocaleString("es-PE")}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="history" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar por placa o DNI</label>
              <Input
                placeholder="Ej: ABC-1234 o 12345678"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {searchQuery && filteredBySearch.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No se encontraron resultados</p>
                </CardContent>
              </Card>
            ) : searchQuery ? (
              <div className="space-y-3">
                {filteredBySearch.map((vehicle) => {
                  const vehicleServices = services.filter((s) => s.vehicleId === vehicle.id)
                  return (
                    <Card key={vehicle.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base">
                              {vehicle.brand} {vehicle.model}
                            </CardTitle>
                            <CardDescription className="font-mono text-xs md:text-sm">{vehicle.plate}</CardDescription>
                            <CardDescription className="text-xs mt-1">
                              Sede: {vehicle.branch === "sede1" ? "Sede 1" : "Sede 2"}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="flex-shrink-0">
                            Completado
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="font-medium text-xs md:text-sm">Cliente</p>
                            <p className="text-xs md:text-sm text-muted-foreground">{vehicle.clientName}</p>
                          </div>
                          <div>
                            <p className="font-medium text-xs md:text-sm">DNI</p>
                            <p className="text-xs md:text-sm text-muted-foreground">{vehicle.clientDNI}</p>
                          </div>
                          <div>
                            <p className="font-medium text-xs md:text-sm">Entrada</p>
                            <p className="text-xs md:text-sm text-muted-foreground">
                              {formatDate(vehicle.entryTime)} {formatTime(vehicle.entryTime)}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-xs md:text-sm">Salida</p>
                            <p className="text-xs md:text-sm text-muted-foreground">
                              {vehicle.exitTime ? formatTime(vehicle.exitTime) : "N/A"}
                            </p>
                          </div>
                        </div>

                        {vehicleServices.length > 0 && (
                          <div className="border-t pt-3">
                            <p className="font-medium text-xs md:text-sm mb-2">Servicios Realizados</p>
                            <div className="space-y-2">
                              {vehicleServices.map((service) => (
                                <div key={service.id} className="p-2 bg-muted rounded text-xs md:text-sm">
                                  <p className="font-medium">{service.serviceType}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {service.mechanicName} • {formatTime(service.startTime)}
                                  </p>
                                  {service.description && <p className="text-xs mt-1">{service.description}</p>}
                                  {service.price && (
                                    <p className="text-xs font-medium text-green-600">
                                      Precio: S/. {service.price.toLocaleString("es-PE")}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">Ingresa una placa o DNI para buscar</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
