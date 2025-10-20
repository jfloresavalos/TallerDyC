"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getServices, updateService, getVehicles, type Service } from "@/lib/data-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface MyAssignedVehiclesProps {
  mechanicId: string
  branch: "sede1" | "sede2"
  onSuccess: () => void
}

export default function MyAssignedVehicles({ mechanicId, branch, onSuccess }: MyAssignedVehiclesProps) {
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [additionalDetails, setAdditionalDetails] = useState("")
  const [correctionReason, setCorrectionReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false)
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false)
  const [serviceToComplete, setServiceToComplete] = useState<Service | null>(null)

  useEffect(() => {
    const loadServices = () => {
      const allServices = getServices().filter((s) => s.mechanicId === mechanicId && s.status === "in-progress")
      setServices(allServices)
    }

    loadServices()
    const interval = setInterval(loadServices, 1000)
    return () => clearInterval(interval)
  }, [mechanicId])

  const getVehicleInfo = (vehicleId: string) => {
    const vehicles = getVehicles()
    return vehicles.find((v) => v.id === vehicleId)
  }

  const handleAddDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService) return

    setIsLoading(true)
    try {
      updateService(selectedService.id, {
        description: additionalDetails.trim(),
      })
      setAdditionalDetails("")
      setSelectedService(null)
      onSuccess()
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteWork = (service: Service) => {
    setServiceToComplete(service)
    setShowCompletionConfirm(true)
  }

  const handleConfirmCompletion = async () => {
    if (!serviceToComplete) return

    setIsLoading(true)
    try {
      updateService(serviceToComplete.id, {
        status: "completed",
        completionTime: new Date().toISOString(),
      })
      setShowCompletionConfirm(false)
      setServiceToComplete(null)
      onSuccess()
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestCorrection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService || !correctionReason.trim()) return

    setIsLoading(true)
    try {
      updateService(selectedService.id, {
        status: "pending-correction",
        correctionRequested: true,
        correctionReason: correctionReason.trim(),
      })
      setCorrectionReason("")
      setSelectedService(null)
      setShowCorrectionDialog(false)
      onSuccess()
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Mis Autos Asignados</h2>
        <p className="text-sm text-muted-foreground">
          {services.length} {services.length === 1 ? "auto" : "autos"} asignado(s) a ti
        </p>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No tienes autos asignados en este momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => {
            const vehicle = getVehicleInfo(service.vehicleId)
            if (!vehicle) return null

            return (
              <Card key={service.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {vehicle.brand} {vehicle.model}
                      </CardTitle>
                      <CardDescription className="font-mono text-base">{vehicle.plate}</CardDescription>
                    </div>
                    <Badge variant="default">Asignado</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Servicio:</span> {service.serviceType}
                    </p>
                    <p>
                      <span className="font-medium">Cliente:</span> {vehicle.clientName}
                    </p>
                    <p>
                      <span className="font-medium">Teléfono:</span> {vehicle.clientPhone}
                    </p>
                    {service.description && (
                      <p>
                        <span className="font-medium">Detalles:</span> {service.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCompleteWork(service)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={isLoading}
                    >
                      {isLoading ? "Guardando..." : "Terminar Trabajo"}
                    </Button>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex-1 bg-transparent"
                          onClick={() => setSelectedService(service)}
                        >
                          Detalles
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Agregar Detalles del Servicio</DialogTitle>
                          <DialogDescription>
                            {vehicle.brand} {vehicle.model} - {vehicle.plate}
                          </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleAddDetails} className="space-y-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Servicio: {service.serviceType}</p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Detalles Adicionales <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              placeholder="Describe qué se realizó, problemas encontrados, recomendaciones, etc."
                              value={additionalDetails}
                              onChange={(e) => setAdditionalDetails(e.target.value)}
                              className="w-full px-3 py-2 border border-input rounded-md text-sm"
                              rows={4}
                              required
                            />
                            <p className="text-xs text-muted-foreground">
                              Este campo es obligatorio antes de terminar el trabajo
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button type="submit" className="flex-1" disabled={isLoading || !additionalDetails.trim()}>
                              {isLoading ? "Guardando..." : "Guardar Detalles"}
                            </Button>
                            <Dialog open={showCorrectionDialog} onOpenChange={setShowCorrectionDialog}>
                              <DialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="flex-1 bg-transparent"
                                  onClick={() => setSelectedService(service)}
                                >
                                  Solicitar Corrección
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Solicitar Corrección</DialogTitle>
                                  <DialogDescription>
                                    Comunícate con el administrador para corregir la asignación
                                  </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleRequestCorrection} className="space-y-4">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Motivo de la Corrección *</label>
                                    <textarea
                                      placeholder="Explica por qué necesita corrección..."
                                      value={correctionReason}
                                      onChange={(e) => setCorrectionReason(e.target.value)}
                                      className="w-full px-3 py-2 border border-input rounded-md text-sm"
                                      rows={3}
                                      required
                                    />
                                  </div>

                                  <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? "Enviando..." : "Enviar Solicitud"}
                                  </Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={showCompletionConfirm} onOpenChange={setShowCompletionConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Finalización del Trabajo</DialogTitle>
            <DialogDescription>
              {serviceToComplete && getVehicleInfo(serviceToComplete.vehicleId)?.brand}{" "}
              {serviceToComplete && getVehicleInfo(serviceToComplete.vehicleId)?.model}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                ¿Estás seguro de que deseas marcar como terminado el servicio de{" "}
                <span className="font-semibold">{serviceToComplete?.serviceType}</span>?
              </p>
              <p className="text-xs text-blue-700 mt-2">
                Asegúrate de haber completado todos los detalles del trabajo antes de confirmar.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConfirmCompletion}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? "Guardando..." : "Sí, Confirmar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCompletionConfirm(false)
                  setServiceToComplete(null)
                }}
                className="flex-1"
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
