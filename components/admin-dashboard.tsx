"use client"

import { useState, useEffect } from "react"
import { getVehicles, getServices, getActiveVehicles } from "@/lib/data-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    activeVehicles: 0,
    completedToday: 0,
    totalIncome: 0,
    pendingCompletion: 0,
    averageServiceTime: 0,
  })

  useEffect(() => {
    const updateStats = () => {
      const sede1Vehicles = getVehicles().filter((v) => v.branch === "sede1")
      const sede2Vehicles = getVehicles().filter((v) => v.branch === "sede2")
      const allVehicles = [...sede1Vehicles, ...sede2Vehicles]

      const sede1Services = getServices().filter((s) => {
        const vehicle = sede1Vehicles.find((v) => v.id === s.vehicleId)
        return vehicle !== undefined
      })
      const sede2Services = getServices().filter((s) => {
        const vehicle = sede2Vehicles.find((v) => v.id === s.vehicleId)
        return vehicle !== undefined
      })
      const allServices = [...sede1Services, ...sede2Services]

      const activeVehicles1 = getActiveVehicles("sede1")
      const activeVehicles2 = getActiveVehicles("sede2")
      const totalActiveVehicles = [...activeVehicles1, ...activeVehicles2]

      const today = new Date().toDateString()

      const completedToday = allVehicles.filter((v) => {
        return v.status === "completed" && new Date(v.exitTime || "").toDateString() === today
      }).length

      const totalIncome = allServices
        .filter((s) => {
          const vehicle = allVehicles.find((v) => v.id === s.vehicleId)
          return (
            vehicle &&
            vehicle.status === "completed" &&
            new Date(vehicle.exitTime || "").toDateString() === today &&
            s.status === "completed" &&
            s.price !== null
          )
        })
        .reduce((sum, s) => sum + (s.price || 0), 0)

      const pendingCompletion =
        allServices.filter((s) => s.status === "completed").length -
        allVehicles.filter((v) => v.status === "completed").length

      const completedServices = allServices.filter((s) => s.completionTime)
      const avgTime =
        completedServices.length > 0
          ? completedServices.reduce((sum, s) => {
              const start = new Date(s.startTime).getTime()
              const end = new Date(s.completionTime || "").getTime()
              return sum + (end - start)
            }, 0) /
            completedServices.length /
            (1000 * 60)
          : 0

      setStats({
        activeVehicles: totalActiveVehicles.length,
        completedToday,
        totalIncome,
        pendingCompletion,
        averageServiceTime: Math.round(avgTime),
      })
    }

    updateStats()
    const interval = setInterval(updateStats, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-xs md:text-sm text-slate-600 mt-1">
          Ambas Sedes •{" "}
          {new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* Autos Activos */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-blue-900">Autos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-blue-600">{stats.activeVehicles}</div>
            <p className="text-xs text-blue-700 mt-1">En el taller ahora</p>
          </CardContent>
        </Card>

        {/* Completados Hoy */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-green-900">Completados Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-green-600">{stats.completedToday}</div>
            <p className="text-xs text-green-700 mt-1">Servicios finalizados</p>
          </CardContent>
        </Card>

        {/* Ingresos Hoy */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-purple-900">Ingresos Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-purple-600">S/ {stats.totalIncome.toFixed(2)}</div>
            <p className="text-xs text-purple-700 mt-1">Total del día</p>
          </CardContent>
        </Card>

        {/* Pendientes Salida */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-orange-900">Pendientes Salida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-orange-600">{stats.pendingCompletion}</div>
            <p className="text-xs text-orange-700 mt-1">Listos para salir</p>
          </CardContent>
        </Card>

        {/* Tiempo Promedio */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-slate-900">Tiempo Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-slate-600">{stats.averageServiceTime}m</div>
            <p className="text-xs text-slate-700 mt-1">Por servicio</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
