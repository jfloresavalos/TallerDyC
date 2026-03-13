"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { createProduct, updateProduct, addStock } from "@/lib/actions/products"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Branch, Product } from "@prisma/client"

const UNITS = ["unidad", "litro", "galón", "metro", "kg", "par", "caja", "juego"]

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  categories: string[]
  branches: Branch[]
  onSaved: () => void
}

export function ProductFormDialog({ open, onOpenChange, product, categories, branches, onSaved }: ProductFormDialogProps) {
  const isEdit = !!product
  const [isLoading, setIsLoading] = useState(false)
  const [addStockMode, setAddStockMode] = useState(false)
  const [stockToAdd, setStockToAdd] = useState("")

  const [form, setForm] = useState({
    name: "", code: "", description: "", unit: "unidad",
    price: "", cost: "", stock: "", minStock: "5",
    category: "", branchId: "none",
  })

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        code: product.code ?? "",
        description: product.description ?? "",
        unit: product.unit,
        price: String(product.price),
        cost: product.cost != null ? String(product.cost) : "",
        stock: String(product.stock),
        minStock: String(product.minStock),
        category: product.category ?? "",
        branchId: product.branchId ?? "none",
      })
    } else {
      setForm({ name: "", code: "", description: "", unit: "unidad", price: "", cost: "", stock: "0", minStock: "5", category: "", branchId: "none" })
    }
    setAddStockMode(false)
    setStockToAdd("")
  }, [product, open])

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!form.name || !form.price) { toast.error("Nombre y precio son requeridos"); return }
    setIsLoading(true)
    try {
      const data = {
        name: form.name,
        code: form.code || undefined,
        description: form.description || undefined,
        unit: form.unit,
        price: parseFloat(form.price),
        cost: form.cost ? parseFloat(form.cost) : undefined,
        stock: parseInt(form.stock) || 0,
        minStock: parseInt(form.minStock) || 5,
        category: form.category || undefined,
        branchId: form.branchId !== "none" ? form.branchId : undefined,
      }
      if (isEdit && product) {
        await updateProduct(product.id, data)
        toast.success("Producto actualizado")
      } else {
        await createProduct(data)
        toast.success("Producto creado")
      }
      onSaved()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido"
      toast.error(msg.includes("Unique constraint") ? "El código ya existe" : "Error al guardar")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddStock = async () => {
    if (!product || !stockToAdd) return
    const qty = parseInt(stockToAdd)
    if (isNaN(qty) || qty <= 0) { toast.error("Cantidad inválida"); return }
    setIsLoading(true)
    try {
      await addStock(product.id, qty)
      toast.success(`+${qty} unidades agregadas`)
      onSaved()
    } catch { toast.error("Error al agregar stock") }
    finally { setIsLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>

        {isEdit && (
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-1">
            <button
              onClick={() => setAddStockMode(false)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium cursor-pointer transition-colors ${!addStockMode ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
            >Editar datos</button>
            <button
              onClick={() => setAddStockMode(true)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium cursor-pointer transition-colors ${addStockMode ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
            >Agregar stock</button>
          </div>
        )}

        {addStockMode && isEdit ? (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="text-slate-500">Stock actual</p>
              <p className="text-2xl font-bold text-slate-900">{product?.stock} {product?.unit}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Cantidad a ingresar *</label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                value={stockToAdd}
                onChange={e => setStockToAdd(e.target.value)}
                placeholder="ej. 10"
                className="h-14 rounded-xl text-xl font-bold text-center"
              />
            </div>
            <Button onClick={handleAddStock} disabled={isLoading || !stockToAdd} className="w-full h-14 rounded-xl bg-green-600 hover:bg-green-700 cursor-pointer font-semibold">
              {isLoading ? "Guardando..." : "Confirmar Ingreso"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Nombre *</label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="ej. Aceite 10W-40" className="h-12 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Código</label>
                <Input value={form.code} onChange={e => set("code", e.target.value)} placeholder="ej. ACT-001" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Unidad</label>
                <Select value={form.unit} onValueChange={v => set("unit", v)}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Precio venta *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">S/.</span>
                  <Input type="number" inputMode="decimal" min="0" step="0.50" value={form.price} onChange={e => set("price", e.target.value)} className="h-12 pl-9 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Costo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">S/.</span>
                  <Input type="number" inputMode="decimal" min="0" step="0.50" value={form.cost} onChange={e => set("cost", e.target.value)} className="h-12 pl-9 rounded-xl" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Stock inicial</label>
                <Input type="number" inputMode="numeric" min="0" value={form.stock} onChange={e => set("stock", e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Stock mínimo</label>
                <Input type="number" inputMode="numeric" min="0" value={form.minStock} onChange={e => set("minStock", e.target.value)} className="h-12 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Categoría</label>
              <Input value={form.category} onChange={e => set("category", e.target.value)} placeholder="ej. Lubricantes, Filtros..." list="categories-list" className="h-12 rounded-xl" />
              <datalist id="categories-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            {branches.length > 1 && (
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Sede</label>
                <Select value={form.branchId} onValueChange={v => set("branchId", v)}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Todas las sedes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Todas las sedes</SelectItem>
                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.description !== undefined && (
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Descripción</label>
                <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Descripción del producto..." className="rounded-xl min-h-[70px]" />
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-xl cursor-pointer" disabled={isLoading}>Cancelar</Button>
              <Button onClick={handleSubmit} className="flex-[2] h-12 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer font-semibold" disabled={isLoading}>
                {isLoading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear producto"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
