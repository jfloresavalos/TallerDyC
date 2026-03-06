"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { createBranch, updateBranch, deleteBranch, getBranches } from "@/lib/actions/users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trash2, Edit2, Plus, ArrowLeft, MapPin, Phone } from "lucide-react"
import type { Branch } from "@prisma/client"

interface BranchManagementClientProps {
  initialBranches: Branch[]
}

export function BranchManagementClient({ initialBranches }: BranchManagementClientProps) {
  const [branches, setBranches] = useState(initialBranches)
  const [formData, setFormData] = useState({ name: "", code: "", address: "", phone: "" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || (!editingId && !formData.code)) return

    setIsLoading(true)
    try {
      if (editingId) {
        await updateBranch(editingId, {
          name: formData.name,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
        })
        toast.success("Sede actualizada")
      } else {
        await createBranch({
          name: formData.name,
          code: formData.code,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
        })
        toast.success("Sede creada")
      }

      setFormData({ name: "", code: "", address: "", phone: "" })
      setEditingId(null)
      setIsOpen(false)
      router.refresh()
      const updated = await getBranches()
      setBranches(updated)
    } catch {
      toast.error("Error al guardar sede")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (branch: Branch) => {
    setFormData({
      name: branch.name,
      code: branch.code,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
    })
    setEditingId(branch.id)
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    setIsLoading(true)
    try {
      await deleteBranch(id)
      toast.success("Sede eliminada")
      const updated = await getBranches()
      setBranches(updated)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar sede")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({ name: "", code: "", address: "", phone: "" })
      setEditingId(null)
    }
    setIsOpen(open)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/configuracion">
            <Button variant="outline" size="icon" className="h-10 w-10 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Gestión de Sedes</h1>
            <p className="text-sm text-slate-600 mt-1">{branches.length} sedes registradas</p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full md:w-auto cursor-pointer h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20">
              <Plus className="w-4 h-4" /> Nueva Sede
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-md max-w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Sede" : "Crear Nueva Sede"}</DialogTitle>
              <DialogDescription>{editingId ? "Actualiza los datos de la sede" : "Ingresa los datos de la nueva sede"}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre *</label>
                <Input name="name" placeholder="Ej: Sede Principal" value={formData.name} onChange={handleChange} required className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Código *</label>
                <Input name="code" placeholder="Ej: sede1" value={formData.code} onChange={handleChange} required disabled={!!editingId} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dirección</label>
                <Input name="address" placeholder="Ej: Av. Principal 123" value={formData.address} onChange={handleChange} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <Input name="phone" placeholder="Ej: 01-1234567" value={formData.phone} onChange={handleChange} className="h-10" />
              </div>
              <Button type="submit" className="w-full h-10 cursor-pointer" disabled={isLoading}>
                {isLoading ? "Guardando..." : editingId ? "Actualizar Sede" : "Crear Sede"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                <th className="text-left py-4 px-6 text-sm font-semibold">Sede</th>
                <th className="text-left py-4 px-6 text-sm font-semibold">Dirección</th>
                <th className="text-left py-4 px-6 text-sm font-semibold">Teléfono</th>
                <th className="text-left py-4 px-6 text-sm font-semibold">Estado</th>
                <th className="text-right py-4 px-6 text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {branch.code.toUpperCase().slice(0, 3)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{branch.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{branch.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {branch.address ? (
                      <span className="text-sm text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {branch.address}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {branch.phone ? (
                      <span className="text-sm text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {branch.phone}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${branch.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      <span className={`w-2 h-2 rounded-full ${branch.active ? "bg-green-500" : "bg-red-500"}`} />
                      {branch.active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(branch)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-xs font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(branch.id)}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-xs font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-sm shadow-red-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {branches.map((branch) => (
          <Card key={branch.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {branch.code.toUpperCase().slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 text-sm">{branch.name}</p>
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {branch.code}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {branch.address && (
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {branch.address}
                      </p>
                    )}
                    {branch.phone && (
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {branch.phone}
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${branch.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${branch.active ? "bg-green-500" : "bg-red-500"}`} />
                      {branch.active ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleEdit(branch)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(branch.id)}
                  disabled={isLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
