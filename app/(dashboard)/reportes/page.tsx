import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wrench, DollarSign, ArrowRight } from "lucide-react"

const reports = [
  {
    title: "Servicios Realizados",
    description: "Historial de servicios completados, mecánicos asignados y duración por vehículo",
    href: "/reportes/servicios",
    icon: Wrench,
    color: "green",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    borderColor: "hover:border-green-400",
    linkColor: "text-green-600",
  },
  {
    title: "Ingresos / Ventas",
    description: "Resumen de ingresos por vehículos atendidos, filtrado por sede y rango de fechas",
    href: "/reportes/ingresos",
    icon: DollarSign,
    color: "blue",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    borderColor: "hover:border-blue-400",
    linkColor: "text-blue-600",
  },
]

export default async function ReportesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Reportes</h1>
        <p className="text-sm text-muted-foreground mt-1">Selecciona un reporte para ver información detallada</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Reportes Disponibles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reports.map((report) => {
            const Icon = report.icon
            return (
              <Link key={report.href} href={report.href}>
                <Card className={`cursor-pointer hover:shadow-md transition-all ${report.borderColor}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-xl ${report.iconBg}`}>
                        <Icon className={`w-6 h-6 ${report.iconColor}`} />
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-3">{report.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
                    <span className={`text-sm font-medium ${report.linkColor} inline-flex items-center gap-1`}>
                      Ver reporte <ArrowRight className="w-4 h-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
