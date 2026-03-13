"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { getIncomeReport } from "@/lib/actions/vehicles"
import { BranchSelector } from "@/components/taller/branch-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, DollarSign, Car, Calendar, User, Building2, ShoppingCart, Wrench } from "lucide-react"
import type { Branch, Vehicle, Service, Sale, SaleItem, Product } from "@prisma/client"

type VehicleWithServices = Vehicle & { branch: Branch; services: Service[] }
type SaleWithItems = Sale & {
  branch: { id: string; name: string }
  createdBy: { name: string }
  items: (SaleItem & { product: { name: string; unit: string } })[]
}

interface IncomeReport {
  vehicles: VehicleWithServices[]
  sales: SaleWithItems[]
  totalIncome: number
  serviceIncome: number
  salesIncome: number
  totalVehicles: number
  avgPerVehicle: number
}

interface ReportIncomeClientProps {
  initialReport: IncomeReport
  branches: Branch[]
}

export function ReportIncomeClient({ initialReport, branches }: ReportIncomeClientProps) {
  const [report, setReport] = useState(initialReport)
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"services" | "sales">("services")

  const handleFilter = async (branchId?: string | "all") => {
    setIsLoading(true)
    try {
      const bid = (branchId ?? selectedBranch) === "all" ? undefined : (branchId ?? selectedBranch)
      const updated = await getIncomeReport(bid, dateFrom || undefined, dateTo || undefined)
      setReport(updated as IncomeReport)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBranchChange = (branchId: string | "all") => {
    setSelectedBranch(branchId)
    handleFilter(branchId)
  }

  const branchBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; services: number; sales: number; count: number }>()
    report.vehicles.forEach(v => {
      const vTotal = v.services.reduce((s, svc) => s + (svc.price ?? 0), 0)
      const existing = map.get(v.branchId)
      if (existing) { existing.services += vTotal; existing.count++ }
      else map.set(v.branchId, { name: v.branch.name, services: vTotal, sales: 0, count: 1 })
    })
    report.sales?.forEach(s => {
      const existing = map.get(s.branchId)
      if (existing) existing.sales += s.total
      else map.set(s.branchId, { name: s.branch.name, services: 0, sales: s.total, count: 0 })
    })
    return Array.from(map.values()).sort((a, b) => (b.services + b.sales) - (a.services + a.sales))
  }, [report.vehicles, report.sales])

  const getVehicleTotal = (v: VehicleWithServices) => v.services.reduce((s, svc) => s + (svc.price ?? 0), 0)
  const formatDate = (date: Date | string) => new Date(date).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima" })
  const formatTime = (date: Date | string) => new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })

  const hasSales = report.sales?.length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/reportes">
          <Button variant="outline" size="icon" className="h-11 w-11 cursor-pointer rounded-xl shrink-0" aria-label="Volver">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Ingresos / Ventas</h1>
          <p className="text-sm text-slate-500">Resumen financiero del período</p>
        </div>
      </div>

      <BranchSelector branches={branches} selected={selectedBranch} onChange={handleBranchChange} />

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Filtrar por fecha</p>
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
          {isLoading ? "Cargando..." : "Aplicar filtro"}
        </Button>
      </div>

      {/* Resumen financiero */}
      <div className="bg-green-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 opacity-80" />
          <p className="text-sm font-medium opacity-80">Total del período</p>
        </div>
        <p className="text-4xl font-bold leading-none">S/ {report.totalIncome.toFixed(2)}</p>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/20">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Wrench className="w-3.5 h-3.5 opacity-70" />
              <p className="text-xs opacity-70">Servicios taller</p>
            </div>
            <p className="text-xl font-bold">S/ {(report.serviceIncome ?? report.totalIncome).toFixed(2)}</p>
            <p className="text-xs opacity-60 mt-0.5">{report.totalVehicles} vehículos</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ShoppingCart className="w-3.5 h-3.5 opacity-70" />
              <p className="text-xs opacity-70">Ventas mostrador</p>
            </div>
            <p className="text-xl font-bold">S/ {(report.salesIncome ?? 0).toFixed(2)}</p>
            <p className="text-xs opacity-60 mt-0.5">{report.sales?.length ?? 0} ventas</p>
          </div>
        </div>
      </div>

      {/* Breakdown por sede */}
      {branchBreakdown.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-700">Por sede</p>
          </div>
          <div className="divide-y divide-slate-100">
            {branchBreakdown.map(b => (
              <div key={b.name} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{b.name}</p>
                  <p className="text-xs text-slate-400">
                    {b.count > 0 ? `${b.count} vehículos · ` : ""}
                    Svc: S/ {b.services.toFixed(0)} · Ventas: S/ {b.sales.toFixed(0)}
                  </p>
                </div>
                <p className="text-sm font-bold text-green-600">S/ {(b.services + b.sales).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("services")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeTab === "services" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Wrench className="w-4 h-4" />
          Servicios ({report.vehicles.length})
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeTab === "sales" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Ventas ({report.sales?.length ?? 0})
        </button>
      </div>

      {/* Tab: Servicios */}
      {activeTab === "services" && (
        <>
          {report.vehicles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
              <Car className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-600">Sin servicios en el período</p>
              <p className="text-sm text-slate-400 mt-1">Ajusta las fechas para ver resultados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {report.vehicles.map(vehicle => {
                const total = getVehicleTotal(vehicle)
                return (
                  <div key={vehicle.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900">{vehicle.brand} {vehicle.model}</h3>
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600">{vehicle.plate}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <User className="w-3 h-3" />{vehicle.clientName}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {vehicle.exitTime ? `${formatDate(vehicle.exitTime)} ${formatTime(vehicle.exitTime)}` : "—"}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Building2 className="w-3 h-3" />{vehicle.branch.name}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-green-600">S/ {total.toFixed(2)}</p>
                        <p className="text-xs text-slate-400">{vehicle.services.length} svc</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: Ventas */}
      {activeTab === "sales" && (
        <>
          {!hasSales ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
              <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-600">Sin ventas en el período</p>
              <p className="text-sm text-slate-400 mt-1">Las ventas de mostrador aparecen aquí</p>
            </div>
          ) : (
            <div className="space-y-2">
              {report.sales.map(sale => (
                <div key={sale.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs bg-slate-900 text-white px-2 py-0.5 rounded-lg font-semibold">{sale.saleNumber}</span>
                        {sale.clientName && <p className="font-semibold text-slate-900 text-sm truncate">{sale.clientName}</p>}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <User className="w-3 h-3" />{sale.createdBy.name}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {formatDate(sale.createdAt)} {formatTime(sale.createdAt)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Building2 className="w-3 h-3" />{sale.branch.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {sale.items.slice(0, 3).map(item => (
                          <span key={item.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {item.product.name} ×{item.quantity}
                          </span>
                        ))}
                        {sale.items.length > 3 && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">+{sale.items.length - 3} más</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-green-600">S/ {sale.total.toFixed(2)}</p>
                      <p className="text-xs text-slate-400">{sale.items.length} ítem{sale.items.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
