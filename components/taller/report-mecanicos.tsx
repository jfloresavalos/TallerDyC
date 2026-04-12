"use client"

import { useState } from "react"
import Link from "next/link"
import { getMechanicProductivityReport } from "@/lib/actions/vehicles"
import { BranchSelector } from "@/components/taller/branch-selector"
import { ArrowLeft, Wrench, Clock, DollarSign, Trophy, User } from "lucide-react"
import type { Branch } from "@prisma/client"

type MechanicReport = Awaited<ReturnType<typeof getMechanicProductivityReport>>

interface Props {
  initialReport: MechanicReport
  branches: Branch[]
}

function fmt(n: number) { return `S/ ${n.toFixed(0)}` }

function fmtMins(mins: number) {
  if (mins === 0) return "—"
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

const PERIODS = [
  { label: "Hoy",    days: 0 },
  { label: "7 días", days: 7 },
  { label: "15 días",days: 15 },
  { label: "30 días",days: 30 },
]

function getPeriodDates(days: number): { from: string; to: string } {
  const to = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })
  if (days === 0) return { from: to, to }
  const from = new Date()
  from.setDate(from.getDate() - days)
  return { from: from.toLocaleDateString("en-CA", { timeZone: "America/Lima" }), to }
}

const MEDAL = ["🥇", "🥈", "🥉"]

export function ReportMecanicosClient({ initialReport, branches }: Props) {
  const [report, setReport]       = useState(initialReport)
  const [branch, setBranch]       = useState<string | "all">("all")
  const [dateFrom, setDateFrom]   = useState("")
  const [dateTo, setDateTo]       = useState("")
  const [activePeriod, setActivePeriod] = useState<number | null>(null)
  const [loading, setLoading]     = useState(false)
  const [expanded, setExpanded]   = useState<string | null>(null)

  const handleFilter = async (opts?: { branch?: string | "all"; from?: string; to?: string }) => {
    setLoading(true)
    try {
      const b = (opts?.branch ?? branch) === "all" ? undefined : (opts?.branch ?? branch)
      const r = await getMechanicProductivityReport(b, (opts?.from ?? dateFrom) || undefined, (opts?.to ?? dateTo) || undefined)
      setReport(r as MechanicReport)
    } finally {
      setLoading(false)
    }
  }

  const applyPeriod = (days: number, idx: number) => {
    setActivePeriod(idx)
    const { from, to } = getPeriodDates(days)
    setDateFrom(from)
    setDateTo(to)
    handleFilter({ from, to })
  }

  const maxCount = Math.max(...report.mechanics.map(m => m.count), 1)

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
          <h1 className="text-xl font-bold text-slate-900">Productividad</h1>
          <p className="text-sm text-slate-500">Rendimiento de mecánicos por período</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <BranchSelector branches={branches} selected={branch} onChange={b => { setBranch(b); handleFilter({ branch: b }) }} />

        {/* Períodos rápidos */}
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => applyPeriod(p.days, i)}
              className={`h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                activePeriod === i ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Rango manual */}
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setActivePeriod(null) }}
            className="flex-1 h-10 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <span className="text-slate-400 text-sm">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setActivePeriod(null) }}
            className="flex-1 h-10 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <button
            onClick={() => handleFilter()}
            disabled={loading}
            className="h-10 px-4 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {loading ? "…" : "Ver"}
          </button>
        </div>
      </div>

      {/* Resumen global */}
      {report.mechanics.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 rounded-2xl p-4 text-white">
            <p className="text-2xl font-black tabular-nums">{report.total}</p>
            <p className="text-slate-400 text-xs mt-0.5">Servicios</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-2xl font-black tabular-nums text-slate-900">{report.mechanics.length}</p>
            <p className="text-slate-500 text-xs mt-0.5">Mecánicos</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-2xl font-black tabular-nums text-slate-900">
              {report.mechanics[0] ? fmtMins(report.mechanics[0].avgMinutes) : "—"}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">Mejor prom.</p>
          </div>
        </div>
      )}

      {/* Ranking de mecánicos */}
      {report.mechanics.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700 px-1">Ranking</p>
          {report.mechanics.map((m, i) => {
            const pct = (m.count / maxCount) * 100
            const isOpen = expanded === m.id
            const topTypes = Object.entries(m.serviceTypes).sort((a, b) => b[1] - a[1]).slice(0, 3)
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-base">
                      {MEDAL[i] ?? <User className="w-4 h-4 text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-slate-900">{m.name}</span>
                        <span className="text-sm font-bold tabular-nums text-slate-900">{m.count} serv.</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: i === 0 ? "#1e293b" : "#94a3b8" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">Prom.</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 tabular-nums">{fmtMins(m.avgMinutes)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
                        <DollarSign className="w-3 h-3" />
                        <span className="text-xs">Facturado</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(m.totalEarned)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
                        <Wrench className="w-3 h-3" />
                        <span className="text-xs">Tipos</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 tabular-nums">{Object.keys(m.serviceTypes).length}</p>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-2">Servicios más realizados</p>
                    <div className="space-y-1.5">
                      {topTypes.map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 truncate">{type}</span>
                          <span className="text-slate-900 font-semibold tabular-nums shrink-0 ml-2">{count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-500">Sin datos para este período</p>
          <p className="text-sm text-slate-400 mt-1">Selecciona un período con servicios completados</p>
        </div>
      )}
    </div>
  )
}
