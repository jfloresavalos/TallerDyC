"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getSales } from "@/lib/actions/sales"
import { BranchSelector } from "@/components/taller/branch-selector"
import { NewSaleDialog } from "@/components/taller/new-sale-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, ShoppingCart, Calendar, User, Search, Phone, CreditCard, Hash, X } from "lucide-react"
import type { Branch } from "@prisma/client"

type SaleItem = {
  id: string; quantity: number; unitPrice: number; subtotal: number
  product: { id: string; name: string; unit: string }
}
type Sale = {
  id: string; saleNumber: string; clientName: string | null; clientDNI: string | null
  clientPhone: string | null; total: number; createdAt: Date
  paymentMethod1?: string | null; paymentAmount1?: number | null
  paymentMethod2?: string | null; paymentAmount2?: number | null
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

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo", yape: "Yape", plin: "Plin",
  tarjeta: "Tarjeta", transferencia: "Transferencia",
}

// Fecha actual en Lima (UTC-5) para los date pickers
const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })

export function SalesClient({ initialSales, todayStats, branches, userId }: SalesClientProps) {
  const [sales, setSales] = useState(initialSales)
  const [today] = useState(todayStats)
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all")
  // Filtros de fecha — por defecto: hoy
  const [dateFrom, setDateFrom] = useState(todayISO())
  const [dateTo, setDateTo] = useState(todayISO())
  const [search, setSearch] = useState("")
  const [newSaleOpen, setNewSaleOpen] = useState(false)
  const [detailSale, setDetailSale] = useState<Sale | null>(null)
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

  // Filtro local por nombre o DNI
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sales
    return sales.filter(s =>
      s.clientName?.toLowerCase().includes(q) ||
      s.clientDNI?.includes(q) ||
      s.saleNumber.toLowerCase().includes(q)
    )
  }, [sales, search])

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

      {/* Filtros de fecha */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium">Desde</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium">Hasta</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-11 rounded-xl" />
          </div>
        </div>
        <Button onClick={() => handleFilter()} disabled={isLoading} className="w-full h-11 rounded-xl cursor-pointer font-semibold">
          {isLoading ? "Cargando..." : "Filtrar"}
        </Button>
      </div>

      {/* Buscador por nombre / DNI */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, DNI o N° venta..."
          className="h-11 pl-9 rounded-xl"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Lista de ventas */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
          <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-600">{sales.length === 0 ? "Sin ventas en este período" : "Sin resultados"}</p>
          <p className="text-sm text-slate-400 mt-1">{sales.length === 0 ? "Registra la primera venta del día" : "Prueba con otro nombre o DNI"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Contador */}
          <p className="text-xs text-slate-500 px-1">
            {filtered.length} {filtered.length === 1 ? "venta" : "ventas"}
            {search && ` · búsqueda "${search}"`}
          </p>
          {filtered.map(sale => (
            <button
              key={sale.id}
              onClick={() => setDetailSale(sale)}
              className="w-full bg-white rounded-2xl border border-slate-200 px-4 py-4 text-left cursor-pointer hover:bg-slate-50 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-semibold">{sale.saleNumber}</span>
                    <span className="text-xs text-slate-400">{sale.branch.name}</span>
                    {sale.paymentMethod1 && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                        {PAYMENT_LABELS[sale.paymentMethod1] ?? sale.paymentMethod1}
                        {sale.paymentMethod2 && ` + ${PAYMENT_LABELS[sale.paymentMethod2] ?? sale.paymentMethod2}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {sale.clientName ? (
                      <span className="flex items-center gap-1 text-xs text-slate-600">
                        <User className="w-3 h-3" />{sale.clientName}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sin cliente</span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(sale.createdAt)} {formatTime(sale.createdAt)}
                    </span>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600 shrink-0">S/ {sale.total.toFixed(2)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Dialog detalle de venta ── */}
      <Dialog open={!!detailSale} onOpenChange={v => !v && setDetailSale(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl p-0 gap-0">
          {detailSale && (
            <>
              <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="font-mono text-base text-blue-700">{detailSale.saleNumber}</DialogTitle>
                    <p className="text-xs text-slate-500 mt-0.5">{detailSale.branch.name} · {formatDate(detailSale.createdAt)} {formatTime(detailSale.createdAt)}</p>
                  </div>
                  <span className="text-2xl font-bold text-green-600">S/ {detailSale.total.toFixed(2)}</span>
                </div>
              </DialogHeader>

              <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[65vh]">

                {/* Datos del cliente */}
                {(detailSale.clientName || detailSale.clientDNI || detailSale.clientPhone) && (
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cliente</p>
                    {detailSale.clientName && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        {detailSale.clientName}
                      </div>
                    )}
                    {detailSale.clientDNI && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                        DNI: {detailSale.clientDNI}
                      </div>
                    )}
                    {detailSale.clientPhone && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        {detailSale.clientPhone}
                      </div>
                    )}
                  </div>
                )}

                {/* Productos */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Productos</p>
                  <div className="space-y-2">
                    {detailSale.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{item.product.name}</p>
                          <p className="text-xs text-slate-500">{item.quantity} {item.product.unit} × S/ {item.unitPrice.toFixed(2)}</p>
                        </div>
                        <p className="text-sm font-bold text-green-600 shrink-0 ml-3">S/ {item.subtotal.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pago */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pago</p>
                  {detailSale.paymentMethod1 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        {PAYMENT_LABELS[detailSale.paymentMethod1] ?? detailSale.paymentMethod1}
                      </span>
                      <span className="font-semibold text-slate-800">
                        S/ {(detailSale.paymentAmount1 ?? detailSale.total).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {detailSale.paymentMethod2 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        {PAYMENT_LABELS[detailSale.paymentMethod2] ?? detailSale.paymentMethod2}
                      </span>
                      <span className="font-semibold text-slate-800">
                        S/ {(detailSale.paymentAmount2 ?? 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                    <span>Total</span>
                    <span className="text-green-600">S/ {detailSale.total.toFixed(2)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 text-right">Atendido por: {detailSale.createdBy.name}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
