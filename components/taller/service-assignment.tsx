"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getActiveVehicles } from "@/lib/actions/vehicles"
import { addService } from "@/lib/actions/services"
import { BranchSelector } from "@/components/taller/branch-selector"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Wrench, User, Clock } from "lucide-react"
import type { Branch, Vehicle, Service, User as PrismaUser } from "@prisma/client"

const PREDEFINED_SERVICES = [
  "Cambio de aceite", "Cambio de filtro de aire", "Cambio de filtro de combustible",
  "Revision de frenos", "Cambio de pastillas de freno", "Alineacion",
  "Balanceo de llantas", "Cambio de llantas", "Revision de suspension",
  "Cambio de bateria", "Revision de motor", "Reparacion de transmision",
  "Revision de sistema electrico", "Lavado y detallado", "Reparacion de carroceria",
  "Pintura", "Cambio de correa de distribucion", "Revision de radiador",
  "Reparacion de aire acondicionado", "Otro",
]

type VehicleWithRelations = Vehicle & { branch: Branch; services: (Service & { mechanic: PrismaUser })[] }
type MechanicUser = PrismaUser & { branch: Branch | null }

interface ServiceAssignmentClientProps {
  initialVehicles: VehicleWithRelations[]
  branches: Branch[]
  mechanics: MechanicUser[]
}

const formatTime = (d: Date | string) => new Date(d).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })

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
    const all = await getActiveVehicles(branchId === "all" ? undefined : branchId)
    setVehicles((all as VehicleWithRelations[]).filter((v) => v.services.length === 0))
  }

  const resetForm = () => {
    setSelectedService(""); setDescription(""); setSelectedMechanicId("")
    setSelectedVehicle(null); setDialogOpen(false)
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVehicle || !selectedService || !selectedMechanicId) {
      toast.error("Completa todos los campos"); return
    }
    setIsLoading(true)
    try {
      await addService({ vehicleId: selectedVehicle.id, serviceType: selectedService, description: description.trim(), mechanicId: selectedMechanicId })
      toast.success("Servicio asignado")
      resetForm()
      const all = await getActiveVehicles(selectedBranch === "all" ? undefined : selectedBranch)
      setVehicles((all as VehicleWithRelations[]).filter((v) => v.services.length === 0))
      router.refresh()
    } catch { toast.error("Error al asignar") } finally { setIsLoading(false) }
  }

  const filteredMechanics = selectedVehicle
    ? mechanics.filter((m) => m.branchId === selectedVehicle.branchId)
    : []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Asignar Servicio</h2>
        <p className="text-sm text-slate-500">Autos esperando asignacion de servicio y mecanico</p>
      </div>

      <BranchSelector branches={branches} selected={selectedBranch} onChange={handleBranchChange} />

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-slate-500 text-sm">No hay autos pendientes de asignacion</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vehicles.map((vehicle) => (
            <Dialog
              key={vehicle.id}
              open={dialogOpen && selectedVehicle?.id === vehicle.id}
              onOpenChange={(open) => {
                if (open) { setSelectedVehicle(vehicle); setDialogOpen(true) }
                else resetForm()
              }}
            >
              <DialogTrigger asChild>
                <Card className="cursor-pointer border-2 border-orange-200 bg-orange-50 hover:border-orange-400 hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{vehicle.brand} {vehicle.model}</CardTitle>
                        <CardDescription className="font-mono text-sm font-semibold">{vehicle.plate}</CardDescription>
                        {vehicle.isConverted && (
                          <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 mt-0.5">
                            GNV/GLP
                          </span>
                        )}
                      </div>
                      <Badge className="bg-orange-600 text-white shrink-0 ml-2">#{vehicle.arrivalOrder}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{vehicle.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatTime(vehicle.entryTime)}</span>
                    </div>
                    <div className="pt-2">
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 text-xs w-full justify-center">
                        Toca para asignar servicio
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[calc(100vw-2rem)] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg">{vehicle.brand} {vehicle.model}</DialogTitle>
                  <DialogDescription className="font-mono">{vehicle.plate} — {vehicle.clientName}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAssign} className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Tipo de Servicio *</label>
                    <Select value={selectedService} onValueChange={setSelectedService} required>
                      <SelectTrigger className="h-14 rounded-xl border-slate-200">
                        <SelectValue placeholder="Selecciona un servicio" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {PREDEFINED_SERVICES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Detalles adicionales</label>
                    <Textarea
                      placeholder="Notas para el mecanico..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="rounded-xl text-base border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Mecanico responsable *</label>
                    {filteredMechanics.length === 0 ? (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                        No hay mecanicos activos en esta sede
                      </div>
                    ) : (
                      <Select value={selectedMechanicId} onValueChange={setSelectedMechanicId} required>
                        <SelectTrigger className="h-14 rounded-xl border-slate-200">
                          <SelectValue placeholder="Selecciona un mecanico">
                            {selectedMechanicId && (
                              <div className="flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-slate-500" />
                                {filteredMechanics.find(m => m.id === selectedMechanicId)?.name}
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {filteredMechanics.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              <div className="flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-slate-500" />
                                {m.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={resetForm} className="flex-1 h-14 rounded-xl cursor-pointer" disabled={isLoading}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-[2] h-14 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer"
                      disabled={isLoading || !selectedService || !selectedMechanicId}
                    >
                      {isLoading ? "Asignando..." : "Asignar Servicio"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  )
}
