import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getIncomeReport } from "@/lib/actions/vehicles"
import { getBranches } from "@/lib/actions/users"
import { ReportIncomeClient } from "@/components/taller/report-income"

export default async function ReporteIngresosPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const [report, branches] = await Promise.all([
    getIncomeReport(),
    getBranches(),
  ])

  return (
    <div className="p-4 md:p-6">
      <ReportIncomeClient initialReport={report} branches={branches} />
    </div>
  )
}
