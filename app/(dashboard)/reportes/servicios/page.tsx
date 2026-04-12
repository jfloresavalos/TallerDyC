import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getCompletedVehiclesForReport } from "@/lib/actions/vehicles"
import { getBranchesCached } from "@/lib/actions/users"
import { ReportServicesClient } from "@/components/taller/report-services"

export default async function ReporteServiciosPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const [vehicles, branches] = await Promise.all([
    getCompletedVehiclesForReport(),
    getBranchesCached(),
  ])

  return (
    <div className="p-4 md:p-6">
      <ReportServicesClient initialVehicles={vehicles} branches={branches} />
    </div>
  )
}
