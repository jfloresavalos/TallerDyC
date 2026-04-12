"use client"

import { useState } from "react"
import Link from "next/link"
import { getVehicleHistoryByPlate } from "@/lib/actions/vehicles"
import { ArrowLeft, Search, Car, Clock, Wrench, Package, User, CheckCircle, DollarSign } from "lucide-react"

type VehicleHistory = Awaited<ReturnType<typeof getVehicleHistoryByPlate>>
type VehicleEntry  = VehicleHistory[0]

function fmt(n: number | null | undefined) { return n ? `S/ ${n.toFixed(2)}` : "—" }

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" })
}

function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })
}

function diffMinutes(a: Date | string | null, b: Date | string | null): string {
  if (!a || !b) return "—"
  const mins = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

const VISIT_BADGE: Record<string, { label: string; cls: string }> = {
  general:  { label: "General",   cls: "bg-blue-100 text-blue-700" },
  garantia: { label: "Garantía",  cls: "bg-red-100 text-red-700" },
  revision: { label: "Revisión",  cls: "bg-teal-100 text-teal-700" },
  venta:    { label: "Solo Venta",cls: "bg-purple-100 text-purple-700" },
}

function VehicleCard({ v }: { v: VehicleEntry }) {
  const badge = VISIT_BADGE[v.visitType ?? "general"] ?? VISIT_BADGE.general
  const totalServices = v.services.length
  const allItems = v.services.flatMap(s => s.items)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Encabezado de visita */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
              <span className="text-xs text-slate-500">{fmtDate(v.entryTime)}</span>
            </div>
            <p className="font-semibold text-slate-900 mt-1">{v.clientName}</p>
            {v.clientPhone && <p className="text-xs text-slate-500">{v.clientPhone} · DNI {v.clientDNI}</p>}
          </div>
          {v.totalAmount != null && (
            <div className="text-right shrink-0">
              <p className="text-lg font-black tabular-nums text-slate-900">{fmt(v.totalAmount)}</p>
              {v.paymentMethod1 && <p className="text-xs text-slate-400">{v.paymentMethod1}{v.paymentMethod2 ? ` + ${v.paymentMethod2}` : ""}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Línea de tiempo */}
      <div className="px-4 py-3 space-y-2">
        {/* Entrada */}
        <div className="flex items-center gap-3 text-sm">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Car className="w-3 h-3 text-blue-600" />
          </div>
          <div className="flex-1">
            <span className="text-slate-700 font-medium">Ingresó</span>
            <span className="text-slate-400 ml-2 text-xs">{fmtDateTime(v.entryTime)}</span>
          </div>
        </div>

        {/* Servicios */}
        {v.services.map((svc, i) => (
          <div key={svc.id}>
            {/* Mecánico tomó */}
            {svc.mechanic && (
              <div className="flex items-center gap-3 text-sm ml-3">
                <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <User className="w-3 h-3 text-violet-600" />
                </div>
                <div className="flex-1">
                  <span className="text-slate-700">{svc.mechanic.name} tomó</span>
                  <span className="text-xs text-slate-400 ml-1">({svc.serviceType})</span>
                  {svc.startTime && <span className="text-slate-400 ml-2 text-xs">{fmtDateTime(svc.startTime)}</span>}
                </div>
              </div>
            )}
            {/* Repuestos usados */}
            {svc.items.length > 0 && (
              <div className="flex items-start gap-3 text-sm ml-3 mt-1">
                <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Package className="w-3 h-3 text-amber-600" />
                </div>
                <div className="flex-1">
                  {svc.items.map((item, j) => (
                    <span key={j} className="text-slate-600 text-xs">
                      {item.product.name} × {item.quantity}{j < svc.items.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Servicio completado */}
            {svc.completionTime && (
              <div className="flex items-center gap-3 text-sm ml-3 mt-1">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                </div>
                <div className="flex-1">
                  <span className="text-slate-700">Completado</span>
                  <span className="text-slate-400 ml-2 text-xs">{fmtDateTime(svc.completionTime)}</span>
                  {svc.startTime && (
                    <span className="text-slate-400 ml-2 text-xs">· {diffMinutes(svc.startTime, svc.completionTime)}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Salida */}
        {v.exitTime && (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
              <DollarSign className="w-3 h-3 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-slate-700 font-medium">Cobrado y salió</span>
              <span className="text-slate-400 ml-2 text-xs">{fmtDateTime(v.exitTime)}</span>
              <span className="text-slate-400 ml-2 text-xs">· Total: {diffMinutes(v.entryTime, v.exitTime)}</span>
            </div>
          </div>
        )}
        {!v.exitTime && (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <Clock className="w-3 h-3 text-orange-600" />
            </div>
            <span className="text-slate-500 italic text-sm">En proceso actualmente</span>
          </div>
        )}
      </div>

      {/* Footer stats */}
      {(totalServices > 0 || allItems.length > 0) && (
        <div className="px-4 pb-3 flex gap-4 text-xs text-slate-500">
          {totalServices > 0 && (
            <span className="flex items-center gap-1">
              <Wrench className="w-3 h-3" /> {totalServices} servicio{totalServices !== 1 ? "s" : ""}
            </span>
          )}
          {allItems.length > 0 && (
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" /> {allItems.length} repuesto{allItems.length !== 1 ? "s" : ""}
            </span>
          )}
          {v.branch && <span>{v.branch.name}</span>}
        </div>
      )}
    </div>
  )
}

interface Props {
  initialPlate?: string
  initialHistory?: VehicleHistory
}

export function ReportPlacaClient({ initialPlate = "", initialHistory = [] }: Props) {
  const [plate, setPlate]     = useState(initialPlate)
  const [history, setHistory] = useState<VehicleHistory>(initialHistory)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(!!initialPlate)

  const handleSearch = async () => {
    if (!plate.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const data = await getVehicleHistoryByPlate(plate.trim())
      setHistory(data as VehicleHistory)
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-xl font-bold text-slate-900">Historial por Placa</h1>
          <p className="text-sm text-slate-500">Todas las visitas de un vehículo</p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={plate}
            onChange={e => setPlate(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Ej: TOY-001"
            className="flex-1 h-11 rounded-xl border border-slate-200 px-3 text-sm font-mono uppercase"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !plate.trim()}
            className="h-11 px-4 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {searched && !loading && (
        <>
          {history.length > 0 ? (
            <>
              {/* Resumen */}
              <div className="bg-slate-900 rounded-2xl p-4 text-white">
                <div className="flex items-center gap-3">
                  <Car className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-bold text-lg">{plate.toUpperCase()}</p>
                    <p className="text-slate-400 text-sm">{history[0]?.brand} {history[0]?.model}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-2xl font-black tabular-nums">
                      {history.length}
                    </p>
                    <p className="text-slate-400 text-xs">visita{history.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>

              {/* Historial de visitas */}
              <div className="space-y-3">
                {history.map((v, i) => (
                  <div key={v.id}>
                    <p className="text-xs text-slate-400 font-medium px-1 mb-1">
                      Visita {history.length - i} · {fmtDate(v.entryTime)}
                    </p>
                    <VehicleCard v={v} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <Car className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-500">Sin resultados para "{plate}"</p>
              <p className="text-sm text-slate-400 mt-1">Verifica que la placa sea correcta</p>
            </div>
          )}
        </>
      )}

      {/* Estado inicial */}
      {!searched && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-500">Busca una placa para ver su historial</p>
          <p className="text-sm text-slate-400 mt-1">Ingresa la placa y presiona buscar</p>
        </div>
      )}
    </div>
  )
}
