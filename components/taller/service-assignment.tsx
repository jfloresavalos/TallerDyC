"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getActiveVehicles } from "@/lib/actions/vehicles"
import { addService } from "@/lib/actions/services"
import { BranchSelector } from "@/components/taller/branch-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { Branch, Vehicle, Service, User } from "@prisma/client"

const PREDEFINED_SERVICES = [
  "Cambio de aceite", "Cambio de filtro de aire", "Cambio de filtro de combustible",
  "Revisión de frenos", "Cambio de pastillas de freno", "Alineación",
  "Balanceo de llantas", "Cambio de llantas", "Revisión de suspensión",
  "Cambio de batería", "Revisión de motor", "Reparación de transmisión",
  "Revisión de sistema eléctrico", "Lavado y detallado", "Reparación de carrocería",
  "Pintura", "Cambio de correa de distribución", "Revisión de radiador",
  "Reparación de aire acondicionado", "Otro",
]

type VehicleWithRelations = Vehicle & { branch: Branch; services: (Service & { mechanic: User })[] }
type MechanicUser = User & { branch: Branch | null }

interface ServiceAssignmentClientProps {
  initialVehicles: VehicleWithRelations[]
  branches: Branch[]
  mechanics: MechanicUser[]
}

export function ServiceAssignmentClient({ initialVehicles, branches, mechanics }: ServiceAssignmentClientProps) {
  const [vehicles, setVehicles] = useState(initialVehicles)
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all")
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithRelations | null>(null)
  const [selectedService, setSelectedService] = useState("")
  const [description, setDescription] = useState("")
  const [selectedMechanicId, setSelectedMechanicId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()

  const handleBranchChange = async (branchId: string | "all") => {
    setSelectedBranch(branchId)
    const allVehicles = await getActiveVehicles(branchId === "all" ? undefined : branchId)
    setVehicles((allVehicles as VehicleWithRelations[]).filter((v) => v.services.length === 0))
  }

  const handleAssignService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVehicle || !selectedService.trim() || !selectedMechanicId) {
      toast.error("Completa todos los campos requeridos")
      return
    }

    setIsLoading(true)
    try {
      await addService({
        vehicleId: selectedVehicle.id,
        serviceType: selectedService,
        description: description.trim(),
        mechanicId: selectedMechanicId,
      })

      toast.success("Servicio asignado exitosamente")
      setDescription("")
      setSelectedService("")
      setSelectedVehicle(null)
      setSelectedMechanicId("")
      setDialogOpen(false)

      // Refresh the list
      const allVehicles = await getActiveVehicles(selectedBranch === "all" ? undefined : selectedBranch)
      setVehicles((allVehicles as VehicleWithRelations[]).filter((v) => v.services.length === 0))
      router.refresh()
    } catch {
      toast.error("Error al asignar el servicio")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredMechanics = selectedVehicle
    ? mechanics.filter((m) => m.branchId === selectedVehicle.branchId)
    : []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Asignar Servicio</h2>
        <p className="text-sm text-muted-foreground">Selecciona un auto, servicio y mecánico responsable</p>
      </div>

      <BranchSelector branches={branches} selected={selectedBranch} onChange={handleBranchChange} />

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
                if (open) { setSelectedVehicle(vehicle); setDialogOpen(true) }
                else { setDialogOpen(false); setSelectedVehicle(null) }
              }}
            >
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow border-orange-300 bg-orange-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{vehicle.brand} {vehicle.model}</CardTitle>
                    <CardDescription className="font-mono text-base">{vehicle.plate}</CardDescription>
                    <CardDescription className="text-xs mt-1">{vehicle.branch.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="font-medium">Cliente:</span> {vehicle.clientName}</p>
                    <p><span className="font-medium">Teléfono:</span> {vehicle.clientPhone}</p>
                    <Badge className="bg-orange-600 hover:bg-orange-700 text-white">Falta asignar servicio</Badge>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[calc(100vw-2rem)]">
                <DialogHeader>
                  <DialogTitle>{vehicle.brand} {vehicle.model}</DialogTitle>
                  <DialogDescription>{vehicle.plate}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAssignService} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Servicio *</label>
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background h-10"
                      required
                    >
                      <option value="">Selecciona un servicio</option>
                      {PREDEFINED_SERVICES.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Detalles Adicionales</label>
                    <textarea
                      placeholder="Ej: Revisar sistema de refrigeración..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background h-10"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Asignar a Mecánico *</label>
                    <select
                      value={selectedMechanicId}
                      onChange={(e) => setSelectedMechanicId(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background h-10"
                      required
                    >
                      <option value="">-- Selecciona un mecánico --</option>
                      {filteredMechanics.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                    </select>
                  </div>
                  <Button type="submit" className="w-full cursor-pointer" disabled={isLoading || !selectedMechanicId}>
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
