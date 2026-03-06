"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getActiveVehicles, completeVehicleExit, hasServices } from "@/lib/actions/vehicles"
import { getServicesByVehicle } from "@/lib/actions/services"
import { BranchSelector } from "@/components/taller/branch-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { Branch, Vehicle, Service, User } from "@prisma/client"

type VehicleWithRelations = Vehicle & {
  branch: Branch
  services: (Service & { mechanic: User })[]
}

interface ActiveVehiclesClientProps {
  initialVehicles: VehicleWithRelations[]
  branches: Branch[]
}

export function ActiveVehiclesClient({ initialVehicles, branches }: ActiveVehiclesClientProps) {
  const [vehicles, setVehicles] = useState(initialVehicles)
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all")
  const [showPriceDialog, setShowPriceDialog] = useState(false)
  const [vehicleForExit, setVehicleForExit] = useState<VehicleWithRelations | null>(null)
  const [totalPrice, setTotalPrice] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleBranchChange = async (branchId: string | "all") => {
    setSelectedBranch(branchId)
    const updated = await getActiveVehicles(branchId === "all" ? undefined : branchId)
    setVehicles(updated as VehicleWithRelations[])
  }

  const refreshVehicles = async () => {
    const updated = await getActiveVehicles(selectedBranch === "all" ? undefined : selectedBranch)
    setVehicles(updated as VehicleWithRelations[])
  }

  const handleExitVehicle = async (vehicle: VehicleWithRelations) => {
    const hasService = await hasServices(vehicle.id)
    if (!hasService) {
      toast.error("No se puede registrar la salida. Primero debe registrar un servicio para este auto.")
      return
    }

    const services = await getServicesByVehicle(vehicle.id)
    const allCompleted = services.every((s) => s.status === "COMPLETED")
    if (!allCompleted) {
      toast.error("No se puede registrar la salida. Todos los servicios deben estar completados.")
      return
    }

    setVehicleForExit(vehicle)
    setTotalPrice("")
    setShowPriceDialog(true)
  }

  const handleConfirmExit = async () => {
    if (!vehicleForExit || !totalPrice.trim()) {
      toast.error("Por favor ingresa el precio")
      return
    }

    const price = Number.parseFloat(totalPrice)
    if (isNaN(price) || price < 0) {
      toast.error("Por favor ingresa un precio válido")
      return
    }

    setIsLoading(true)
    try {
      await completeVehicleExit(vehicleForExit.id, price)
      toast.success(`Salida registrada: ${vehicleForExit.brand} ${vehicleForExit.model} - S/ ${price.toFixed(2)}`)
      setShowPriceDialog(false)
      setVehicleForExit(null)
      setTotalPrice("")
      await refreshVehicles()
      router.refresh()
    } catch {
      toast.error("Error al registrar la salida")
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
  }

  const isVehicleCompleted = (vehicle: VehicleWithRelations) => {
    return vehicle.services.length > 0 && vehicle.services.every((s) => s.status === "COMPLETED")
  }

  const hasServiceAssigned = (vehicle: VehicleWithRelations) => {
    return vehicle.services.some((s) => s.status !== "PENDING_CORRECTION")
  }

  return (
    <div className="space-y-3">
      <BranchSelector branches={branches} selected={selectedBranch} onChange={handleBranchChange} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Autos en Taller</h2>
          <p className="text-xs text-muted-foreground">
            {vehicles.length} {vehicles.length === 1 ? "auto" : "autos"}
          </p>
        </div>
        <Badge variant="default" className="text-sm px-2 py-1">{vehicles.length}</Badge>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="pt-4">
            <p className="text-center text-sm text-muted-foreground">No hay autos activos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vehicles.map((vehicle) => {
            const completed = isVehicleCompleted(vehicle)
            const serviceAssigned = hasServiceAssigned(vehicle)

            return (
              <Card
                key={vehicle.id}
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  completed ? "border-green-500 bg-green-50" : ""
                } ${!serviceAssigned ? "border-orange-500 bg-orange-50" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        {vehicle.brand} {vehicle.model}
                      </CardTitle>
                      <CardDescription className="font-mono text-sm">{vehicle.plate}</CardDescription>
                      <CardDescription className="text-xs mt-1">{vehicle.branch.name}</CardDescription>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">
                        #{vehicle.arrivalOrder}
                      </Badge>
                      {completed ? (
                        <Badge className="bg-green-600 hover:bg-green-700 text-xs">Terminado</Badge>
                      ) : !serviceAssigned ? (
                        <Badge className="bg-orange-600 hover:bg-orange-700 text-xs">Sin Servicio</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Activo</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1 text-xs">
                    <p><span className="font-medium">Cliente:</span> {vehicle.clientName}</p>
                    <p><span className="font-medium">Tel:</span> {vehicle.clientPhone}</p>
                    <p><span className="font-medium">Entrada:</span> {formatTime(vehicle.entryTime)}</p>
                  </div>

                  {completed && (
                    <Button
                      onClick={() => handleExitVehicle(vehicle)}
                      className="w-full bg-green-600 hover:bg-green-700 text-xs h-10 cursor-pointer"
                    >
                      Registrar Salida
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Price Dialog */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className="max-w-sm max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-base">Registrar Precio y Salida</DialogTitle>
            <DialogDescription className="text-xs">
              {vehicleForExit?.brand} {vehicleForExit?.model} - {vehicleForExit?.plate}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-900">
                <span className="font-semibold">Cliente:</span> {vehicleForExit?.clientName}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Precio Total (S/.)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                min="0"
                step="0.01"
                disabled={isLoading}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleConfirmExit}
                className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-10 cursor-pointer"
                disabled={isLoading || !totalPrice.trim()}
              >
                {isLoading ? "Procesando..." : "Confirmar Salida"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowPriceDialog(false); setVehicleForExit(null) }}
                className="flex-1 text-xs h-10 cursor-pointer"
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
