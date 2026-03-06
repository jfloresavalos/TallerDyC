import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getDashboardStats } from "@/lib/actions/vehicles"
import { getBranches } from "@/lib/actions/users"
import { AdminDashboardClient } from "@/components/taller/admin-dashboard"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const [stats, branches] = await Promise.all([
    getDashboardStats(),
    getBranches(),
  ])

  return (
    <div className="p-4 md:p-6">
      <AdminDashboardClient initialStats={stats} branches={branches} />
    </div>
  )
}
