"use client"

import { useState } from "react"
import Link from "next/link"
import { getIncomeReport } from "@/lib/actions/vehicles"
import { BranchSelector } from "@/components/taller/branch-selector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowLeft, DollarSign, Car, TrendingUp } from "lucide-react"
import type { Branch, Vehicle, Service } from "@prisma/client"

type VehicleWithServices = Vehicle & { branch: Branch; services: Service[] }

interface IncomeReport {
  vehicles: VehicleWithServices[]
  totalIncome: number
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

  const handleBranchChange = async (branchId: string | "all") => {
    setSelectedBranch(branchId)
    const updated = await getIncomeReport(
      branchId === "all" ? undefined : branchId,
      dateFrom || undefined,
      dateTo || undefined,
    )
    setReport(updated as IncomeReport)
  }

  const handleDateFilter = async () => {
    const updated = await getIncomeReport(
      selectedBranch === "all" ? undefined : selectedBranch,
      dateFrom || undefined,
      dateTo || undefined,
    )
    setReport(updated as IncomeReport)
  }

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("es-PE")

  const formatTime = (date: Date | string) =>
    new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })

  const getVehicleTotal = (vehicle: VehicleWithServices) =>
    vehicle.services.reduce((sum, s) => sum + (s.price ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/reportes">
          <Button variant="outline" size="icon" className="h-10 w-10 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Ingresos / Ventas</h1>
          <p className="text-sm text-muted-foreground">Resumen de ingresos por vehículos atendidos</p>
        </div>
      </div>

      <BranchSelector branches={branches} selected={selectedBranch} onChange={handleBranchChange} />

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Desde</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Hasta</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10" />
            </div>
          </div>
          <Button onClick={handleDateFilter} className="w-full h-10 cursor-pointer">Aplicar Filtro de Fecha</Button>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 text-center">
            <DollarSign className="w-5 h-5 mx-auto text-green-600 mb-1" />
            <p className="text-lg md:text-2xl font-bold text-green-600">
              S/ {report.totalIncome.toFixed(2)}
            </p>
            <p className="text-xs text-green-700">Total Ingresos</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 text-center">
            <Car className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <p className="text-lg md:text-2xl font-bold text-blue-600">{report.totalVehicles}</p>
            <p className="text-xs text-blue-700">Vehículos</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-purple-600 mb-1" />
            <p className="text-lg md:text-2xl font-bold text-purple-600">
              S/ {report.avgPerVehicle.toFixed(2)}
            </p>
            <p className="text-xs text-purple-700">Promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle list */}
      {report.vehicles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No se encontraron ingresos en el período seleccionado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {report.vehicles.map((vehicle) => {
            const total = getVehicleTotal(vehicle)
            return (
              <Card key={vehicle.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{vehicle.brand} {vehicle.model}</CardTitle>
                      <CardDescription className="font-mono">{vehicle.plate}</CardDescription>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-green-600">
                        S/ {total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-medium">{vehicle.clientName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Salida</p>
                      <p className="font-medium">{vehicle.exitTime ? `${formatDate(vehicle.exitTime)} ${formatTime(vehicle.exitTime)}` : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sede</p>
                      <p className="font-medium">{vehicle.branch.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
