"use client"

import { useState, useTransition, useEffect } from "react"
import { getAllMovements, type MovementEntry } from "@/lib/actions/products"
import { BranchSelector } from "@/components/taller/branch-selector"
import { Input } from "@/components/ui/input"
import { Search, Loader2, TrendingUp, TrendingDown, ArrowUpCircle, ShoppingCart, Wrench, Package } from "lucide-react"
import type { Branch } from "@prisma/client"

interface MovementsTabProps {
  branches: Branch[]
  defaultBranch?: string | "all"
}

const TYPE_CONFIG = {
  entrada:  { label: "Entrada",  bg: "bg-green-50",  border: "border-green-200", badge: "bg-green-100 text-green-700",  icon: ArrowUpCircle, iconBg: "bg-green-600" },
  venta:    { label: "Venta",    bg: "bg-blue-50",   border: "border-blue-200",  badge: "bg-blue-100 text-blue-700",   icon: ShoppingCart,  iconBg: "bg-blue-600"  },
  servicio: { label: "Servicio", bg: "bg-amber-50",  border: "border-amber-200", badge: "bg-amber-100 text-amber-700", icon: Wrench,         iconBg: "bg-amber-500" },
} as const

function todayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Lima",
  })
}

export function MovementsTab({ branches, defaultBranch = "all" }: MovementsTabProps) {
  const today = todayStr()
  const [movements, setMovements] = useState<MovementEntry[]>([])
  const [loaded, setLoaded]       = useState(false)
  const [isPending, startTransition] = useTransition()

  const [search,   setSearch]   = useState("")
  const [type,     setType]     = useState<"all" | "entrada" | "venta" | "servicio">("all")
  const [dateFrom, setDateFrom] = useState(today)   // ← por defecto hoy
  const [dateTo,   setDateTo]   = useState(today)   // ← por defecto hoy
  const [branch,   setBranch]   = useState<string | "all">(defaultBranch)

  const load = (opts?: {
    search?: string; type?: typeof type
    dateFrom?: string; dateTo?: string; branch?: string | "all"
  }) => {
    startTransition(async () => {
      const data = await getAllMovements({
        search:   opts?.search   ?? search,
        type:     (opts?.type ?? type) === "all" ? undefined : (opts?.type ?? type),
        dateFrom: opts?.dateFrom !== undefined ? opts.dateFrom : dateFrom,
        dateTo:   opts?.dateTo   !== undefined ? opts.dateTo   : dateTo,
        branchId: (opts?.branch  ?? branch) === "all" ? undefined : (opts?.branch ?? branch),
      })
      setMovements(data)
      setLoaded(true)
    })
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (v: string) => {
    setSearch(v)
    const t = setTimeout(() => load({ search: v }), 400)
    return () => clearTimeout(t)
  }
  const handleType     = (t: typeof type)  => { setType(t);     load({ type: t }) }
  const handleDateFrom = (v: string)        => { setDateFrom(v); load({ dateFrom: v }) }
  const handleDateTo   = (v: string)        => { setDateTo(v);   load({ dateTo: v }) }
  const handleBranch   = (b: string | "all") => { setBranch(b);  load({ branch: b }) }

  const entradas      = movements.filter(m => m.type === "entrada")
  const salidas       = movements.filter(m => m.type !== "entrada")
  const totalEntUnits = entradas.reduce((s, m) => s + m.quantity, 0)
  const totalSalUnits = salidas.reduce((s, m) => s + m.quantity, 0)
  const totalEntMonto = entradas.reduce((s, m) => s + m.subtotal, 0)
  const totalSalMonto = salidas.reduce((s, m) => s + m.subtotal, 0)

  return (
    <div className="space-y-4">

      {/* ── Filtros ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <BranchSelector branches={branches} selected={branch} onChange={handleBranch} />

        {/* Búsqueda + fechas en una fila */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar producto..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="h-9 pl-9 rounded-xl text-sm"
            />
            {isPending && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 animate-spin" />
            )}
          </div>
          <Input type="date" value={dateFrom} onChange={e => handleDateFrom(e.target.value)}
            className="h-9 rounded-xl text-sm w-36 shrink-0" />
          <span className="self-center text-slate-400 text-sm">—</span>
          <Input type="date" value={dateTo} onChange={e => handleDateTo(e.target.value)}
            className="h-9 rounded-xl text-sm w-36 shrink-0" />
        </div>

        {/* Chips tipo */}
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "entrada", "venta", "servicio"] as const).map(t => {
            const active = type === t
            const label  = t === "all" ? "Todos" : TYPE_CONFIG[t].label + "s"
            return (
              <button key={t} onClick={() => handleType(t)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors border ${
                  active
                    ? t === "entrada"  ? "bg-green-600 text-white border-green-600"
                    : t === "venta"    ? "bg-blue-600 text-white border-blue-600"
                    : t === "servicio" ? "bg-amber-500 text-white border-amber-500"
                    : "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >{label}</button>
            )
          })}
        </div>
      </div>

      {/* ── Stats ── */}
      {loaded && movements.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-600" />
            <p className="text-lg font-bold text-green-700 leading-none">+{totalEntUnits}</p>
            <p className="text-xs text-green-500 mt-0.5">Uds. ingresadas</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-3 text-center">
            <p className="text-lg font-bold text-green-700 leading-none">
              {totalEntMonto > 0 ? `S/ ${totalEntMonto.toFixed(2)}` : "—"}
            </p>
            <p className="text-xs text-green-500 mt-0.5">Costo ingresos</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-center">
            <TrendingDown className="w-4 h-4 mx-auto mb-1 text-red-600" />
            <p className="text-lg font-bold text-red-700 leading-none">−{totalSalUnits}</p>
            <p className="text-xs text-red-500 mt-0.5">Uds. salidas</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-center">
            <p className="text-lg font-bold text-red-700 leading-none">S/ {totalSalMonto.toFixed(2)}</p>
            <p className="text-xs text-red-500 mt-0.5">Total facturado</p>
          </div>
        </div>
      )}

      {/* ── Loading inicial ── */}
      {isPending && !loaded && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
          <p className="text-sm text-slate-400">Cargando movimientos...</p>
        </div>
      )}

      {/* ── Sin resultados ── */}
      {loaded && movements.length === 0 && !isPending && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <Package className="w-7 h-7 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">Sin movimientos</p>
          <p className="text-sm text-slate-400 mt-1">Prueba cambiando los filtros o el rango de fechas</p>
        </div>
      )}

      {/* ── Tabla desktop / Cards mobile ── */}
      {loaded && movements.length > 0 && (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 w-[130px]">Fecha</th>
                  <th className="text-left px-3 py-3 w-[90px]">Tipo</th>
                  <th className="text-left px-3 py-3">Producto</th>
                  <th className="text-left px-3 py-3 w-[100px]">Referencia</th>
                  <th className="text-left px-3 py-3">Cliente / Motivo</th>
                  <th className="text-right px-3 py-3 w-[80px]">Cant.</th>
                  <th className="text-right px-4 py-3 w-[100px]">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movements.map(m => {
                  const cfg    = TYPE_CONFIG[m.type]
                  const Icon   = cfg.icon
                  const isEntry = m.type === "entrada"
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Fecha */}
                      <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(m.date)}
                      </td>
                      {/* Tipo badge */}
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.badge}`}>
                          <Icon className="w-3 h-3 shrink-0" />
                          {cfg.label}
                        </span>
                      </td>
                      {/* Producto */}
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-semibold text-slate-900 truncate max-w-[200px]">{m.productName}</p>
                      </td>
                      {/* Referencia */}
                      <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{m.reference}</td>
                      {/* Cliente / Motivo */}
                      <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[180px]">
                        <span className="truncate block">{m.client !== "—" ? m.client : m.detail}</span>
                        {m.client !== "—" && m.detail !== "Venta directa" && m.detail !== "—" && (
                          <span className="text-slate-400 truncate block">{m.detail}</span>
                        )}
                      </td>
                      {/* Cantidad */}
                      <td className="px-3 py-2.5 text-right">
                        <span className={`text-sm font-bold tabular-nums ${isEntry ? "text-green-600" : "text-red-500"}`}>
                          {isEntry ? "+" : "−"}{m.quantity}
                        </span>
                      </td>
                      {/* Subtotal */}
                      <td className="px-4 py-2.5 text-right text-sm font-semibold text-slate-700 tabular-nums">
                        {isEntry
                          ? (m.subtotal > 0 ? `S/ ${m.subtotal.toFixed(2)}` : <span className="text-slate-300">—</span>)
                          : `S/ ${m.subtotal.toFixed(2)}`
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Pie con totales */}
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr className="text-xs font-semibold text-slate-600">
                  <td colSpan={5} className="px-4 py-2 text-right">Totales del período:</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className="text-green-600">+{totalEntUnits}</span>
                    {totalSalUnits > 0 && <span className="text-red-500 ml-2">−{totalSalUnits}</span>}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                    S/ {totalSalMonto.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile — cards */}
          <div className="md:hidden space-y-2">
            {movements.map(m => {
              const cfg    = TYPE_CONFIG[m.type]
              const Icon   = cfg.icon
              const isEntry = m.type === "entrada"
              return (
                <div key={m.id} className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{m.productName}</p>
                        <p className="text-xs text-slate-500">{m.reference}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">{formatDate(m.date)}</p>
                  </div>
                  <div className="flex items-center justify-between pl-9 mt-1.5">
                    <p className="text-xs text-slate-600 truncate flex-1">{m.client !== "—" ? m.client : m.detail}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold ${isEntry ? "text-green-600" : "text-red-500"}`}>
                        {isEntry ? "+" : "−"}{m.quantity} uds
                      </span>
                      {m.subtotal > 0 && (
                        <span className="text-xs font-semibold text-slate-700">S/ {m.subtotal.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
