"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getProducts, deleteProduct } from "@/lib/actions/products"
import { BranchSelector } from "@/components/taller/branch-selector"
import { ProductFormDialog } from "@/components/taller/product-form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Package, AlertTriangle, Trash2, Pencil, BarChart3, Loader2 } from "lucide-react"
import type { Branch, Product } from "@prisma/client"

interface InventoryClientProps {
  categories: string[]
  branches: Branch[]
}

export function InventoryClient({ categories, branches }: InventoryClientProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const loadProducts = (branchId?: string | "all", q?: string, cat?: string) => {
    const branch = branchId ?? selectedBranch
    const query = q ?? search
    const category = cat ?? categoryFilter

    if (!query.trim() && category === "all") {
      setProducts([])
      setHasSearched(false)
      return
    }

    startTransition(async () => {
      const updated = await getProducts(
        branch === "all" ? undefined : branch,
        query.trim() || undefined,
      )
      const filtered = category !== "all" ? updated.filter(p => p.category === category) : updated
      setProducts(filtered)
      setHasSearched(true)
    })
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    loadProducts(selectedBranch, value, categoryFilter)
  }

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
    loadProducts(selectedBranch, search, value)
  }

  const handleBranchChange = (branchId: string | "all") => {
    setSelectedBranch(branchId)
    loadProducts(branchId, search, categoryFilter)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteProduct(deleteId)
      toast.success("Producto eliminado")
      setDeleteId(null)
      loadProducts()
      router.refresh()
    } catch {
      toast.error("Error al eliminar")
    }
  }

  const handleSaved = async () => {
    setFormOpen(false)
    setEditProduct(null)
    loadProducts()
    router.refresh()
  }

  const lowStock = products.filter(p => p.stock <= p.minStock)
  const allCategories = [...new Set(categories)]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-500 mt-0.5">Busca productos y repuestos en stock</p>
        </div>
        <Button
          onClick={() => { setEditProduct(null); setFormOpen(true) }}
          className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer font-semibold shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Agregar
        </Button>
      </div>

      <BranchSelector branches={branches} selected={selectedBranch} onChange={handleBranchChange} />

      {/* Filtros */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, código o categoría..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="h-11 pl-9 rounded-xl"
          />
          {isPending && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
          )}
        </div>
        {allCategories.length > 0 && (
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
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
      {hasSearched && lowStock.length > 0 && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
          <p className="text-sm text-orange-800 font-medium">
            {lowStock.length} producto{lowStock.length > 1 ? "s" : ""} con stock bajo o agotado
          </p>
        </div>
      )}

      {/* Stats rápidas */}
      {hasSearched && products.length > 0 && (
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

      {/* Estado inicial: sin búsqueda ni filtro */}
      {!hasSearched && !isPending && categoryFilter === "all" && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Busca un producto</h3>
          <p className="text-sm text-slate-400">Usa el buscador o filtra por categoría</p>
        </div>
      )}

      {/* Loading */}
      {isPending && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      )}

      {/* Sin resultados */}
      {hasSearched && !isPending && products.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
          <Package className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-600">Sin productos</p>
          <p className="text-sm text-slate-400 mt-1">Intenta con otro término de búsqueda</p>
        </div>
      )}

      {/* Lista de productos */}
      {hasSearched && !isPending && products.length > 0 && (
        <div className="space-y-2">
          {products.map(product => {
            const isLow = product.stock <= product.minStock
            const isOut = product.stock === 0
            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl border-2 ${isOut ? "border-red-200" : isLow ? "border-orange-200" : "border-slate-100"} p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900">{product.name}</h3>
                      {product.code && (
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg text-slate-500">{product.code}</span>
                      )}
                      {product.category && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{product.category}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-sm font-semibold text-green-600">S/ {product.price.toFixed(2)}</span>
                      {product.cost != null && (
                        <span className="text-xs text-slate-400">Costo: S/ {product.cost.toFixed(2)}</span>
                      )}
                      <span className="text-xs text-slate-500">{product.unit}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-sm font-bold ${
                      isOut ? "bg-red-100 text-red-700" :
                      isLow ? "bg-orange-100 text-orange-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {isOut ? "Agotado" : isLow ? "Stock bajo" : product.stock}
                      {!isOut && <span className="font-normal text-xs ml-0.5">{product.unit}</span>}
                    </div>
                    {!isOut && (
                      <p className="text-xs text-slate-400 mt-0.5">Mín: {product.minStock}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditProduct(product); setFormOpen(true) }}
                    className="flex-1 h-11 rounded-xl cursor-pointer text-xs font-medium"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(product.id)}
                    className="h-11 px-3 rounded-xl cursor-pointer text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editProduct}
        categories={allCategories}
        branches={branches}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
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
