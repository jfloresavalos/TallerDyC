"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deleteProduct } from "@/lib/actions/products"
import { BranchSelector } from "@/components/taller/branch-selector"
import { ProductFormDialog } from "@/components/taller/product-form-dialog"
import { ProductKardexSheet } from "@/components/taller/product-kardex-sheet"
import { MovementsTab } from "@/components/taller/movements-tab"
import { StockEntryTab } from "@/components/taller/stock-entry-tab"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Package, AlertTriangle, Trash2, Pencil, BarChart3, History } from "lucide-react"
import type { Branch, Product } from "@prisma/client"

interface InventoryClientProps {
  categories: string[]
  branches: Branch[]
  initialProducts: Product[]
}

export function InventoryClient({ categories, branches, initialProducts }: InventoryClientProps) {
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [kardexProduct, setKardexProduct] = useState<Product | null>(null)
  const [kardexOpen, setKardexOpen] = useState(false)
  const router = useRouter()

  const TOP_N = 20

  // Filtrado 100% local — sin llamadas extra a la BD
  const products = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = initialProducts.filter(p => {
      if (selectedBranch !== "all" && p.branchId !== selectedBranch) return false
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          (p.code?.toLowerCase().includes(q) ?? false) ||
          (p.category?.toLowerCase().includes(q) ?? false) ||
          (p.brand?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
    // Sin filtros activos → mostrar solo top N (más relevantes por nombre)
    const isFiltered = q || categoryFilter !== "all" || selectedBranch !== "all"
    return isFiltered ? filtered : filtered.slice(0, TOP_N)
  }, [initialProducts, selectedBranch, categoryFilter, search])

  const lowStock = useMemo(() => products.filter(p => p.stock <= p.minStock), [products])
  const allCategories = [...new Set(categories)]

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteProduct(deleteId)
      toast.success("Producto eliminado")
      setDeleteId(null)
      router.refresh()
    } catch {
      toast.error("Error al eliminar")
    }
  }

  const handleSaved = () => {
    setFormOpen(false)
    setEditProduct(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-500 mt-0.5">Productos, movimientos e ingresos de stock</p>
        </div>
        <Button
          onClick={() => { setEditProduct(null); setFormOpen(true) }}
          className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer font-semibold shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Agregar
        </Button>
      </div>

      <Tabs defaultValue="productos">
        <TabsList className="w-full">
          <TabsTrigger value="productos" className="flex-1 cursor-pointer">Productos</TabsTrigger>
          <TabsTrigger value="movimientos" className="flex-1 cursor-pointer">Movimientos</TabsTrigger>
          <TabsTrigger value="ingreso" className="flex-1 cursor-pointer">Nuevo Ingreso</TabsTrigger>
        </TabsList>

        {/* ── TAB MOVIMIENTOS ── */}
        <TabsContent value="movimientos" className="mt-4">
          <MovementsTab branches={branches} defaultBranch={selectedBranch} />
        </TabsContent>

        {/* ── TAB NUEVO INGRESO ── */}
        <TabsContent value="ingreso" className="mt-4">
          <StockEntryTab branches={branches} selectedBranch={selectedBranch} onSuccess={handleSaved} />
        </TabsContent>

        {/* ── TAB PRODUCTOS ── */}
        <TabsContent value="productos" className="mt-4 space-y-3">

          <BranchSelector branches={branches} selected={selectedBranch} onChange={setSelectedBranch} />

          {/* Filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, marca, código o categoría..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-11 pl-9 rounded-xl"
              />
            </div>
            {allCategories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-11 rounded-xl w-auto min-w-[120px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Alerta stock bajo */}
          {lowStock.length > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
              <p className="text-sm text-orange-800 font-medium">
                {lowStock.length} producto{lowStock.length > 1 ? "s" : ""} con stock bajo o agotado
              </p>
            </div>
          )}

          {/* Stats rápidas */}
          {products.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-600 rounded-2xl p-3 text-white text-center">
                <Package className="w-5 h-5 mx-auto mb-1 opacity-80" />
                <p className="text-2xl font-bold leading-none">{products.length}</p>
                <p className="text-xs mt-1 opacity-80">Productos</p>
              </div>
              <div className="bg-orange-500 rounded-2xl p-3 text-white text-center">
                <AlertTriangle className="w-5 h-5 mx-auto mb-1 opacity-80" />
                <p className="text-2xl font-bold leading-none">{lowStock.length}</p>
                <p className="text-xs mt-1 opacity-80">Stock bajo</p>
              </div>
              <div className="bg-green-600 rounded-2xl p-3 text-white text-center">
                <BarChart3 className="w-5 h-5 mx-auto mb-1 opacity-80" />
                <p className="text-2xl font-bold leading-none">
                  {products.reduce((s, p) => s + p.stock, 0)}
                </p>
                <p className="text-xs mt-1 opacity-80">Unidades</p>
              </div>
            </div>
          )}

          {/* Sin resultados */}
          {products.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-600">Sin productos</p>
              <p className="text-sm text-slate-400 mt-1">
                {search || categoryFilter !== "all" ? "Intenta con otro término de búsqueda" : "Agrega tu primer producto"}
              </p>
            </div>
          )}

          {/* ── TABLA DESKTOP ── */}
          {products.length > 0 && (
            <>
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs">Producto</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-slate-600 text-xs">Categoría</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-slate-600 text-xs">Precio</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-slate-600 text-xs">Costo</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-slate-600 text-xs">Stock</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-slate-600 text-xs">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map(product => {
                      const isLow = product.stock <= product.minStock
                      const isOut = product.stock === 0
                      return (
                        <tr key={product.id} className={`hover:bg-slate-50 transition-colors ${isOut ? "bg-red-50/40" : isLow ? "bg-orange-50/40" : ""}`}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-slate-900 truncate max-w-[220px]">{product.name}</span>
                              {product.code && (
                                <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 shrink-0">{product.code}</span>
                              )}
                              {product.brand && (
                                <span className="text-xs bg-slate-800 text-white px-1.5 py-0.5 rounded-full shrink-0">{product.brand}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            {product.category
                              ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{product.category}</span>
                              : <span className="text-xs text-slate-300">—</span>
                            }
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-green-600">
                            S/ {product.price.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-400 text-xs">
                            {product.cost != null ? `S/ ${product.cost.toFixed(2)}` : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${
                              isOut ? "bg-red-100 text-red-700" :
                              isLow ? "bg-orange-100 text-orange-700" :
                              "bg-green-100 text-green-700"
                            }`}>
                              {isOut ? "Agotado" : product.stock}
                              {!isOut && <span className="font-normal">{product.unit}</span>}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => { setEditProduct(product); setFormOpen(true) }}
                                title="Editar"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { setKardexProduct(product); setKardexOpen(true) }}
                                title="Movimientos"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteId(product.id)}
                                title="Eliminar"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards compactas */}
              <div className="md:hidden space-y-1.5">
                {products.map(product => {
                  const isLow = product.stock <= product.minStock
                  const isOut = product.stock === 0
                  return (
                    <div
                      key={product.id}
                      className={`bg-white rounded-xl border flex items-center gap-2 px-3 py-2.5 ${
                        isOut ? "border-red-200" : isLow ? "border-orange-200" : "border-slate-200"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-slate-900 text-sm truncate">{product.name}</span>
                          {product.category && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full shrink-0 hidden xs:inline">{product.category}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-green-600">S/ {product.price.toFixed(2)}</span>
                          <span className={`text-xs font-bold ${isOut ? "text-red-600" : isLow ? "text-orange-600" : "text-slate-500"}`}>
                            {isOut ? "Agotado" : `${product.stock} ${product.unit}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setEditProduct(product); setFormOpen(true) }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setKardexProduct(product); setKardexOpen(true) }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(product.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Aviso top N */}
          {!search && categoryFilter === "all" && selectedBranch === "all" && initialProducts.length > TOP_N && (
            <p className="text-center text-xs text-slate-400 py-2">
              Mostrando {TOP_N} de {initialProducts.length} productos — usa el buscador para filtrar
            </p>
          )}

          <ProductKardexSheet
            product={kardexProduct}
            open={kardexOpen}
            onOpenChange={o => { setKardexOpen(o); if (!o) setKardexProduct(null) }}
          />
        </TabsContent>
      </Tabs>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editProduct}
        categories={allCategories}
        branches={branches}
        onSaved={handleSaved}
      />

      <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Eliminar producto</DialogTitle>
            <DialogDescription>Esta acción desactivará el producto del inventario. ¿Continuar?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 h-12 rounded-xl cursor-pointer">Cancelar</Button>
            <Button onClick={handleDelete} className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 cursor-pointer font-semibold">Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
