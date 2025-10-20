"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  getActiveVehicles,
  addService,
  getServicesByVehicle,
  PREDEFINED_SERVICES,
  type Vehicle,
} from "@/lib/data-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface ServiceAssignmentProps {
  mechanicId: string
  mechanicName: string
  branch: "sede1" | "sede2"
  onSuccess: () => void
  isAdmin?: boolean
}

export default function ServiceAssignment({
  mechanicId,
  mechanicName,
  branch,
  onSuccess,
  isAdmin = false,
}: ServiceAssignmentProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [selectedService, setSelectedService] = useState("")
  const [description, setDescription] = useState("")
  const [selectedMechanicId, setSelectedMechanicId] = useState(mechanicId)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [localBranch, setLocalBranch] = useState<"sede1" | "sede2" | "both">(isAdmin ? "both" : branch)

  const mechanics = [
    { id: "juan", name: "Juan García" },
    { id: "carlos", name: "Carlos López" },
    { id: "pedro", name: "Pedro Martínez" },
    { id: "luis", name: "Luis Rodríguez" },
  ]

  useEffect(() => {
    const loadVehicles = () => {
      let allVehicles: Vehicle[] = []
      if (localBranch === "both") {
        const sede1 = getActiveVehicles("sede1")
        const sede2 = getActiveVehicles("sede2")
        allVehicles = [...sede1, ...sede2]
      } else {
        allVehicles = getActiveVehicles(localBranch)
      }

      const vehiclesWithoutServices = allVehicles.filter((vehicle) => {
        const services = getServicesByVehicle(vehicle.id)
        return services.length === 0
      })
      setVehicles(vehiclesWithoutServices)
    }

    loadVehicles()
    const interval = setInterval(loadVehicles, 1000)
    return () => clearInterval(interval)
  }, [localBranch])

  const handleAssignService = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedVehicle || !selectedService.trim()) {
      return
    }

    if (isAdmin && !selectedMechanicId) {
      alert("Por favor selecciona un mecánico")
      return
    }

    setIsLoading(true)

    try {
      const selectedMechanic = mechanics.find((m) => m.id === selectedMechanicId)
      const assignedMechanicName = selectedMechanic?.name || mechanicName

      const newService = addService({
        vehicleId: selectedVehicle.id,
        serviceType: selectedService,
        description: description.trim(),
        mechanicId: selectedMechanicId,
        mechanicName: assignedMechanicName,
        startTime: new Date().toISOString(),
        completionTime: null,
        status: "in-progress",
      })

      setSuccess(true)
      setDescription("")
      setSelectedService("")
      setSelectedVehicle(null)
      setSelectedMechanicId(mechanicId)
      setDialogOpen(false)

      setTimeout(() => {
        setSuccess(false)
        let allVehicles: Vehicle[] = []
        if (localBranch === "both") {
          const sede1 = getActiveVehicles("sede1")
          const sede2 = getActiveVehicles("sede2")
          allVehicles = [...sede1, ...sede2]
        } else {
          allVehicles = getActiveVehicles(localBranch)
        }
        const vehiclesWithoutServices = allVehicles.filter((vehicle) => {
          const services = getServicesByVehicle(vehicle.id)
          return services.length === 0
        })
        setVehicles(vehiclesWithoutServices)
        onSuccess()
      }, 2000)
    } catch (error) {
      console.error("Error assigning service:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Asignar Servicio</h2>
        <p className="text-sm text-muted-foreground">Selecciona un auto, servicio y mecánico responsable</p>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <label className="text-sm font-medium text-slate-700 block mb-3">Seleccionar Sede:</label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={localBranch === "sede1" ? "default" : "outline"}
              size="sm"
              onClick={() => setLocalBranch("sede1")}
              className="text-xs md:text-sm"
            >
              Sede 1
            </Button>
            <Button
              variant={localBranch === "sede2" ? "default" : "outline"}
              size="sm"
              onClick={() => setLocalBranch("sede2")}
              className="text-xs md:text-sm"
            >
              Sede 2
            </Button>
            <Button
              variant={localBranch === "both" ? "default" : "outline"}
              size="sm"
              onClick={() => setLocalBranch("both")}
              className="text-xs md:text-sm"
            >
              Ambos
            </Button>
          </div>
        </div>
      )}

      {success && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <p className="text-green-800">Servicio asignado exitosamente</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No hay autos disponibles. Todos los autos activos ya tienen servicios asignados.
              </p>
            </CardContent>
          </Card>
        ) : (
          vehicles.map((vehicle) => (
            <Dialog
              key={vehicle.id}
              open={dialogOpen && selectedVehicle?.id === vehicle.id}
              onOpenChange={(open) => {
                if (open) {
                  setSelectedVehicle(vehicle)
                  setDialogOpen(true)
                } else {
                  setDialogOpen(false)
                  setSelectedVehicle(null)
                }
              }}
            >
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow border-orange-300 bg-orange-50 dark:bg-orange-950">
                  <CardHeader className="pb-3">
                    <div>
                      <CardTitle className="text-lg">
                        {vehicle.brand} {vehicle.model}
                      </CardTitle>
                      <CardDescription className="font-mono text-base">{vehicle.plate}</CardDescription>
                      <CardDescription className="text-xs mt-1">
                        Sede: {vehicle.branch === "sede1" ? "Sede 1" : "Sede 2"}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Cliente:</span> {vehicle.clientName}
                    </p>
                    <p>
                      <span className="font-medium">Teléfono:</span> {vehicle.clientPhone}
                    </p>
                    <Badge className="bg-orange-600 hover:bg-orange-700 text-white">Falta asignar servicio</Badge>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {vehicle.brand} {vehicle.model}
                  </DialogTitle>
                  <DialogDescription>{vehicle.plate}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleAssignService} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Servicio *</label>
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm"
                      required
                    >
                      <option value="">Selecciona un servicio</option>
                      {PREDEFINED_SERVICES.map((service) => (
                        <option key={service} value={service}>
                          {service}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Detalles Adicionales</label>
                    <textarea
                      placeholder="Ej: Revisar también el sistema de refrigeración, cliente reportó ruido extraño..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm"
                      rows={3}
                    />
                  </div>

                  {isAdmin && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Asignar a Mecánico *</label>
                      <select
                        value={selectedMechanicId}
                        onChange={(e) => setSelectedMechanicId(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md text-sm bg-white"
                        required
                      >
                        <option value="">-- Selecciona un mecánico --</option>
                        {mechanics.map((mech) => (
                          <option key={mech.id} value={mech.id}>
                            {mech.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading || (isAdmin && !selectedMechanicId)}>
                    {isLoading ? "Asignando..." : "Asignar Servicio"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ))
        )}
      </div>
    </div>
  )
}
