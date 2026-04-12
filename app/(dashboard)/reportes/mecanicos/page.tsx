import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getMechanicProductivityReport } from "@/lib/actions/vehicles"
import { getBranchesCached } from "@/lib/actions/users"
import { ReportMecanicosClient } from "@/components/taller/report-mecanicos"

export default async function ReporteMecanicosPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const [report, branches] = await Promise.all([
    getMechanicProductivityReport(),
    getBranchesCached(),
  ])

  return (
    <div className="p-4 md:p-6">
      <ReportMecanicosClient initialReport={report} branches={branches} />
    </div>
  )
}
