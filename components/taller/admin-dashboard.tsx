"use client"

import { useState } from "react"
import { getDashboardStats } from "@/lib/actions/vehicles"
import { BranchSelector } from "@/components/taller/branch-selector"
import { Car, CheckCircle, DollarSign, AlertCircle, TrendingUp, ArrowRight, Wrench, Plus } from "lucide-react"
import Link from "next/link"
import type { Branch } from "@prisma/client"

interface DashboardStats {
  activeVehicles: number
  completedToday: number
  totalIncome: number
  pendingVehicles: number
}

interface AdminDashboardClientProps {
  initialStats: DashboardStats
  branches: Branch[]
}

export function AdminDashboardClient({ initialStats, branches }: AdminDashboardClientProps) {
  const [stats, setStats] = useState(initialStats)
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all")
  const [isLoading, setIsLoading] = useState(false)

  const now = new Date()
  const timeLabel = now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })
  const dateLabel = now.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Lima" })

  const handleBranchChange = async (branchId: string | "all") => {
    setSelectedBranch(branchId)
    setIsLoading(true)
    try {
      const newStats = await getDashboardStats(branchId === "all" ? undefined : branchId)
      setStats(newStats)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">
            Panel de Control
          </h1>
          <p className="text-sm text-slate-400 capitalize mt-0.5">{dateLabel} · {timeLabel}</p>
        </div>
        <BranchSelector branches={branches} selected={selectedBranch} onChange={handleBranchChange} />
      </div>

      {/* ── KPI Cards 2×2 ── */}
      <div className={`grid grid-cols-2 gap-3 transition-opacity duration-200 ${isLoading ? "opacity-40 pointer-events-none" : ""}`}>

        {/* Autos activos */}
        <Link href="/taller" className="block group">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-blue-200 hover:shadow-md transition-all duration-200 cursor-pointer h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">VIVO</span>
            </div>
            <p className="text-4xl font-black text-slate-900 leading-none tabular-nums">{stats.activeVehicles}</p>
            <p className="text-sm font-medium text-slate-600 mt-1.5">Autos activos</p>
            <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1 group-hover:gap-1.5 transition-all">
              Ver taller <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </Link>

        {/* Completados hoy */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center shadow-sm">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">HOY</span>
          </div>
          <p className="text-4xl font-black text-slate-900 leading-none tabular-nums">{stats.completedToday}</p>
          <p className="text-sm font-medium text-slate-600 mt-1.5">Completados</p>
          <p className="text-xs text-green-500 mt-0.5">Entregados hoy</p>
        </div>

        {/* Ingresos del día */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-sm">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">HOY</span>
          </div>
          <p className="text-2xl font-black text-slate-900 leading-none tabular-nums">S/ {stats.totalIncome.toFixed(0)}</p>
          <p className="text-sm font-medium text-slate-600 mt-1.5">Ingresos</p>
          <p className="text-xs text-purple-500 mt-0.5">Cobrado al día</p>
        </div>

        {/* Sin asignar */}
        <Link href="/taller" className="block group">
          <div className={`rounded-2xl border p-4 hover:shadow-md transition-all duration-200 cursor-pointer h-full ${stats.pendingVehicles > 0 ? "bg-orange-50 border-orange-200 hover:border-orange-300" : "bg-white border-slate-200 hover:border-slate-300"}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${stats.pendingVehicles > 0 ? "bg-orange-500" : "bg-slate-400"}`}>
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stats.pendingVehicles > 0 ? "text-orange-600 bg-orange-100" : "text-slate-500 bg-slate-100"}`}>
                {stats.pendingVehicles > 0 ? "ATENCIÓN" : "OK"}
              </span>
            </div>
            <p className="text-4xl font-black text-slate-900 leading-none tabular-nums">{stats.pendingVehicles}</p>
            <p className="text-sm font-medium text-slate-600 mt-1.5">Sin asignar</p>
            <p className={`text-xs mt-0.5 flex items-center gap-1 group-hover:gap-1.5 transition-all ${stats.pendingVehicles > 0 ? "text-orange-500" : "text-slate-400"}`}>
              Ver taller <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </Link>
      </div>

      {/* ── Acciones rápidas ── */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
          Acciones rápidas
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <Link href="/taller/registrar" className="block">
            <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-colors duration-150 min-h-[64px] group">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
                <Plus className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight">Registrar Auto</p>
                <p className="text-xs text-slate-400 mt-0.5">Nuevo ingreso</p>
              </div>
            </div>
          </Link>
          <Link href="/taller" className="block">
            <div className="bg-blue-600 text-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-blue-700 transition-colors duration-150 min-h-[64px] group">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                <Wrench className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight">Ver Taller</p>
                <p className="text-xs text-blue-200 mt-0.5">Autos activos</p>
              </div>
            </div>
          </Link>
          <Link href="/ventas" className="block">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-green-200 hover:shadow-sm transition-all duration-150 min-h-[64px] group">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <DollarSign className="w-[18px] h-[18px] text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-800 leading-tight">Nueva Venta</p>
                <p className="text-xs text-slate-400 mt-0.5">Mostrador</p>
              </div>
            </div>
          </Link>
          <Link href="/reportes" className="block">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-purple-200 hover:shadow-sm transition-all duration-150 min-h-[64px] group">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-[18px] h-[18px] text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-800 leading-tight">Reportes</p>
                <p className="text-xs text-slate-400 mt-0.5">Ingresos · Servicios</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

    </div>
  )
}
