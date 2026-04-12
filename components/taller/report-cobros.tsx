"use client"

import { useState } from "react"
import Link from "next/link"
import { getCobrosReport } from "@/lib/actions/vehicles"
import { BranchSelector } from "@/components/taller/branch-selector"
import { ArrowLeft, DollarSign, Car, ShoppingCart, Banknote, CreditCard, Smartphone, ChevronDown, ChevronUp } from "lucide-react"
import type { Branch } from "@prisma/client"

type CobrosReport = Awaited<ReturnType<typeof getCobrosReport>>

interface Props {
  initialReport: CobrosReport
  branches: Branch[]
}

const METHOD_ICON: Record<string, { icon: React.ReactNode; label: string }> = {
  Efectivo:     { icon: <Banknote className="w-4 h-4" />,    label: "Efectivo" },
  Yape:         { icon: <Smartphone className="w-4 h-4" />,  label: "Yape" },
  Plin:         { icon: <Smartphone className="w-4 h-4" />,  label: "Plin" },
  Tarjeta:      { icon: <CreditCard className="w-4 h-4" />,  label: "Tarjeta" },
  Transferencia:{ icon: <CreditCard className="w-4 h-4" />,  label: "Transferencia" },
}

function fmt(n: number) { return `S/ ${n.toFixed(2)}` }

function fmtTime(d: Date | string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })
}

export function ReportCobrosClient({ initialReport, branches }: Props) {
  const [report, setReport]   = useState(initialReport)
  const [date, setDate]       = useState(initialReport.date)
  const [branch, setBranch]   = useState<string | "all">("all")
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })

  const handleFilter = async (newBranch?: string | "all", newDate?: string) => {
    setLoading(true)
    try {
      const b = (newBranch ?? branch) === "all" ? undefined : (newBranch ?? branch)
      const d = newDate ?? date
      const r = await getCobrosReport(b, d)
      setReport(r as CobrosReport)
    } finally {
      setLoading(false)
    }
  }

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/reportes">
          <button className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cobros del Día</h1>
          <p className="text-sm text-slate-500">Servicios cobrados + ventas de mostrador</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <BranchSelector branches={branches} selected={branch} onChange={b => { setBranch(b); handleFilter(b) }} />
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            className="flex-1 h-11 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <button
            onClick={() => handleFilter()}
            disabled={loading}
            className="h-11 px-4 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Cargando…" : "Ver"}
          </button>
        </div>
      </div>

      {/* Totales */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white">
        <p className="text-sm text-slate-400 mb-4 font-medium">
          {new Date(date + "T12:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <p className="text-4xl font-black tabular-nums">{fmt(report.grandTotal)}</p>
        <p className="text-slate-400 text-sm mt-1">Total cobrado</p>

        <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-700">
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Car className="w-3.5 h-3.5" /> Servicios taller
            </div>
            <p className="text-xl font-bold tabular-nums">{fmt(report.serviceTotal)}</p>
            <p className="text-slate-500 text-xs">{report.vehicleCount} vehículo{report.vehicleCount !== 1 ? "s" : ""}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <ShoppingCart className="w-3.5 h-3.5" /> Ventas mostrador
            </div>
            <p className="text-xl font-bold tabular-nums">{fmt(report.salesTotal)}</p>
            <p className="text-slate-500 text-xs">{report.saleCount} venta{report.saleCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Por método de pago */}
      {Object.keys(report.paymentTotals).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Por método de pago</p>
          <div className="space-y-2">
            {Object.entries(report.paymentTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([method, total]) => {
                const pct = report.grandTotal > 0 ? (total / report.grandTotal) * 100 : 0
                const meta = METHOD_ICON[method] ?? { icon: <DollarSign className="w-4 h-4" />, label: method }
                return (
                  <div key={method} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-800">{meta.label}</span>
                        <span className="text-sm font-bold tabular-nums text-slate-900">{fmt(total)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-900 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Lista de servicios cobrados */}
      {report.vehicles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700 px-1">Servicios cobrados ({report.vehicleCount})</p>
          {report.vehicles.map(v => (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggle(v.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{v.plate}</span>
                    <span className="text-xs text-slate-500">{v.brand} {v.model}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{v.clientName} · {fmtTime(v.exitTime)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-900 tabular-nums">{fmt(v.totalAmount ?? 0)}</p>
                  <p className="text-xs text-slate-500">{v.paymentMethod1}{v.paymentMethod2 ? ` + ${v.paymentMethod2}` : ""}</p>
                </div>
                {expanded[v.id] ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>
              {expanded[v.id] && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-1">
                  {v.services.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm text-slate-600">
                      <span>{s.serviceType}</span>
                      <span className="tabular-nums">{s.price ? fmt(s.price) : "—"}</span>
                    </div>
                  ))}
                  {(v.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Descuento</span>
                      <span className="tabular-nums">- {fmt(v.discount ?? 0)}</span>
                    </div>
                  )}
                  {v.voucherType && v.voucherType !== "ninguno" && (
                    <p className="text-xs text-slate-400 pt-1 capitalize">{v.voucherType}{v.clientRuc ? ` — RUC: ${v.clientRuc}` : ""}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lista de ventas */}
      {report.sales.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700 px-1">Ventas mostrador ({report.saleCount})</p>
          {report.sales.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggle("sale-" + s.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{s.saleNumber}</span>
                    {s.clientName && <span className="text-xs text-slate-500 truncate">{s.clientName}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{fmtTime(s.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-900 tabular-nums">{fmt(s.total)}</p>
                  <p className="text-xs text-slate-500">{s.paymentMethod1}{s.paymentMethod2 ? ` + ${s.paymentMethod2}` : ""}</p>
                </div>
                {expanded["sale-" + s.id] ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>
              {expanded["sale-" + s.id] && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-1">
                  {s.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-slate-600">
                      <span>{item.product.name} × {item.quantity}</span>
                      <span className="tabular-nums">{fmt(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Estado vacío */}
      {report.vehicleCount === 0 && report.saleCount === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-500">Sin cobros en esta fecha</p>
          <p className="text-sm text-slate-400 mt-1">No se registraron servicios ni ventas</p>
        </div>
      )}
    </div>
  )
}
