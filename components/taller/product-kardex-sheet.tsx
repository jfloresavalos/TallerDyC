"use client"

import { useState, useTransition } from "react"
import { getProductKardex, type KardexEntry } from "@/lib/actions/products"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ShoppingCart, Wrench, Loader2, Package, TrendingDown } from "lucide-react"
import type { Product } from "@prisma/client"

interface ProductKardexSheetProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  })
}

export function ProductKardexSheet({ product, open, onOpenChange }: ProductKardexSheetProps) {
  const [entries, setEntries] = useState<KardexEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen)
    if (isOpen && product && !loaded) {
      startTransition(async () => {
        const data = await getProductKardex(product.id)
        setEntries(data)
        setLoaded(true)
      })
    }
    if (!isOpen) {
      setEntries([])
      setLoaded(false)
    }
  }

  const totalUnidades = entries.reduce((s, e) => s + e.quantity, 0)
  const totalMonto    = entries.reduce((s, e) => s + e.subtotal, 0)

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] flex flex-col rounded-2xl p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-blue-600" />
            Movimientos del producto
          </DialogTitle>
          {product && (
            <div className="mt-1">
              <p className="font-semibold text-slate-900 text-base">{product.name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                {product.brand && (
                  <span className="text-xs bg-slate-800 text-white px-2 py-0.5 rounded-full">{product.brand}</span>
                )}
                <span className="text-xs text-slate-500">
                  Stock actual: <strong>{product.stock} {product.unit}</strong>
                </span>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Loading */}
          {isPending && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
              <p className="text-sm text-slate-400">Cargando movimientos...</p>
            </div>
          )}

          {/* Sin movimientos */}
          {!isPending && loaded && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Package className="w-7 h-7 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-700">Sin movimientos</p>
              <p className="text-sm text-slate-400 mt-1">Este producto aún no ha sido usado en ventas ni servicios.</p>
            </div>
          )}

          {/* Stats + Lista */}
          {!isPending && loaded && entries.length > 0 && (
            <div className="px-5 py-4 space-y-4">

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-700 leading-none">{totalUnidades}</p>
                  <p className="text-xs text-red-500 mt-1">Unidades salidas</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700 leading-none">S/ {totalMonto.toFixed(2)}</p>
                  <p className="text-xs text-green-500 mt-1">Total facturado</p>
                </div>
              </div>

              {/* Lista con filtro */}
              <KardexList entries={entries} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function KardexList({ entries }: { entries: KardexEntry[] }) {
  const [filter, setFilter] = useState<"all" | "venta" | "servicio">("all")

  const filtered = filter === "all" ? entries : entries.filter(e => e.type === filter)

  return (
    <div className="space-y-3">
      {/* Chips de filtro */}
      <div className="flex gap-1.5 flex-wrap">
        {(["all", "venta", "servicio"] as const).map(f => {
          const count = f === "all" ? entries.length : entries.filter(e => e.type === f).length
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors border ${
                active
                  ? f === "venta"    ? "bg-blue-600 text-white border-blue-600"
                  : f === "servicio" ? "bg-amber-500 text-white border-amber-500"
                  : "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "Todos" : f === "venta" ? "Ventas" : "Servicios"} ({count})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6">Sin resultados para este filtro.</p>
      )}

      {filtered.map(entry => (
        <div
          key={entry.id}
          className={`rounded-2xl border p-3.5 space-y-2 ${
            entry.type === "venta"
              ? "bg-blue-50 border-blue-100"
              : "bg-amber-50 border-amber-100"
          }`}
        >
          {/* Fila 1: ícono + referencia + fecha */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                entry.type === "venta" ? "bg-blue-600" : "bg-amber-500"
              }`}>
                {entry.type === "venta"
                  ? <ShoppingCart className="w-4 h-4 text-white" />
                  : <Wrench className="w-4 h-4 text-white" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{entry.reference}</p>
                <p className="text-xs text-slate-500 truncate">{entry.detail}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 shrink-0 mt-0.5">{formatDate(entry.date)}</p>
          </div>

          {/* Fila 2: cliente + cantidades */}
          <div className="flex items-center justify-between gap-2 pl-10">
            <p className="text-xs text-slate-600 truncate flex-1">{entry.client}</p>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-red-600">
                −{entry.quantity} {entry.quantity === 1 ? "ud" : "uds"}
              </span>
              <span className="text-xs font-bold text-slate-700">
                S/ {entry.subtotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Precio unitario */}
          <p className="text-xs text-slate-400 pl-10">
            S/ {entry.unitPrice.toFixed(2)} c/u
          </p>
        </div>
      ))}
    </div>
  )
}
