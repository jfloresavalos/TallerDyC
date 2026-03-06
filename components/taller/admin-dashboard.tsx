"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BranchSelector } from "@/components/taller/branch-selector"
import { getDashboardStats } from "@/lib/actions/vehicles"
import type { Branch } from "@prisma/client"
import { Car, CheckCircle, DollarSign, Clock } from "lucide-react"

interface DashboardStats {
  activeVehicles: number
  completedToday: number
  totalIncome: number
  averageServiceTime: number
}

interface AdminDashboardClientProps {
  initialStats: DashboardStats
  branches: Branch[]
}

export function AdminDashboardClient({ initialStats, branches }: AdminDashboardClientProps) {
  const [stats, setStats] = useState(initialStats)
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all")
  const router = useRouter()

  const handleBranchChange = async (branchId: string | "all") => {
    setSelectedBranch(branchId)
    const newStats = await getDashboardStats(branchId === "all" ? undefined : branchId)
    setStats(newStats)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-xs md:text-sm text-slate-600 mt-1">
          {selectedBranch === "all" ? "Ambas Sedes" : branches.find((b) => b.id === selectedBranch)?.name} {" "}
          {new Date().toLocaleDateString("es-PE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <BranchSelector branches={branches} selected={selectedBranch} onChange={handleBranchChange} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs md:text-sm font-medium text-blue-900">
              Autos Activos
            </CardTitle>
            <Car className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-blue-600">
              {stats.activeVehicles}
            </div>
            <p className="text-xs text-blue-700 mt-1">En el taller ahora</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs md:text-sm font-medium text-green-900">
              Completados Hoy
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-green-600">
              {stats.completedToday}
            </div>
            <p className="text-xs text-green-700 mt-1">Servicios finalizados</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs md:text-sm font-medium text-purple-900">
              Ingresos Hoy
            </CardTitle>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-purple-600">
              S/ {stats.totalIncome.toFixed(2)}
            </div>
            <p className="text-xs text-purple-700 mt-1">Total del día</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs md:text-sm font-medium text-orange-900">
              Tiempo Promedio
            </CardTitle>
            <Clock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-orange-600">
              {stats.averageServiceTime}m
            </div>
            <p className="text-xs text-orange-700 mt-1">Por servicio</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
