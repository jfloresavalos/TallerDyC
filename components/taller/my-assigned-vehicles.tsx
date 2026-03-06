"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getServicesByMechanic, completeService, requestCorrection, updateService } from "@/lib/actions/services"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Branch, Vehicle, Service, User } from "@prisma/client"

type ServiceWithRelations = Service & {
  vehicle: Vehicle & { branch: Branch }
  mechanic: User
}

interface MyAssignedVehiclesClientProps {
  initialServices: ServiceWithRelations[]
  mechanicId: string
}

export function MyAssignedVehiclesClient({ initialServices, mechanicId }: MyAssignedVehiclesClientProps) {
  const [services, setServices] = useState(initialServices)
  const [isLoading, setIsLoading] = useState(false)
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false)
  const [serviceToComplete, setServiceToComplete] = useState<ServiceWithRelations | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedService, setSelectedService] = useState<ServiceWithRelations | null>(null)
  const [additionalDetails, setAdditionalDetails] = useState("")
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false)
  const [correctionReason, setCorrectionReason] = useState("")
  const router = useRouter()

  const refreshServices = async () => {
    const updated = await getServicesByMechanic(mechanicId, "IN_PROGRESS")
    setServices(updated as ServiceWithRelations[])
  }

  const handleCompleteWork = (service: ServiceWithRelations) => {
    setServiceToComplete(service)
    setShowCompletionConfirm(true)
  }

  const handleConfirmCompletion = async () => {
    if (!serviceToComplete) return
    setIsLoading(true)
    try {
      await completeService(serviceToComplete.id)
      toast.success("Trabajo marcado como completado")
      setShowCompletionConfirm(false)
      setServiceToComplete(null)
      await refreshServices()
      router.refresh()
    } catch {
      toast.error("Error al completar el trabajo")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService || !additionalDetails.trim()) return
    setIsLoading(true)
    try {
      await updateService(selectedService.id, { description: additionalDetails.trim() })
      toast.success("Detalles guardados")
      setAdditionalDetails("")
      setShowDetailsDialog(false)
      await refreshServices()
    } catch {
      toast.error("Error al guardar detalles")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestCorrection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService || !correctionReason.trim()) return
    setIsLoading(true)
    try {
      await requestCorrection(selectedService.id, correctionReason.trim())
      toast.success("Solicitud de corrección enviada")
      setCorrectionReason("")
      setShowCorrectionDialog(false)
      await refreshServices()
    } catch {
      toast.error("Error al enviar solicitud")
    } finally {
      setIsLoading(false)
    }
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
          {services.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{service.vehicle.brand} {service.vehicle.model}</CardTitle>
                    <CardDescription className="font-mono text-base">{service.vehicle.plate}</CardDescription>
                  </div>
                  <Badge variant="default">Asignado</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Servicio:</span> {service.serviceType}</p>
                  <p><span className="font-medium">Cliente:</span> {service.vehicle.clientName}</p>
                  <p><span className="font-medium">Teléfono:</span> {service.vehicle.clientPhone}</p>
                  {service.description && (
                    <p><span className="font-medium">Detalles:</span> {service.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCompleteWork(service)}
                    className="flex-1 bg-green-600 hover:bg-green-700 cursor-pointer"
                    disabled={isLoading}
                  >
                    Terminar Trabajo
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      setSelectedService(service)
                      setAdditionalDetails(service.description || "")
                      setShowDetailsDialog(true)
                    }}
                  >
                    Detalles
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completion Confirmation */}
      <Dialog open={showCompletionConfirm} onOpenChange={setShowCompletionConfirm}>
        <DialogContent className="max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>Confirmar Finalización del Trabajo</DialogTitle>
            <DialogDescription>
              {serviceToComplete?.vehicle.brand} {serviceToComplete?.vehicle.model}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                ¿Estás seguro de que deseas marcar como terminado el servicio de{" "}
                <span className="font-semibold">{serviceToComplete?.serviceType}</span>?
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleConfirmCompletion} className="flex-1 bg-green-600 hover:bg-green-700 cursor-pointer" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Sí, Confirmar"}
              </Button>
              <Button variant="outline" onClick={() => setShowCompletionConfirm(false)} className="flex-1 cursor-pointer" disabled={isLoading}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>Detalles del Servicio</DialogTitle>
            <DialogDescription>
              {selectedService?.vehicle.brand} {selectedService?.vehicle.model} - {selectedService?.vehicle.plate}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDetails} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Detalles Adicionales</label>
              <textarea
                placeholder="Describe qué se realizó, problemas encontrados..."
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
                rows={4}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 cursor-pointer" disabled={isLoading || !additionalDetails.trim()}>
                {isLoading ? "Guardando..." : "Guardar Detalles"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 cursor-pointer"
                onClick={() => {
                  setShowCorrectionDialog(true)
                }}
              >
                Solicitar Corrección
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Correction Dialog */}
      <Dialog open={showCorrectionDialog} onOpenChange={setShowCorrectionDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>Solicitar Corrección</DialogTitle>
            <DialogDescription>Comunícate con el administrador para corregir la asignación</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestCorrection} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo de la Corrección *</label>
              <textarea
                placeholder="Explica por qué necesita corrección..."
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
                rows={3}
                required
              />
            </div>
            <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar Solicitud"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
