"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getSales } from "@/lib/actions/sales"
import { BranchSelector } from "@/components/taller/branch-selector"
import { NewSaleDialog } from "@/components/taller/new-sale-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, DollarSign, ShoppingCart, Calendar, User, ChevronDown, ChevronUp } from "lucide-react"
import type { Branch } from "@prisma/client"

type SaleItem = {
  id: string; quantity: number; unitPrice: number; subtotal: number
  product: { id: string; name: string; unit: string }
}
type Sale = {
  id: string; saleNumber: string; clientName: string | null; clientDNI: string | null
  clientPhone: string | null; total: number; createdAt: Date
  branch: { id: string; name: string }
  createdBy: { id: string; name: string }
  items: SaleItem[]
}

interface TodayStats { total: number; count: number }

interface SalesClientProps {
  initialSales: Sale[]
  todayStats: TodayStats
  branches: Branch[]
  userId: string
}

export function SalesClient({ initialSales, todayStats, branches, userId }: SalesClientProps) {
  const [sales, setSales] = useState(initialSales)
  const [today] = useState(todayStats)
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [newSaleOpen, setNewSaleOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleFilter = async (branchId?: string | "all") => {
    setIsLoading(true)
    try {
      const bid = (branchId ?? selectedBranch) === "all" ? undefined : (branchId ?? selectedBranch)
      const updated = await getSales(bid, dateFrom || undefined, dateTo || undefined)
      setSales(updated as Sale[])
    } finally { setIsLoading(false) }
  }

  const handleBranchChange = (branchId: string | "all") => {
    setSelectedBranch(branchId)
    handleFilter(branchId)
  }

  const handleSaleCreated = async () => {
    setNewSaleOpen(false)
    await handleFilter()
    router.refresh()
  }

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima" })
  const formatTime = (date: Date | string) =>
    new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ventas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registro de ventas directas</p>
        </div>
        <Button
          onClick={() => setNewSaleOpen(true)}
          className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer font-semibold shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nueva Venta
        </Button>
      </div>

      <BranchSelector branches={branches} selected={selectedBranch} onChange={handleBranchChange} />

      {/* Stats hoy */}
      <div className="bg-slate-900 rounded-2xl p-4 text-white">
        <p className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wide">Hoy</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-3xl font-bold">S/ {today.total.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total cobrado</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{today.count}</p>
            <p className="text-xs text-slate-400 mt-0.5">Ventas realizadas</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Desde</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Hasta</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-11 rounded-xl" />
          </div>
        </div>
        <Button onClick={() => handleFilter()} disabled={isLoading} className="w-full h-11 rounded-xl cursor-pointer font-semibold">
          {isLoading ? "Cargando..." : "Filtrar"}
        </Button>
      </div>

      {/* Lista de ventas */}
      {sales.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
          <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-600">Sin ventas</p>
          <p className="text-sm text-slate-400 mt-1">Crea la primera venta</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sales.map(sale => {
            const isExpanded = expandedId === sale.id
            return (
              <div key={sale.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                  className="w-full px-4 py-4 text-left cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-semibold">{sale.saleNumber}</span>
                        <span className="text-xs text-slate-400">{sale.branch.name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {sale.clientName && (
                          <span className="flex items-center gap-1 text-xs text-slate-600">
                            <User className="w-3 h-3" />{sale.clientName}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {formatDate(sale.createdAt)} {formatTime(sale.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-lg font-bold text-green-600">S/ {sale.total.toFixed(2)}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Productos vendidos</p>
                    {sale.items.map(item => (
                      <div key={item.id} className="bg-white rounded-xl p-3 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{item.product.name}</p>
                          <p className="text-xs text-slate-500">{item.quantity} {item.product.unit} × S/ {item.unitPrice.toFixed(2)}</p>
                        </div>
                        <p className="text-sm font-bold text-green-600 shrink-0">S/ {item.subtotal.toFixed(2)}</p>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="text-xs text-slate-500">Atendido por: {sale.createdBy.name}</span>
                      <span className="text-sm font-bold text-slate-900">Total: S/ {sale.total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <NewSaleDialog
        open={newSaleOpen}
        onOpenChange={setNewSaleOpen}
        branches={branches}
        userId={userId}
        onSaleCreated={handleSaleCreated}
      />
    </div>
  )
}
