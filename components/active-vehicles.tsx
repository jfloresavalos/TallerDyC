"use client"

import { useState, useEffect } from "react"
import {
  getActiveVehicles,
  updateVehicle,
  hasServices,
  getServicesByVehicle,
  updateService,
  type Vehicle,
} from "@/lib/data-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import VehicleDetailModal from "./vehicle-detail-modal"

interface ActiveVehiclesProps {
  branch: "sede1" | "sede2" | "both"
  isAdmin: boolean
  onBranchChange?: (branch: "sede1" | "sede2" | "both") => void
}

export default function ActiveVehicles({ branch, isAdmin, onBranchChange }: ActiveVehiclesProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showPriceDialog, setShowPriceDialog] = useState(false)
  const [vehicleForExit, setVehicleForExit] = useState<Vehicle | null>(null)
  const [totalPrice, setTotalPrice] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showExitConfirmation, setShowExitConfirmation] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successVehicle, setSuccessVehicle] = useState<Vehicle | null>(null)
  const [localBranch, setLocalBranch] = useState<"sede1" | "sede2" | "both">(branch)

  useEffect(() => {
    const loadVehicles = () => {
      if (localBranch === "both") {
        const sede1 = getActiveVehicles("sede1")
        const sede2 = getActiveVehicles("sede2")
        setVehicles([...sede1, ...sede2])
      } else {
        setVehicles(getActiveVehicles(localBranch))
      }
    }

    loadVehicles()
    const interval = setInterval(loadVehicles, 2000)

    return () => clearInterval(interval)
  }, [localBranch])

  const handleBranchChange = (newBranch: "sede1" | "sede2" | "both") => {
    setLocalBranch(newBranch)
    onBranchChange?.(newBranch)
  }

  const handleExitVehicle = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId)
    if (!vehicle) return

    if (!hasServices(vehicleId)) {
      alert("No se puede registrar la salida. Primero debe registrar un servicio para este auto.")
      return
    }

    const services = getServicesByVehicle(vehicleId)
    const allCompleted = services.every((s) => s.status === "completed")

    if (!allCompleted) {
      alert(
        "No se puede registrar la salida. El trabajo aún no está terminado. Todos los servicios deben estar completados.",
      )
      return
    }

    setVehicleForExit(vehicle)
    setTotalPrice("")
    setShowPriceDialog(true)
  }

  const handleConfirmExit = async () => {
    if (!vehicleForExit || !totalPrice.trim()) {
      alert("Por favor ingresa el precio")
      return
    }

    const price = Number.parseFloat(totalPrice)
    if (isNaN(price) || price < 0) {
      alert("Por favor ingresa un precio válido")
      return
    }

    setShowExitConfirmation(true)
  }

  const handleConfirmExitFromDialog = async () => {
    if (!vehicleForExit) return

    setIsLoading(true)
    try {
      const services = getServicesByVehicle(vehicleForExit.id)
      const completedServices = services.filter((s) => s.status === "completed")
      const price = Number.parseFloat(totalPrice)

      const pricePerService = completedServices.length > 0 ? price / completedServices.length : 0

      completedServices.forEach((service) => {
        updateService(service.id, { price: pricePerService })
      })

      updateVehicle(vehicleForExit.id, {
        status: "completed",
        exitTime: new Date().toISOString(),
      })
      if (localBranch === "both") {
        const sede1 = getActiveVehicles("sede1")
        const sede2 = getActiveVehicles("sede2")
        setVehicles([...sede1, ...sede2])
      } else {
        setVehicles(getActiveVehicles(localBranch))
      }
      setShowPriceDialog(false)
      setShowExitConfirmation(false)
      setSuccessVehicle(vehicleForExit)
      setShowSuccessDialog(true)
      setVehicleForExit(null)
      setTotalPrice("")
      setShowDetailModal(false)
      setSelectedVehicle(null)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isVehicleCompleted = (vehicleId: string) => {
    const services = getServicesByVehicle(vehicleId)
    return services.length > 0 && services.every((s) => s.status === "completed")
  }

  const hasServiceAssigned = (vehicleId: string) => {
    return hasServices(vehicleId)
  }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
          <label className="text-xs font-medium text-slate-700 block mb-2">Seleccionar Sede:</label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={localBranch === "sede1" ? "default" : "outline"}
              size="sm"
              onClick={() => handleBranchChange("sede1")}
              className="text-xs h-8"
            >
              Sede 1
            </Button>
            <Button
              variant={localBranch === "sede2" ? "default" : "outline"}
              size="sm"
              onClick={() => handleBranchChange("sede2")}
              className="text-xs h-8"
            >
              Sede 2
            </Button>
            <Button
              variant={localBranch === "both" ? "default" : "outline"}
              size="sm"
              onClick={() => handleBranchChange("both")}
              className="text-xs h-8"
            >
              Ambos
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Autos en Taller</h2>
          <p className="text-xs text-muted-foreground">
            {vehicles.length} {vehicles.length === 1 ? "auto" : "autos"}
          </p>
        </div>
        <Badge variant="default" className="text-sm px-2 py-1">
          {vehicles.length}
        </Badge>
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
            const completed = isVehicleCompleted(vehicle.id)
            const serviceAssigned = hasServiceAssigned(vehicle.id)

            return (
              <Card
                key={vehicle.id}
                className={`hover:shadow-md transition-shadow ${
                  completed ? "border-green-500 bg-green-50 dark:bg-green-950" : ""
                } ${!serviceAssigned ? "border-orange-500 bg-orange-50 dark:bg-orange-950" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        {vehicle.brand} {vehicle.model}
                      </CardTitle>
                      <CardDescription className="font-mono text-sm">{vehicle.plate}</CardDescription>
                      <CardDescription className="text-xs mt-1">
                        Sede: {vehicle.branch === "sede1" ? "1" : "2"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-xs"
                      >
                        #{vehicle.arrivalOrder}
                      </Badge>
                      {completed ? (
                        <Badge className="bg-green-600 hover:bg-green-700 text-xs">Terminado</Badge>
                      ) : !serviceAssigned ? (
                        <Badge className="bg-orange-600 hover:bg-orange-700 text-xs">Sin Servicio</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Activo
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1 text-xs">
                    <p>
                      <span className="font-medium">Cliente:</span> {vehicle.clientName}
                    </p>
                    <p>
                      <span className="font-medium">Tel:</span> {vehicle.clientPhone}
                    </p>
                    <p>
                      <span className="font-medium">Entrada:</span> {formatTime(vehicle.entryTime)}
                    </p>
                    {!serviceAssigned && (
                      <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900 border border-orange-300 dark:border-orange-700 rounded text-orange-800 dark:text-orange-100 text-xs">
                        ⚠️ Falta asignar servicio
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full bg-transparent text-xs h-8"
                    onClick={() => {
                      setSelectedVehicle(vehicle)
                      setShowDetailModal(true)
                    }}
                  >
                    Ver Detalles
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedVehicle(null)
          }}
          onExitVehicle={handleExitVehicle}
          isAdmin={isAdmin}
        />
      )}

      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Registrar Precio</DialogTitle>
            <DialogDescription className="text-xs">
              {vehicleForExit?.brand} {vehicleForExit?.model} - {vehicleForExit?.plate}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-900">
                <span className="font-semibold">Cliente:</span> {vehicleForExit?.clientName}
              </p>
              <p className="text-xs text-amber-900 mt-1">
                <span className="font-semibold">Tel:</span> {vehicleForExit?.clientPhone}
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
                className="text-sm h-8"
              />
              <p className="text-xs text-muted-foreground">Ingresa el precio total</p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConfirmExit}
                className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-8"
                disabled={isLoading || !totalPrice.trim()}
              >
                {isLoading ? "Procesando..." : "Siguiente"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPriceDialog(false)
                  setVehicleForExit(null)
                  setTotalPrice("")
                }}
                className="flex-1 text-xs h-8"
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Confirmar Salida</DialogTitle>
            <DialogDescription className="text-xs">Verifica los datos antes de confirmar</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-1">
              <p className="text-xs">
                <span className="font-semibold">Placa:</span> {vehicleForExit?.plate}
              </p>
              <p className="text-xs">
                <span className="font-semibold">Vehículo:</span> {vehicleForExit?.brand} {vehicleForExit?.model}
              </p>
              <p className="text-xs">
                <span className="font-semibold">Cliente:</span> {vehicleForExit?.clientName}
              </p>
              <p className="text-xs border-t border-blue-200 dark:border-blue-800 pt-2 mt-2">
                <span className="font-semibold">Precio:</span> S/.{" "}
                {Number.parseFloat(totalPrice).toLocaleString("es-PE")}
              </p>
            </div>

            <p className="text-xs text-muted-foreground italic">¿Confirmar salida del vehículo?</p>

            <div className="flex gap-2">
              <Button
                onClick={handleConfirmExitFromDialog}
                className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-8"
                disabled={isLoading}
              >
                {isLoading ? "Procesando..." : "Confirmar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowExitConfirmation(false)}
                className="flex-1 text-xs h-8"
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-green-600 text-center text-base">Salida Registrada</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-1">
              <p className="text-xs text-green-800 dark:text-green-100">
                <span className="font-semibold">Vehículo:</span> {successVehicle?.brand} {successVehicle?.model}
              </p>
              <p className="text-xs text-green-800 dark:text-green-100">
                <span className="font-semibold">Placa:</span> {successVehicle?.plate}
              </p>
              <p className="text-xs text-green-800 dark:text-green-100">
                <span className="font-semibold">Cliente:</span> {successVehicle?.clientName}
              </p>
              <p className="text-xs text-green-800 dark:text-green-100 border-t border-green-200 dark:border-green-800 pt-2 mt-2">
                <span className="font-semibold">Precio:</span> S/.{" "}
                {Number.parseFloat(totalPrice).toLocaleString("es-PE")}
              </p>
            </div>
            <p className="text-xs text-center text-muted-foreground">Vehículo completado y listo para salida.</p>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="w-full bg-green-600 hover:bg-green-700 text-xs h-8"
            >
              Aceptar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
