"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { getCompletedVehiclesForReport } from "@/lib/actions/vehicles"
import { BranchSelector } from "@/components/taller/branch-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Car, Wrench, Clock, User, Calendar, ChevronDown, ChevronUp, Search } from "lucide-react"
import type { Branch, Vehicle, Service, User as PrismaUser } from "@prisma/client"

type VehicleWithRelations = Vehicle & { branch: Branch; services: (Service & { mechanic: PrismaUser })[] }

interface ReportServicesClientProps {
  initialVehicles: VehicleWithRelations[]
  branches: Branch[]
}

export function ReportServicesClient({ initialVehicles, branches }: ReportServicesClientProps) {
  const [vehicles, setVehicles] = useState(initialVehicles)
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleFilter = async (branchId?: string | "all", from?: string, to?: string) => {
    setIsLoading(true)
    try {
      const bid = (branchId ?? selectedBranch) === "all" ? undefined : (branchId ?? selectedBranch)
      const fromVal = (from !== undefined ? from : dateFrom) || undefined
      const toVal = (to !== undefined ? to : dateTo) || undefined
      const updated = await getCompletedVehiclesForReport(bid, fromVal, toVal)
      setVehicles(updated as VehicleWithRelations[])
    } finally {
      setIsLoading(false)
    }
  }

  const handleBranchChange = (branchId: string | "all") => {
    setSelectedBranch(branchId)
    handleFilter(branchId)
  }

  const filteredVehicles = useMemo(() => {
    if (!searchQuery) return vehicles
    const q = searchQuery.toLowerCase()
    return vehicles.filter(v =>
      v.plate.toLowerCase().includes(q) ||
      v.clientName.toLowerCase().includes(q) ||
      v.clientDNI.includes(q) ||
      v.brand.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q)
    )
  }, [vehicles, searchQuery])

  const totalServices = useMemo(() => filteredVehicles.reduce((sum, v) => sum + v.services.length, 0), [filteredVehicles])

  const avgDuration = useMemo(() => {
    const durations = filteredVehicles
      .filter(v => v.exitTime)
      .map(v => new Date(v.exitTime!).getTime() - new Date(v.entryTime).getTime())
    if (durations.length === 0) return 0
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60000)
  }, [filteredVehicles])

  // Tabla resumen por mecánico
  const mechanicStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    filteredVehicles.forEach(v => {
      v.services.forEach(s => {
        const existing = map.get(s.mechanicId)
        if (existing) existing.count++
        else map.set(s.mechanicId, { name: s.mechanic.name, count: 1 })
      })
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [filteredVehicles])

  const formatTime = (date: Date | string) =>
    new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })
  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima" })
  const calculateDuration = (entry: Date | string, exit: Date | string | null) => {
    if (!exit) return "—"
    const mins = Math.floor((new Date(exit).getTime() - new Date(entry).getTime()) / 60000)
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

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
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Servicios Realizados</h1>
          <p className="text-sm text-slate-500">Historial completo de vehículos atendidos</p>
        </div>
      </div>

      <BranchSelector branches={branches} selected={selectedBranch} onChange={handleBranchChange} />

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Filtrar por fecha</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Desde</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Hasta</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-10 rounded-xl" />
          </div>
        </div>
        <Button onClick={() => handleFilter()} disabled={isLoading} className="w-full h-11 rounded-xl cursor-pointer font-semibold">
          {isLoading ? "Cargando..." : "Aplicar filtro"}
        </Button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por placa, cliente, DNI..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-10 pl-9 rounded-xl"
          />
        </div>
      </div>

      {/* Stats resumidas (sticky feel) */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-600 rounded-2xl p-3 text-white text-center">
          <Car className="w-5 h-5 mx-auto mb-1 opacity-80" />
          <p className="text-2xl font-bold leading-none">{filteredVehicles.length}</p>
          <p className="text-xs mt-1 opacity-80">Vehículos</p>
        </div>
        <div className="bg-green-600 rounded-2xl p-3 text-white text-center">
          <Wrench className="w-5 h-5 mx-auto mb-1 opacity-80" />
          <p className="text-2xl font-bold leading-none">{totalServices}</p>
          <p className="text-xs mt-1 opacity-80">Servicios</p>
        </div>
        <div className="bg-orange-500 rounded-2xl p-3 text-white text-center">
          <Clock className="w-5 h-5 mx-auto mb-1 opacity-80" />
          <p className="text-2xl font-bold leading-none">{avgDuration}m</p>
          <p className="text-xs mt-1 opacity-80">Promedio</p>
        </div>
      </div>

      {/* Resumen por mecánico */}
      {mechanicStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-700">Servicios por mecánico</p>
          </div>
          <div className="divide-y divide-slate-100">
            {mechanicStats.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-600"}`}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-800">{m.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-blue-200 rounded-full overflow-hidden w-16 md:w-24 flex-shrink-0">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${(m.count / (mechanicStats[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-900 w-6 text-right tabular-nums">{m.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de vehículos */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
          <Car className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-600">Sin resultados</p>
          <p className="text-sm text-slate-400 mt-1">Ajusta los filtros para ver más vehículos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVehicles.map(vehicle => {
            const isExpanded = expandedId === vehicle.id
            return (
              <div key={vehicle.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Header de la card */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : vehicle.id)}
                  className="w-full px-4 py-4 text-left cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900">{vehicle.brand} {vehicle.model}</h3>
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600">{vehicle.plate}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <User className="w-3 h-3" />{vehicle.clientName}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {vehicle.exitTime ? formatDate(vehicle.exitTime) : "—"}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {calculateDuration(vehicle.entryTime, vehicle.exitTime)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded-lg">
                        {vehicle.services.length} svc
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                </button>

                {/* Servicios expandidos */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-white rounded-xl p-2.5">
                        <p className="text-slate-400 mb-0.5">Sede</p>
                        <p className="font-semibold text-slate-800">{vehicle.branch.name}</p>
                      </div>
                      <div className="bg-white rounded-xl p-2.5">
                        <p className="text-slate-400 mb-0.5">DNI cliente</p>
                        <p className="font-semibold text-slate-800">{vehicle.clientDNI}</p>
                      </div>
                      <div className="bg-white rounded-xl p-2.5">
                        <p className="text-slate-400 mb-0.5">Entrada</p>
                        <p className="font-semibold text-slate-800">{formatDate(vehicle.entryTime)} {formatTime(vehicle.entryTime)}</p>
                      </div>
                      <div className="bg-white rounded-xl p-2.5">
                        <p className="text-slate-400 mb-0.5">Salida</p>
                        <p className="font-semibold text-slate-800">
                          {vehicle.exitTime ? `${formatDate(vehicle.exitTime)} ${formatTime(vehicle.exitTime)}` : "—"}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Servicios realizados</p>
                    {vehicle.services.map(service => (
                      <div key={service.id} className="bg-white rounded-xl p-3 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{service.serviceType}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{service.mechanic.name}</p>
                        </div>
                        {service.price != null && (
                          <span className="text-sm font-bold text-green-600 shrink-0">
                            S/ {service.price.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
