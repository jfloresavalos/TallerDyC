import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getCobrosReport } from "@/lib/actions/vehicles"
import { getBranchesCached } from "@/lib/actions/users"
import { ReportCobrosClient } from "@/components/taller/report-cobros"

export default async function ReporteCobrosPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const [report, branches] = await Promise.all([
    getCobrosReport(),
    getBranchesCached(),
  ])

  return (
    <div className="p-4 md:p-6">
      <ReportCobrosClient initialReport={report} branches={branches} />
    </div>
  )
}
