"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { updateCompany } from "@/lib/actions/company"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Building } from "lucide-react"
import type { Company } from "@prisma/client"

interface CompanyConfigClientProps {
  initialCompany: Company | null
}

export function CompanyConfigClient({ initialCompany }: CompanyConfigClientProps) {
  const [formData, setFormData] = useState({
    name: initialCompany?.name ?? "",
    ruc: initialCompany?.ruc ?? "",
    address: initialCompany?.address ?? "",
    phone: initialCompany?.phone ?? "",
    email: initialCompany?.email ?? "",
    logo: initialCompany?.logo ?? "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error("El nombre de la empresa es requerido")
      return
    }

    setIsLoading(true)
    try {
      await updateCompany({
        name: formData.name,
        ruc: formData.ruc || null,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        logo: formData.logo || null,
      })
      toast.success("Datos de la empresa actualizados")
    } catch {
      toast.error("Error al guardar los datos")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/configuracion">
          <Button variant="outline" size="icon" className="h-10 w-10 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Configuración de Empresa</h1>
          <p className="text-sm text-slate-600 mt-1">Datos generales de la empresa</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100">
              <Building className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Datos de la Empresa</CardTitle>
              <CardDescription>Esta información se usará en boletas y documentos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre de la Empresa *</label>
                <Input name="name" placeholder="Ej: DyC Conversiones" value={formData.name} onChange={handleChange} required className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">RUC</label>
                <Input name="ruc" placeholder="Ej: 20123456789" value={formData.ruc} onChange={handleChange} maxLength={11} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dirección</label>
                <Input name="address" placeholder="Ej: Av. Principal 123, Lima" value={formData.address} onChange={handleChange} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <Input name="phone" placeholder="Ej: 01-1234567" value={formData.phone} onChange={handleChange} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input name="email" type="email" placeholder="Ej: info@empresa.com" value={formData.email} onChange={handleChange} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Logo (URL)</label>
                <Input name="logo" placeholder="Ej: https://..." value={formData.logo} onChange={handleChange} className="h-10" />
              </div>
            </div>

            <Button type="submit" className="w-full md:w-auto h-10 cursor-pointer" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
