"use client"

import { useState, useEffect } from "react"
import { getServicesByVehicle, updateService, updateVehicle, type Vehicle, type Service } from "@/lib/data-store"
import { PREDEFINED_SERVICES } from "@/lib/data-store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface VehicleDetailModalProps {
  vehicle: Vehicle
  isOpen: boolean
  onClose: () => void
  onExitVehicle: (vehicleId: string) => void
  isAdmin: boolean
}

export default function VehicleDetailModal({
  vehicle,
  isOpen,
  onClose,
  onExitVehicle,
  isAdmin,
}: VehicleDetailModalProps) {
  const [services, setServices] = useState<Service[]>([])
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [editingServiceType, setEditingServiceType] = useState("")
  const [editingDescription, setEditingDescription] = useState("")
  const [editingPrice, setEditingPrice] = useState<string>("")
  const [showPriceDialog, setShowPriceDialog] = useState(false)
  const [selectedServiceForPrice, setSelectedServiceForPrice] = useState<Service | null>(null)
  const [editingClient, setEditingClient] = useState(false)
  const [editingClientName, setEditingClientName] = useState("")
  const [editingClientPhone, setEditingClientPhone] = useState("")
  const [editingClientDNI, setEditingClientDNI] = useState("")
  const [editingBrand, setEditingBrand] = useState("")
  const [editingModel, setEditingModel] = useState("")
  const [editingPlate, setEditingPlate] = useState("")
  const [editingYear, setEditingYear] = useState("")

  useEffect(() => {
    if (isOpen) {
      setServices(getServicesByVehicle(vehicle.id))
      setEditingClientName(vehicle.clientName)
      setEditingClientPhone(vehicle.clientPhone)
      setEditingClientDNI(vehicle.clientDNI)
      setEditingBrand(vehicle.brand)
      setEditingModel(vehicle.model)
      setEditingPlate(vehicle.plate)
      setEditingYear(vehicle.year)
    }
  }, [
    isOpen,
    vehicle.id,
    vehicle.clientName,
    vehicle.clientPhone,
    vehicle.clientDNI,
    vehicle.brand,
    vehicle.model,
    vehicle.plate,
    vehicle.year,
  ])

  const handleEditService = (service: Service) => {
    setEditingServiceId(service.id)
    setEditingServiceType(service.serviceType)
    setEditingDescription(service.description)
  }

  const handleSaveService = () => {
    if (editingServiceId) {
      updateService(editingServiceId, {
        serviceType: editingServiceType,
        description: editingDescription,
      })
      setServices(getServicesByVehicle(vehicle.id))
      setEditingServiceId(null)
      setEditingServiceType("")
      setEditingDescription("")
    }
  }

  const handleSavePrice = () => {
    if (selectedServiceForPrice && editingPrice) {
      const price = Number.parseFloat(editingPrice)
      if (!isNaN(price) && price >= 0) {
        updateService(selectedServiceForPrice.id, { price })
        setServices(getServicesByVehicle(vehicle.id))
        setEditingPrice("")
        setSelectedServiceForPrice(null)
        setShowPriceDialog(false)
      }
    }
  }

  const handleSaveClientData = () => {
    if (
      editingClientName.trim() &&
      editingClientPhone.trim() &&
      editingClientDNI.trim() &&
      editingBrand.trim() &&
      editingModel.trim() &&
      editingPlate.trim() &&
      editingYear.trim()
    ) {
      updateVehicle(vehicle.id, {
        clientName: editingClientName,
        clientPhone: editingClientPhone,
        clientDNI: editingClientDNI,
        brand: editingBrand,
        model: editingModel,
        plate: editingPlate,
        year: editingYear,
      })
      setEditingClient(false)
    }
  }

  const handleExitWithConfirmation = () => {
    onExitVehicle(vehicle.id)
    onClose()
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("es-CO")
  }

  const calculateDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return "En progreso"
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {vehicle.brand} {vehicle.model}
          </DialogTitle>
          <DialogDescription>{vehicle.plate}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Información del Cliente y Vehículo</h3>
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={() => setEditingClient(!editingClient)}>
                  {editingClient ? "Cancelar" : "Editar"}
                </Button>
              )}
            </div>

            {editingClient ? (
              <div className="space-y-3 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <div className="border-b pb-3 mb-3">
                  <h4 className="font-medium text-sm mb-3">Datos del Cliente</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium">Nombre del Cliente</label>
                      <Input
                        value={editingClientName}
                        onChange={(e) => setEditingClientName(e.target.value)}
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">DNI</label>
                      <Input
                        value={editingClientDNI}
                        onChange={(e) => setEditingClientDNI(e.target.value)}
                        placeholder="DNI"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Teléfono</label>
                      <Input
                        value={editingClientPhone}
                        onChange={(e) => setEditingClientPhone(e.target.value)}
                        placeholder="Teléfono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-3">Datos del Vehículo</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium">Marca</label>
                      <Input
                        value={editingBrand}
                        onChange={(e) => setEditingBrand(e.target.value)}
                        placeholder="Marca"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Modelo</label>
                      <Input
                        value={editingModel}
                        onChange={(e) => setEditingModel(e.target.value)}
                        placeholder="Modelo"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Placa</label>
                      <Input
                        value={editingPlate}
                        onChange={(e) => setEditingPlate(e.target.value)}
                        placeholder="Placa"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Año</label>
                      <Input value={editingYear} onChange={(e) => setEditingYear(e.target.value)} placeholder="Año" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <Button onClick={handleSaveClientData} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    Guardar Cambios
                  </Button>
                  <Button variant="outline" onClick={() => setEditingClient(false)} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-foreground">Cliente</p>
                  <p className="text-muted-foreground">{vehicle.clientName}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">DNI</p>
                  <p className="text-muted-foreground">{vehicle.clientDNI}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Teléfono</p>
                  <p className="text-muted-foreground">{vehicle.clientPhone}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Entrada</p>
                  <p className="text-muted-foreground">
                    {formatDate(vehicle.entryTime)} {formatTime(vehicle.entryTime)}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Marca</p>
                  <p className="text-muted-foreground">{vehicle.brand}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Modelo</p>
                  <p className="text-muted-foreground">{vehicle.model}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Placa</p>
                  <p className="text-muted-foreground">{vehicle.plate}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Año</p>
                  <p className="text-muted-foreground">{vehicle.year}</p>
                </div>
              </div>
            )}
          </div>

          {/* Services Section */}
          <div className="space-y-3">
            <h3 className="font-semibold">Servicios Registrados</h3>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No hay servicios registrados. Debe registrar al menos un servicio antes de permitir la salida.
              </p>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    className={service.status === "completed" ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{service.mechanicName}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            Inicio: {formatTime(service.startTime)}
                            {service.completionTime && <> | Fin: {formatTime(service.completionTime)}</>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Duración: {calculateDuration(service.startTime, service.completionTime)}
                          </p>
                        </div>
                        <Badge variant={service.status === "completed" ? "default" : "secondary"}>
                          {service.status === "completed" ? "Completado" : "En Progreso"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Servicio: {service.serviceType}</p>
                        {service.description && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.description}</p>
                        )}
                      </div>

                      {editingServiceId === service.id ? (
                        <div className="space-y-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo de Servicio</label>
                            <select
                              value={editingServiceType}
                              onChange={(e) => setEditingServiceType(e.target.value)}
                              className="w-full px-3 py-2 border border-input rounded-md text-sm"
                            >
                              {PREDEFINED_SERVICES.map((service) => (
                                <option key={service} value={service}>
                                  {service}
                                </option>
                              ))}
                            </select>
                          </div>
                          <Textarea
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            placeholder="Descripción del servicio"
                            className="min-h-24"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveService} className="flex-1">
                              Guardar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingServiceId(null)}
                              className="flex-1"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditService(service)}
                              className="w-full"
                            >
                              Editar Servicio
                            </Button>
                          )}
                        </div>
                      )}

                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            Precio: {service.price ? `S/. ${service.price.toLocaleString("es-PE")}` : "No asignado"}
                          </p>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedServiceForPrice(service)
                                setEditingPrice(service.price?.toString() || "")
                                setShowPriceDialog(true)
                              }}
                            >
                              {service.price ? "Editar Precio" : "Agregar Precio"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Exit Button */}
          <Button
            onClick={handleExitWithConfirmation}
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={services.length === 0}
          >
            {services.length === 0 ? "Registre un servicio primero" : "Registrar Salida"}
          </Button>
        </div>
      </DialogContent>

      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Precio del Servicio</DialogTitle>
            <DialogDescription>{selectedServiceForPrice?.serviceType}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Precio (S/.)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={editingPrice}
                onChange={(e) => setEditingPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSavePrice} className="flex-1">
                Guardar Precio
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPriceDialog(false)
                  setEditingPrice("")
                  setSelectedServiceForPrice(null)
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
