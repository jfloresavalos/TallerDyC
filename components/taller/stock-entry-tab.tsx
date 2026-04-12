"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import { toast } from "sonner"
import { getProducts, createStockEntry, createBulkStockEntries } from "@/lib/actions/products"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, Trash2, PackagePlus, Loader2, X, CheckCircle2, Tag } from "lucide-react"
import type { Branch, Product } from "@prisma/client"

interface StockEntryTabProps {
  branches: Branch[]
  selectedBranch: string | "all"
  onSuccess?: () => void
}

// Motivos predefinidos para un taller mecánico
const PRESET_NOTES = [
  "Compra a proveedor",
  "Reposición mensual",
  "Compra urgente",
  "Devolución de cliente",
  "Ajuste de inventario",
  "Corrección de error",
  "Donación / obsequio",
  "Traslado entre sedes",
]

// ─── Selector de motivo (checklist + campo libre) ─────────────────────────────

function NoteSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isPreset = PRESET_NOTES.includes(value)
  const [showCustom, setShowCustom] = useState(!isPreset && value !== "")

  const handleChip = (note: string) => {
    if (value === note) {
      onChange("")          // deseleccionar
    } else {
      onChange(note)
      setShowCustom(false)
    }
  }

  const handleCustomToggle = () => {
    setShowCustom(s => {
      if (!s) onChange("") // limpiar al abrir campo libre
      return !s
    })
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5 text-slate-400" />
        Motivo del ingreso <span className="text-slate-400 font-normal">(opcional)</span>
      </label>

      {/* Chips de presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_NOTES.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => handleChip(n)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium cursor-pointer transition-colors ${
              value === n
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {n}
          </button>
        ))}
        {/* Chip "Otro..." */}
        <button
          type="button"
          onClick={handleCustomToggle}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium cursor-pointer transition-colors ${
            showCustom
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-500 border-dashed border-slate-300 hover:bg-slate-50"
          }`}
        >
          Otro...
        </button>
      </div>

      {/* Campo libre */}
      {showCustom && (
        <Input
          value={PRESET_NOTES.includes(value) ? "" : value}
          onChange={e => onChange(e.target.value)}
          placeholder="Describe el motivo..."
          className="h-10 rounded-xl text-sm"
          autoFocus
        />
      )}

      {/* Indicador de selección */}
      {value && !showCustom && (
        <p className="text-xs text-blue-600 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Motivo seleccionado: <strong>{value}</strong>
        </p>
      )}
    </div>
  )
}

// ─── Modo Individual ───────────────────────────────────────────────────────────

function IndividualEntry({ selectedBranch, onSuccess }: { selectedBranch: string | "all"; onSuccess?: () => void }) {
  const [search,      setSearch]      = useState("")
  const [results,     setResults]     = useState<Product[]>([])
  const [selected,    setSelected]    = useState<Product | null>(null)
  const [quantity,    setQuantity]    = useState("")
  const [costPrice,   setCostPrice]   = useState("")
  const [note,        setNote]        = useState("")
  const [isPending,   startTransition] = useTransition()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const branchId = selectedBranch === "all" ? undefined : selectedBranch
        const data = await getProducts(branchId, value.trim())
        setResults(data)
      })
    }, 300)
  }, [selectedBranch, startTransition])

  const handleSelect = (product: Product) => {
    setSelected(product)
    setSearch("")
    setResults([])
    if (product.cost) setCostPrice(String(product.cost))
  }

  const handleClear = () => {
    setSelected(null)
    setQuantity("")
    setCostPrice("")
    setNote("")
  }

  const handleSubmit = async () => {
    if (!selected) return
    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) { toast.error("Cantidad inválida"); return }
    setIsSubmitting(true)
    try {
      const cost = costPrice ? parseFloat(costPrice) : undefined
      await createStockEntry({
        productId: selected.id,
        quantity: qty,
        costPrice: cost && !isNaN(cost) ? cost : undefined,
        note: note.trim() || undefined,
        branchId: selectedBranch === "all" ? undefined : selectedBranch,
      })
      toast.success(`+${qty} ${selected.unit} ingresadas — ${selected.name}`)
      handleClear()
      onSuccess?.()
    } catch {
      toast.error("Error al registrar ingreso")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* Buscador */}
      {!selected && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Producto *</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, marca o código..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="h-11 pl-9 rounded-xl"
            />
            {isPending && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>
          {results.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-sm">
              {results.slice(0, 6).map(p => (
                <button key={p.id} onClick={() => handleSelect(p)}
                  className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                    {p.brand && <p className="text-xs text-slate-500">{p.brand}</p>}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">Stock: {p.stock} {p.unit}</span>
                </button>
              ))}
            </div>
          )}
          {search.trim() && !isPending && results.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-3">Sin resultados</p>
          )}
        </div>
      )}

      {/* Producto seleccionado (chip) */}
      {selected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm truncate">{selected.name}</p>
            <p className="text-xs text-blue-600">Stock actual: <strong>{selected.stock} {selected.unit}</strong></p>
          </div>
          <button onClick={handleClear} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-blue-100 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Campos */}
      {selected && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Cantidad *</label>
              <Input type="number" inputMode="numeric" min="1"
                value={quantity} onChange={e => setQuantity(e.target.value)}
                placeholder="ej. 10" className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Costo unitario</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">S/</span>
                <Input type="number" inputMode="decimal" min="0" step="0.01"
                  value={costPrice} onChange={e => setCostPrice(e.target.value)}
                  placeholder="0.00" className="h-11 rounded-xl pl-8"
                />
              </div>
            </div>
          </div>

          {/* Checklist de motivos */}
          <NoteSelector value={note} onChange={setNote} />

          <Button onClick={handleSubmit} disabled={isSubmitting || !quantity}
            className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 cursor-pointer font-semibold"
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
              : <><CheckCircle2 className="w-4 h-4 mr-2" /> Registrar Ingreso</>
            }
          </Button>
        </>
      )}
    </div>
  )
}

// ─── Fila de ingreso bulk ─────────────────────────────────────────────────────

interface BulkRow {
  key: number
  product: Product | null
  search: string
  results: Product[]
  quantity: string
  costPrice: string
}

function BulkEntry({ selectedBranch, onSuccess }: { selectedBranch: string | "all"; onSuccess?: () => void }) {
  const [rows,        setRows]        = useState<BulkRow[]>([{ key: 0, product: null, search: "", results: [], quantity: "", costPrice: "" }])
  const [note,        setNote]        = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending,   startTransition] = useTransition()
  const debounceRefs = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const keyRef = useRef(1)

  const updateRow = (key: number, patch: Partial<BulkRow>) =>
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r))

  const handleSearch = (key: number, value: string) => {
    updateRow(key, { search: value, product: null })
    if (debounceRefs.current[key]) clearTimeout(debounceRefs.current[key])
    if (!value.trim()) { updateRow(key, { results: [] }); return }
    debounceRefs.current[key] = setTimeout(() => {
      startTransition(async () => {
        const branchId = selectedBranch === "all" ? undefined : selectedBranch
        const data = await getProducts(branchId, value.trim())
        updateRow(key, { results: data })
      })
    }, 300)
  }

  const handleSelect = (key: number, product: Product) => {
    updateRow(key, { product, search: product.name, results: [],
      costPrice: product.cost ? String(product.cost) : "" })
  }

  const addRow    = () => setRows(prev => [...prev, { key: keyRef.current++, product: null, search: "", results: [], quantity: "", costPrice: "" }])
  const removeRow = (key: number) => setRows(prev => prev.filter(r => r.key !== key))

  const handleSubmit = async () => {
    const valid = rows.filter(r => r.product && parseFloat(r.quantity) > 0)
    if (valid.length === 0) { toast.error("Agrega al menos 1 producto con cantidad"); return }
    setIsSubmitting(true)
    try {
      const entries = valid.map(r => ({
        productId: r.product!.id,
        quantity: parseFloat(r.quantity),
        costPrice: r.costPrice ? parseFloat(r.costPrice) : undefined,
        note: note.trim() || undefined,
        branchId: selectedBranch === "all" ? undefined : selectedBranch,
      }))
      const result = await createBulkStockEntries(entries)
      toast.success(`${result.count} ingresos registrados — ${result.totalUnits} unidades totales`)
      setRows([{ key: keyRef.current++, product: null, search: "", results: [], quantity: "", costPrice: "" }])
      setNote("")
      onSuccess?.()
    } catch {
      toast.error("Error al registrar ingresos")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Checklist motivo global */}
      <NoteSelector value={note} onChange={setNote} />

      {/* Tabla bulk */}
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={row.key} className="flex items-start gap-2">
            <span className="text-xs text-slate-400 mt-3.5 w-5 text-center shrink-0">{idx + 1}</span>

            {/* Buscador */}
            <div className="flex-1 min-w-0 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input placeholder="Buscar producto..."
                  value={row.search}
                  onChange={e => handleSearch(row.key, e.target.value)}
                  className={`h-10 pl-8 rounded-xl text-sm ${row.product ? "border-green-300 bg-green-50" : ""}`}
                />
                {isPending && row.search && !row.product && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 animate-spin" />
                )}
              </div>
              {row.results.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-md">
                  {row.results.slice(0, 5).map(p => (
                    <button key={p.id} onClick={() => handleSelect(row.key, p)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between gap-2"
                    >
                      <p className="text-sm text-slate-900 truncate">{p.name}</p>
                      <span className="text-xs text-slate-400 shrink-0">{p.stock} {p.unit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cantidad */}
            <Input type="number" inputMode="numeric" min="1"
              value={row.quantity} onChange={e => updateRow(row.key, { quantity: e.target.value })}
              placeholder="Cant." className="h-10 rounded-xl text-sm w-20 shrink-0"
            />

            {/* Costo */}
            <div className="relative w-24 shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">S/</span>
              <Input type="number" inputMode="decimal" min="0" step="0.01"
                value={row.costPrice} onChange={e => updateRow(row.key, { costPrice: e.target.value })}
                placeholder="Costo" className="h-10 rounded-xl text-sm pl-7"
              />
            </div>

            {/* Eliminar fila */}
            {rows.length > 1 && (
              <button onClick={() => removeRow(row.key)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={addRow} className="h-10 rounded-xl cursor-pointer border-dashed">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Agregar fila
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}
          className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 cursor-pointer font-semibold"
        >
          {isSubmitting
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
            : <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar todos</>
          }
        </Button>
      </div>
    </div>
  )
}

// ─── Tab principal ────────────────────────────────────────────────────────────

export function StockEntryTab({ selectedBranch, onSuccess }: StockEntryTabProps) {
  const [mode, setMode] = useState<"individual" | "bulk">("individual")

  return (
    <div className="space-y-5">
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button onClick={() => setMode("individual")}
          className={`px-5 h-9 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
            mode === "individual" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Individual
        </button>
        <button onClick={() => setMode("bulk")}
          className={`px-5 h-9 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
            mode === "bulk" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <PackagePlus className="w-3.5 h-3.5 inline mr-1.5" />
          Masivo
        </button>
      </div>

      {mode === "individual"
        ? <IndividualEntry selectedBranch={selectedBranch} onSuccess={onSuccess} />
        : <BulkEntry selectedBranch={selectedBranch} onSuccess={onSuccess} />
      }
    </div>
  )
}
