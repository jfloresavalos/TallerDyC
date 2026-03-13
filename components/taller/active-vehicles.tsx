"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getActiveVehicles, hasServices } from "@/lib/actions/vehicles"
import { CheckoutDialog } from "@/components/taller/checkout-dialog"
import { reassignMechanic } from "@/lib/actions/services"
import { getMechanicsByBranch } from "@/lib/actions/users"
import { BranchSelector } from "@/components/taller/branch-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Car, Phone, Clock, User, LogOut, Wrench, CheckCircle, AlertCircle,
  RefreshCw, UserCheck, Search, X, Shield, CalendarClock, ShoppingBag
} from "lucide-react"
import React from "react"
import type { Branch, Vehicle, Service, User as PrismaUser } from "@prisma/client"

type ServiceType = { id: string; name: string; price: number | null; color: string }

type ServiceWithMechanic = Service & {
  mechanic: { id: string; name: string } | null
  coMechanic: { id: string; name: string } | null
  mechanicId: string | null
  coMechanicId: string | null
}
type VehicleWithServices = Vehicle & {
  branch: { id: string; name: string }
  services: ServiceWithMechanic[]
  isConverted: boolean
  visitType?: string
}

interface ActiveVehiclesClientProps {
  initialVehicles: VehicleWithServices[]
  branches: Branch[]
  initialServiceTypes: ServiceType[]
}

function getVehicleStatus(vehicle: VehicleWithServices) {
  if (vehicle.visitType === "venta") {
    if (vehicle.services.length === 0) return "sale"
    const allDone = vehicle.services.every(s => s.status === "COMPLETED")
    return allDone ? "completed" : "active"
  }
  if (vehicle.services.length === 0) return "unassigned"
  const hasUnassigned = vehicle.services.some(s => s.status !== "COMPLETED" && !s.mechanicId)
  if (hasUnassigned) return "unassigned"
  const allDone = vehicle.services.every(s => s.status === "COMPLETED")
  return allDone ? "completed" : "active"
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  unassigned: { bg: "bg-orange-100", text: "text-orange-700", label: "Sin asignar",     icon: <AlertCircle className="w-3 h-3" /> },
  active:     { bg: "bg-blue-100",   text: "text-blue-700",   label: "En servicio",      icon: <Wrench className="w-3 h-3" /> },
  completed:  { bg: "bg-green-100",  text: "text-green-700",  label: "Listo",            icon: <CheckCircle className="w-3 h-3" /> },
  sale:       { bg: "bg-blue-100",   text: "text-blue-700",   label: "Solo venta",       icon: <ShoppingBag className="w-3 h-3" /> },
}

type StatusFilter = "all" | "unassigned" | "active" | "completed"
type VisitTypeFilter = "all" | "general" | "garantia" | "revision" | "venta"

const VISIT_TYPE_CONFIG: Record<string, { label: string; color: string; textColor: string; bgColor: string; icon: React.ReactNode }> = {
  general:  { label: "General",        color: "#16a34a", textColor: "text-green-700", bgColor: "bg-green-50",  icon: <Car className="w-3.5 h-3.5" /> },
  garantia: { label: "Garantía",       color: "#dc2626", textColor: "text-red-700",   bgColor: "bg-red-50",    icon: <Shield className="w-3.5 h-3.5" /> },
  revision: { label: "Revisión anual", color: "#0d9488", textColor: "text-teal-700",  bgColor: "bg-teal-50",   icon: <CalendarClock className="w-3.5 h-3.5" /> },
  venta:    { label: "Solo venta",     color: "#2563eb", textColor: "text-blue-700",  bgColor: "bg-blue-50",   icon: <ShoppingBag className="w-3.5 h-3.5" /> },
}

export function ActiveVehiclesClient({ initialVehicles, branches, initialServiceTypes }: ActiveVehiclesClientProps) {
  const [vehicles, setVehicles] = useState(initialVehicles)
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all")
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [visitTypeFilter, setVisitTypeFilter] = useState<VisitTypeFilter>("all")
  const router = useRouter()

  // Detail dialog
  const [detailVehicle, setDetailVehicle] = useState<VehicleWithServices | null>(null)

  // Checkout dialog (reemplaza exit dialog)
  const [checkoutVehicleId, setCheckoutVehicleId] = useState<string | null>(null)
  const [checkoutVehicleLabel, setCheckoutVehicleLabel] = useState("")

  // Reassign dialog
  const [reassignService, setReassignService] = useState<ServiceWithMechanic | null>(null)
  const [reassignMechanicId, setReassignMechanicId] = useState("")
  const [reassignLoading, setReassignLoading] = useState(false)
  const [reassignMechanics, setReassignMechanics] = useState<PrismaUser[]>([])

  const loadVehicles = async (branchId?: string | "all") => {
    setIsLoading(true)
    try {
      const updated = await getActiveVehicles(branchId === "all" ? undefined : branchId) as VehicleWithServices[]
      setVehicles(updated)
      // Update detail if open
      if (detailVehicle) {
        const fresh = updated.find(v => v.id === detailVehicle.id)
        if (fresh) setDetailVehicle(fresh)
      }
    } finally { setIsLoading(false) }
  }

  const handleBranchChange = async (branchId: string | "all") => {
    setSelectedBranch(branchId)
    await loadVehicles(branchId)
  }

  const handleOpenReassign = async (service: ServiceWithMechanic, branchId: string) => {
    setReassignService(service)
    setReassignMechanicId(service.mechanicId ?? "")
    const mechs = await getMechanicsByBranch(branchId) as PrismaUser[]
    setReassignMechanics(mechs)
  }

  const handleConfirmReassign = async () => {
    if (!reassignService || !reassignMechanicId) return
    setReassignLoading(true)
    try {
      await reassignMechanic(reassignService.id, reassignMechanicId)
      toast.success("Mecánico reasignado")
      setReassignService(null)
      await loadVehicles(selectedBranch)
      router.refresh()
    } catch {
      toast.error("Error al reasignar mecánico")
    } finally { setReassignLoading(false) }
  }

  const handleOpenCheckout = async (vehicle: VehicleWithServices) => {
    if (vehicle.visitType !== "venta") {
      const ok = await hasServices(vehicle.id)
      if (!ok) { toast.error("El vehículo no tiene servicios registrados"); return }
      const allDone = vehicle.services.every(s => s.status === "COMPLETED")
      if (!allDone) { toast.error("Todos los servicios deben estar completados"); return }
    }
    setDetailVehicle(null)
    setCheckoutVehicleLabel(`${vehicle.brand} ${vehicle.model} — ${vehicle.plate}`)
    setCheckoutVehicleId(vehicle.id)
  }

  const formatTime = (date: Date | string) =>
    new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })
  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("es-PE", { day: "2-digit", month: "short", timeZone: "America/Lima" })

  const stats = {
    total:      vehicles.length,
    unassigned: vehicles.filter(v => getVehicleStatus(v) === "unassigned").length,
    active:     vehicles.filter(v => getVehicleStatus(v) === "active").length,
    completed:  vehicles.filter(v => getVehicleStatus(v) === "completed").length,
  }

  const visitTypeCounts = {
    general:  vehicles.filter(v => (v.visitType ?? "general") === "general").length,
    garantia: vehicles.filter(v => v.visitType === "garantia").length,
    revision: vehicles.filter(v => v.visitType === "revision").length,
    venta:    vehicles.filter(v => v.visitType === "venta").length,
  }

  const filteredVehicles = vehicles.filter(v => {
    if (statusFilter !== "all" && getVehicleStatus(v) !== statusFilter) return false
    if (visitTypeFilter !== "all" && (v.visitType ?? "general") !== visitTypeFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        v.plate.toLowerCase().includes(q) ||
        v.clientName.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q)
      )
    }
    return true
  })

  const sortedVehicles = [...filteredVehicles].sort((a, b) => (a.arrivalOrder ?? 0) - (b.arrivalOrder ?? 0))

  const VISIT_ORDER = ["general", "garantia", "revision", "venta"]
  const grouped = VISIT_ORDER.map(type => ({
    type,
    vehicles: sortedVehicles.filter(v => (v.visitType ?? "general") === type),
  })).filter(g => g.vehicles.length > 0)

  // Índice de orden dentro de cada tipo (independiente por tipo)
  // venta no tiene índice
  const typeOrderIndex = new Map<string, number>()
  for (const type of ["general", "garantia", "revision"]) {
    let idx = 1
    for (const v of sortedVehicles) {
      if ((v.visitType ?? "general") === type) {
        typeOrderIndex.set(v.id, idx++)
      }
    }
  }

  // ── Card ultra-compacta (clic → dialog) ─────────────────────────────────
  const renderCard = (vehicle: VehicleWithServices) => {
    const status = getVehicleStatus(vehicle)
    const sc = STATUS_CONFIG[status]
    const vtConfig = VISIT_TYPE_CONFIG[vehicle.visitType ?? "general"] ?? VISIT_TYPE_CONFIG.general
    const borderColor = vtConfig.color

    return (
      <button
        key={vehicle.id}
        type="button"
        onClick={() => setDetailVehicle(vehicle)}
        className="w-full text-left bg-white rounded-xl border-l-4 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer px-3 py-2 flex items-center gap-2.5"
        style={{ borderLeftColor: borderColor }}
      >
        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
          style={{ backgroundColor: borderColor }}
        >
          {vehicle.visitType === "venta"
            ? <ShoppingBag className="w-3 h-3" />
            : `#${typeOrderIndex.get(vehicle.id) ?? vehicle.arrivalOrder}`}
        </div>

        {/* Info mínima */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-bold text-slate-700 shrink-0">{vehicle.plate}</span>
            <span className="text-xs font-medium text-slate-600 truncate">
              {vehicle.brand !== "-" ? `${vehicle.brand} ${vehicle.model}` : vehicle.clientName}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-px">
            {vehicle.brand !== "-" ? vehicle.clientName : ""}
            {vehicle.brand !== "-" && " · "}
            {formatTime(vehicle.entryTime)}
          </p>
        </div>

        {/* Badge estado — solo ícono */}
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${sc.bg} ${sc.text}`}>
          {sc.icon}
        </span>
      </button>
    )
  }

  // ── Detail vehicle data (refreshed copy) ─────────────────────────────────
  const dv = detailVehicle
  const dvStatus = dv ? getVehicleStatus(dv) : null
  const dvSC = dvStatus ? STATUS_CONFIG[dvStatus] : null
  const dvVtConfig = dv ? (VISIT_TYPE_CONFIG[dv.visitType ?? "general"] ?? VISIT_TYPE_CONFIG.general) : null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <BranchSelector branches={branches} selected={selectedBranch} onChange={handleBranchChange} />
        <button
          onClick={() => loadVehicles(selectedBranch)}
          disabled={isLoading}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors shrink-0"
          aria-label="Actualizar"
        >
          <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats — filtro de estado */}
      <div className="grid grid-cols-4 gap-1.5">
        {([
          { key: "all",        label: "Total",       value: stats.total,      active: "bg-slate-800 text-white",  inactive: "bg-slate-100 text-slate-700" },
          { key: "unassigned", label: "Sin asignar", value: stats.unassigned, active: "bg-orange-500 text-white", inactive: "bg-orange-50 text-orange-700" },
          { key: "active",     label: "En trabajo",  value: stats.active,     active: "bg-blue-600 text-white",   inactive: "bg-blue-50 text-blue-700" },
          { key: "completed",  label: "Listos",      value: stats.completed,  active: "bg-green-600 text-white",  inactive: "bg-green-50 text-green-700" },
        ] as const).map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(statusFilter === s.key ? "all" : s.key)}
            className={`rounded-xl p-2 text-center cursor-pointer transition-all ${statusFilter === s.key ? s.active : s.inactive} hover:opacity-80`}
          >
            <p className="text-xl font-black leading-none tabular-nums">{s.value}</p>
            <p className="text-[9px] font-semibold mt-0.5 leading-tight">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filtro por tipo de visita */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setVisitTypeFilter("all")}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${visitTypeFilter === "all" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
        >
          Todos ({stats.total})
        </button>
        {(["general", "garantia", "revision", "venta"] as const).map(type => {
          const cfg = VISIT_TYPE_CONFIG[type]
          const count = visitTypeCounts[type]
          if (count === 0) return null
          const isActive = visitTypeFilter === type
          return (
            <button
              key={type}
              onClick={() => setVisitTypeFilter(visitTypeFilter === type ? "all" : type)}
              className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${isActive ? "text-white border-transparent" : "bg-white border-slate-200 hover:border-slate-300"}`}
              style={isActive ? { backgroundColor: cfg.color } : { color: cfg.color }}
            >
              {cfg.icon}{cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Placa, cliente, marca..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-400 transition-colors"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600" aria-label="Limpiar">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Contador */}
      {(searchQuery || statusFilter !== "all" || visitTypeFilter !== "all") && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{sortedVehicles.length} vehículo{sortedVehicles.length !== 1 ? "s" : ""}</p>
          <button onClick={() => { setSearchQuery(""); setStatusFilter("all"); setVisitTypeFilter("all") }} className="text-xs text-blue-600 cursor-pointer font-medium">
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Cards */}
      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <Car className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">El taller está vacío</h3>
          <p className="text-sm text-slate-500">No hay vehículos activos</p>
        </div>
      ) : sortedVehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Sin resultados</h3>
          <p className="text-sm text-slate-400">Intenta con otro término</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visitTypeFilter !== "all"
            ? (
              <div className="grid grid-cols-2 gap-1.5">
                {sortedVehicles.map(v => renderCard(v))}
              </div>
            )
            : grouped.map(group => {
              const cfg = VISIT_TYPE_CONFIG[group.type]
              return (
                <div key={group.type}>
                  <div
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 mb-1.5 border"
                    style={{ backgroundColor: `${cfg.color}10`, borderColor: `${cfg.color}25` }}
                  >
                    <span style={{ color: cfg.color }} className="shrink-0">{cfg.icon}</span>
                    <p className="text-xs font-bold" style={{ color: cfg.color }}>
                      {cfg.label} <span className="font-normal opacity-60">({group.vehicles.length})</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.vehicles.map(v => renderCard(v))}
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {/* ── Dialog: Detalle del vehículo ── */}
      <Dialog open={!!dv} onOpenChange={o => !o && setDetailVehicle(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
          {dv && dvSC && dvVtConfig && (
            <>
              {/* Header compacto */}
              <div className="px-4 pt-4 pb-3 shrink-0" style={{ backgroundColor: `${dvVtConfig.color}12` }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: dvVtConfig.color }}>
                      {dv.visitType === "venta" ? <ShoppingBag className="w-4 h-4" /> : `#${typeOrderIndex.get(dv.id) ?? dv.arrivalOrder}`}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-800">{dv.plate}</span>
                        <span className="text-xs font-medium text-slate-600 truncate">
                          {dv.brand !== "-" ? `${dv.brand} ${dv.model}` : "Sin vehículo"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${dvSC.bg} ${dvSC.text}`}>
                    {dvSC.icon} {dvSC.label}
                  </span>
                </div>
              </div>

              {/* Cuerpo scrolleable */}
              <div className="px-4 pb-4 space-y-2.5 mt-2 overflow-y-auto flex-1">
                {/* Cliente + teléfono */}
                <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{dv.clientName}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDate(dv.entryTime)} {formatTime(dv.entryTime)}
                      </p>
                    </div>
                  </div>
                  {dv.clientPhone && (
                    <a href={`tel:${dv.clientPhone}`}
                      className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg shrink-0 font-medium"
                    >
                      <Phone className="w-3 h-3" />{dv.clientPhone}
                    </a>
                  )}
                </div>

                {/* Servicios */}
                {dv.services.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Servicios</p>
                    {dv.services.map(service => (
                      <div key={service.id} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${service.status === "COMPLETED" ? "bg-green-500" : "bg-blue-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{service.serviceType}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {service.mechanic?.name ?? "Sin asignar"}
                            {service.coMechanic && ` + ${service.coMechanic.name}`}
                          </p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${service.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                          {service.status === "COMPLETED" ? "Listo" : "En proceso"}
                        </span>
                        {service.status !== "COMPLETED" && (
                          <button
                            onClick={() => handleOpenReassign(service, dv.branchId)}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors shrink-0"
                            aria-label="Reasignar mecánico"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : dv.visitType !== "venta" ? (
                  <p className="text-center py-2 text-xs text-slate-400">Sin servicios asignados</p>
                ) : null}

                {/* Botón salida */}
                {(dvStatus === "completed" || dvStatus === "sale") && (
                  <Button
                    onClick={() => handleOpenCheckout(dv)}
                    className="w-full h-10 rounded-xl bg-green-600 hover:bg-green-700 cursor-pointer font-semibold text-white text-sm"
                  >
                    <LogOut className="w-4 h-4 mr-1.5" />Registrar Salida
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Reasignar mecánico ── */}
      <Dialog open={!!reassignService} onOpenChange={o => !o && setReassignService(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reasignar Mecánico</DialogTitle>
            <DialogDescription>{reassignService?.serviceType}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="text-slate-500 text-xs">Mecánico actual</p>
              <p className="font-semibold text-slate-800">{reassignService?.mechanic?.name ?? "Sin asignar"}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Nuevo mecánico</label>
              <Select value={reassignMechanicId} onValueChange={setReassignMechanicId}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200">
                  <SelectValue placeholder="Selecciona un mecánico" />
                </SelectTrigger>
                <SelectContent>
                  {reassignMechanics.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => setReassignService(null)}
                className="flex-1 h-11 rounded-xl cursor-pointer" disabled={reassignLoading}>Cancelar</Button>
              <Button onClick={handleConfirmReassign}
                className="flex-[2] h-11 font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer"
                disabled={reassignLoading || !reassignMechanicId || reassignMechanicId === reassignService?.mechanicId}>
                {reassignLoading ? "Guardando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Cobro y Salida ── */}
      <CheckoutDialog
        vehicleId={checkoutVehicleId}
        vehicleLabel={checkoutVehicleLabel}
        onClose={() => setCheckoutVehicleId(null)}
        onSuccess={async () => {
          setCheckoutVehicleId(null)
          await loadVehicles(selectedBranch)
          router.refresh()
        }}
      />
    </div>
  )
}
