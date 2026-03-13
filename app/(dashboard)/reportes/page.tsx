import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getDashboardStats } from "@/lib/actions/vehicles"
import Link from "next/link"
import { Wrench, DollarSign, ArrowRight, TrendingUp, BarChart3 } from "lucide-react"

export default async function ReportesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const stats = await getDashboardStats()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="text-sm text-slate-500 mt-1">Análisis y estadísticas del taller</p>
      </div>

      {/* Resumen rápido del día */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-slate-300" />
          <p className="text-sm font-medium text-slate-300">Resumen de hoy</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold">{stats.completedToday}</p>
            <p className="text-xs text-slate-400 mt-0.5">Completados</p>
          </div>
          <div>
            <p className="text-2xl font-bold">S/ {stats.totalIncome.toFixed(0)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Ingresos</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.averageServiceTime}m</p>
            <p className="text-xs text-slate-400 mt-0.5">Prom. servicio</p>
          </div>
        </div>
      </div>

      {/* Cards de reportes */}
      <div className="space-y-3">
        <Link href="/reportes/servicios">
          <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 flex items-center gap-4 cursor-pointer hover:border-blue-200 hover:bg-blue-50 transition-colors group">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-base">Servicios Realizados</h3>
              <p className="text-sm text-slate-500 mt-0.5">Historial completo por vehículo, mecánico y fechas</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Filtro por fecha</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Por mecánico</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Por sede</span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
          </div>
        </Link>

        <Link href="/reportes/ingresos">
          <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 flex items-center gap-4 cursor-pointer hover:border-green-200 hover:bg-green-50 transition-colors group">
            <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-base">Ingresos / Ventas</h3>
              <p className="text-sm text-slate-500 mt-0.5">Servicios de taller + ventas de mostrador combinados</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Servicios taller</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Ventas mostrador</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Por sede</span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-green-600 transition-colors shrink-0" />
          </div>
        </Link>
      </div>

      {/* Nota */}
      <div className="flex items-start gap-2 text-xs text-slate-400">
        <BarChart3 className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Los reportes incluyen solo vehículos con estado "Completado". Usa los filtros de fecha para analizar períodos específicos.</p>
      </div>
    </div>
  )
}
