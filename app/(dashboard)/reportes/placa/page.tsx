import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { ReportPlacaClient } from "@/components/taller/report-placa"

export default async function ReportePlacaPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  return (
    <div className="p-4 md:p-6">
      <ReportPlacaClient />
    </div>
  )
}
