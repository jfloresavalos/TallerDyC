"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  getBrands,
  getBrandWithModels,
  createBrand,
  updateBrand,
  deleteBrand,
  createModel,
  updateModel,
  deleteModel,
} from "@/lib/actions/brands"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ArrowLeft, Plus, Edit2, Trash2, Car, ChevronRight, Search } from "lucide-react"

interface Brand {
  id: string
  name: string
  active: boolean
  _count: { models: number }
}

interface Model {
  id: string
  name: string
  brandId: string
  active: boolean
}

interface BrandManagementClientProps {
  initialBrands: Brand[]
}

export function BrandManagementClient({ initialBrands }: BrandManagementClientProps) {
  const [brands, setBrands] = useState(initialBrands)
  const [selectedBrand, setSelectedBrand] = useState<(Brand & { models?: Model[] }) | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Brand dialog
  const [brandDialogOpen, setBrandDialogOpen] = useState(false)
  const [brandName, setBrandName] = useState("")
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null)

  // Model dialog
  const [modelDialogOpen, setModelDialogOpen] = useState(false)
  const [modelName, setModelName] = useState("")
  const [editingModelId, setEditingModelId] = useState<string | null>(null)

  const filteredBrands = brands.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))

  const refreshBrands = async () => {
    const updated = await getBrands()
    setBrands(updated)
  }

  const selectBrand = async (brand: Brand) => {
    setSelectedBrand(brand)
    const full = await getBrandWithModels(brand.id)
    if (full) setModels(full.models)
  }

  // Brand CRUD
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brandName.trim()) return
    setIsLoading(true)
    try {
      if (editingBrandId) {
        await updateBrand(editingBrandId, brandName)
        toast.success("Marca actualizada")
      } else {
        await createBrand(brandName)
        toast.success("Marca creada")
      }
      setBrandDialogOpen(false)
      setBrandName("")
      setEditingBrandId(null)
      await refreshBrands()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar marca")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditBrand = (brand: Brand) => {
    setBrandName(brand.name)
    setEditingBrandId(brand.id)
    setBrandDialogOpen(true)
  }

  const handleDeleteBrand = async (id: string) => {
    setIsLoading(true)
    try {
      await deleteBrand(id)
      toast.success("Marca eliminada")
      if (selectedBrand?.id === id) {
        setSelectedBrand(null)
        setModels([])
      }
      await refreshBrands()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar marca")
    } finally {
      setIsLoading(false)
    }
  }

  // Model CRUD
  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modelName.trim() || !selectedBrand) return
    setIsLoading(true)
    try {
      if (editingModelId) {
        await updateModel(editingModelId, modelName)
        toast.success("Modelo actualizado")
      } else {
        await createModel(selectedBrand.id, modelName)
        toast.success("Modelo creado")
      }
      setModelDialogOpen(false)
      setModelName("")
      setEditingModelId(null)
      const full = await getBrandWithModels(selectedBrand.id)
      if (full) setModels(full.models)
      await refreshBrands()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar modelo")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditModel = (model: Model) => {
    setModelName(model.name)
    setEditingModelId(model.id)
    setModelDialogOpen(true)
  }

  const handleDeleteModel = async (id: string) => {
    if (!selectedBrand) return
    setIsLoading(true)
    try {
      await deleteModel(id)
      toast.success("Modelo eliminado")
      const full = await getBrandWithModels(selectedBrand.id)
      if (full) setModels(full.models)
      await refreshBrands()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar modelo")
    } finally {
      setIsLoading(false)
    }
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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Marcas y Modelos</h1>
            <p className="text-sm text-slate-600 mt-1">
              {brands.length} marcas registradas
            </p>
          </div>
        </div>

        <Dialog
          open={brandDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setBrandName("")
              setEditingBrandId(null)
            }
            setBrandDialogOpen(open)
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 w-full md:w-auto cursor-pointer h-10">
              <Plus className="w-4 h-4" /> Nueva Marca
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-md max-w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle>{editingBrandId ? "Editar Marca" : "Nueva Marca"}</DialogTitle>
              <DialogDescription>
                {editingBrandId ? "Actualiza el nombre de la marca" : "Ingresa el nombre de la nueva marca"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveBrand} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre de la Marca *</label>
                <Input
                  placeholder="Ej: Toyota"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <Button type="submit" className="w-full h-10 cursor-pointer" disabled={isLoading}>
                {isLoading ? "Guardando..." : editingBrandId ? "Actualizar" : "Crear Marca"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Master-detail layout */}
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 items-start">
        {/* Left: Brand list */}
        <Card className="md:sticky md:top-4">
          <CardContent className="p-0">
            <div className="p-3 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar marca..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {filteredBrands.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 text-center">No se encontraron marcas</p>
              ) : (
                filteredBrands.map((brand) => (
                  <div
                    key={brand.id}
                    onClick={() => selectBrand(brand)}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer border-b border-slate-100 transition-all duration-200 ${
                      selectedBrand?.id === brand.id
                        ? "bg-blue-50 border-l-3 border-l-blue-500"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {brand.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{brand.name}</p>
                        <p className="text-xs text-slate-500">{brand._count.models} modelos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditBrand(brand)
                        }}
                        className="p-1.5 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteBrand(brand.id)
                        }}
                        className="p-1.5 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
                        disabled={isLoading}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${selectedBrand?.id === brand.id ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Models of selected brand */}
        <Card>
          <CardContent className="p-6">
            {!selectedBrand ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-slate-100 mb-4">
                  <Car className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">Selecciona una marca</p>
                <p className="text-sm text-slate-400 mt-1">Para ver y gestionar sus modelos</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Modelos de {selectedBrand.name}
                    </h2>
                    <p className="text-sm text-slate-500">{models.length} modelos</p>
                  </div>

                  <Dialog
                    open={modelDialogOpen}
                    onOpenChange={(open) => {
                      if (!open) {
                        setModelName("")
                        setEditingModelId(null)
                      }
                      setModelDialogOpen(open)
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2 cursor-pointer h-10">
                        <Plus className="w-4 h-4" /> Nuevo Modelo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-full max-w-md max-w-[calc(100vw-2rem)]">
                      <DialogHeader>
                        <DialogTitle>
                          {editingModelId ? "Editar Modelo" : `Nuevo Modelo para ${selectedBrand.name}`}
                        </DialogTitle>
                        <DialogDescription>
                          {editingModelId ? "Actualiza el nombre del modelo" : "Ingresa el nombre del nuevo modelo"}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSaveModel} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Nombre del Modelo *</label>
                          <Input
                            placeholder="Ej: Corolla"
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            required
                            className="h-10"
                          />
                        </div>
                        <Button type="submit" className="w-full h-10 cursor-pointer" disabled={isLoading}>
                          {isLoading ? "Guardando..." : editingModelId ? "Actualizar" : "Crear Modelo"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {models.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">
                    Esta marca no tiene modelos registrados
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                      >
                        <span className="text-sm font-medium text-slate-700">{model.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditModel(model)}
                            className="p-1.5 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteModel(model.id)}
                            className="p-1.5 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
                            disabled={isLoading}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
