"use client"

import type React from "react"
import { useState } from "react"
import { addVehicle } from "@/lib/data-store"
import { CAR_BRANDS, CAR_BRANDS_AND_MODELS } from "@/lib/vehicle-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface VehicleRegistrationProps {
  branch: "sede1" | "sede2" | "both"
  onSuccess: () => void
  isAdmin?: boolean
}

export default function VehicleRegistration({ branch, onSuccess, isAdmin }: VehicleRegistrationProps) {
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    plate: "",
    year: new Date().getFullYear(),
    clientName: "",
    clientPhone: "",
    clientDNI: "",
    selectedBranch: isAdmin ? "sede1" : branch === "both" ? "sede1" : branch,
  })
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const availableModels = formData.brand ? CAR_BRANDS_AND_MODELS[formData.brand] || [] : []

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate name (only letters and spaces)
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.clientName)) {
      newErrors.clientName = "El nombre solo debe contener letras"
    }

    // Validate phone (exactly 9 digits for Peru)
    if (!/^\d{9}$/.test(formData.clientPhone)) {
      newErrors.clientPhone = "El teléfono debe tener exactamente 9 dígitos"
    }

    // Validate DNI (8 digits for Peru)
    if (!/^\d{8}$/.test(formData.clientDNI)) {
      newErrors.clientDNI = "El DNI debe tener exactamente 8 dígitos"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "year" ? Number.parseInt(value) : value,
      ...(name === "brand" && { model: "" }),
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      addVehicle({
        ...formData,
        plate: formData.plate.toUpperCase(),
        entryTime: new Date().toISOString(),
        exitTime: null,
        branch: formData.selectedBranch,
        status: "active",
      })

      setSuccess(true)
      setFormData({
        brand: "",
        model: "",
        plate: "",
        year: new Date().getFullYear(),
        clientName: "",
        clientPhone: "",
        clientDNI: "",
        selectedBranch: isAdmin ? "sede1" : branch === "both" ? "sede1" : branch,
      })

      setTimeout(() => {
        setSuccess(false)
        onSuccess()
      }, 2000)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Nuevo Auto</CardTitle>
        <CardDescription>Ingresa los datos del vehículo y cliente</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">Auto registrado exitosamente</AlertDescription>
            </Alert>
          )}

          {isAdmin && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Sede *</label>
              <select
                name="selectedBranch"
                value={formData.selectedBranch}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="sede1">Sede 1</option>
                <option value="sede2">Sede 2</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Marca *</label>
              <select
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="">-- Selecciona una marca --</option>
                {CAR_BRANDS.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo *</label>
              <select
                name="model"
                value={formData.model}
                onChange={handleChange}
                required
                disabled={!formData.brand}
                className="w-full px-3 py-2 border border-input rounded-md text-sm disabled:opacity-50"
              >
                <option value="">-- Selecciona un modelo --</option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Placa *</label>
              <Input name="plate" placeholder="Ej: ABC-1234" value={formData.plate} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Año *</label>
              <Input name="year" type="number" value={formData.year} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">DNI del Cliente *</label>
              <Input
                name="clientDNI"
                placeholder="Ej: 12345678"
                value={formData.clientDNI}
                onChange={handleChange}
                maxLength="8"
                required
              />
              {errors.clientDNI && <p className="text-xs text-red-500">{errors.clientDNI}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del Cliente *</label>
              <Input
                name="clientName"
                placeholder="Ej: Juan Pérez"
                value={formData.clientName}
                onChange={handleChange}
                required
              />
              {errors.clientName && <p className="text-xs text-red-500">{errors.clientName}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono del Cliente *</label>
              <Input
                name="clientPhone"
                placeholder="Ej: 987654321"
                value={formData.clientPhone}
                onChange={handleChange}
                maxLength="9"
                required
              />
              {errors.clientPhone && <p className="text-xs text-red-500">{errors.clientPhone}</p>}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Registrando..." : "Registrar Auto"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
