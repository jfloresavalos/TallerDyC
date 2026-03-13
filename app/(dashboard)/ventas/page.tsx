import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getSales, getSalesToday } from "@/lib/actions/sales"
import { getBranches } from "@/lib/actions/users"
import { SalesClient } from "@/components/taller/sales-client"

export default async function VentasPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "RECEPTIONIST")) redirect("/")

  const [sales, todayStats, branches] = await Promise.all([
    getSales(),
    getSalesToday(),
    getBranches(),
  ])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <SalesClient initialSales={sales} todayStats={todayStats} branches={branches} userId={session.user.id} />
    </div>
  )
}
