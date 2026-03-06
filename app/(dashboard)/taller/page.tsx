import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getActiveVehicles } from "@/lib/actions/vehicles"
import { getBranches } from "@/lib/actions/users"
import { ActiveVehiclesClient } from "@/components/taller/active-vehicles"

export default async function TallerPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const [vehicles, branches] = await Promise.all([
    getActiveVehicles(),
    getBranches(),
  ])

  return (
    <div className="p-4 md:p-6">
      <ActiveVehiclesClient initialVehicles={vehicles} branches={branches} />
    </div>
  )
}
