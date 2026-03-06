"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { addVehicle } from "@/lib/actions/vehicles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Branch } from "@prisma/client"

interface BrandForSelect {
  id: string
  name: string
  models: { id: string; name: string }[]
}

interface VehicleRegistrationClientProps {
  branches: Branch[]
  brands: BrandForSelect[]
  isAdmin: boolean
  userBranchId: string | null
}

export function VehicleRegistrationClient({ branches, brands, isAdmin, userBranchId }: VehicleRegistrationClientProps) {
  const defaultBranchId = isAdmin ? branches[0]?.id ?? "" : userBranchId ?? branches[0]?.id ?? ""
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    plate: "",
    year: new Date().getFullYear(),
    clientName: "",
    clientPhone: "",
    clientDNI: "",
    branchId: defaultBranchId,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const selectedBrand = brands.find((b) => b.name === formData.brand)
  const availableModels = selectedBrand?.models ?? []

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.clientName)) {
      newErrors.clientName = "El nombre solo debe contener letras"
    }
    if (!/^\d{9}$/.test(formData.clientPhone)) {
      newErrors.clientPhone = "El teléfono debe tener exactamente 9 dígitos"
    }
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
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      await addVehicle({
        brand: formData.brand,
        model: formData.model,
        plate: formData.plate,
        year: formData.year,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientDNI: formData.clientDNI,
        branchId: formData.branchId,
      })

      toast.success("Auto registrado exitosamente")
      setFormData({
        brand: "", model: "", plate: "", year: new Date().getFullYear(),
        clientName: "", clientPhone: "", clientDNI: "", branchId: defaultBranchId,
      })
      router.refresh()
    } catch {
      toast.error("Error al registrar el auto")
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
          {isAdmin && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Sede *</label>
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background h-10"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Marca *</label>
              <select name="brand" value={formData.brand} onChange={handleChange} required className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background h-10">
                <option value="">-- Selecciona una marca --</option>
                {brands.map((brand) => (<option key={brand.id} value={brand.name}>{brand.name}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo *</label>
              <select name="model" value={formData.model} onChange={handleChange} required disabled={!formData.brand} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background disabled:opacity-50 h-10">
                <option value="">-- Selecciona un modelo --</option>
                {availableModels.map((model) => (<option key={model.id} value={model.name}>{model.name}</option>))}
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
              <Input name="clientDNI" placeholder="Ej: 12345678" value={formData.clientDNI} onChange={handleChange} maxLength={8} required />
              {errors.clientDNI && <p className="text-xs text-red-500">{errors.clientDNI}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del Cliente *</label>
              <Input name="clientName" placeholder="Ej: Juan Pérez" value={formData.clientName} onChange={handleChange} required />
              {errors.clientName && <p className="text-xs text-red-500">{errors.clientName}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono del Cliente *</label>
              <Input name="clientPhone" placeholder="Ej: 987654321" value={formData.clientPhone} onChange={handleChange} maxLength={9} required />
              {errors.clientPhone && <p className="text-xs text-red-500">{errors.clientPhone}</p>}
            </div>
          </div>

          <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
            {isLoading ? "Registrando..." : "Registrar Auto"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
