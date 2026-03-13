import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getActiveVehicles } from "@/lib/actions/vehicles"
import { getBranches } from "@/lib/actions/users"
import { getServiceTypes } from "@/lib/actions/service-types"
import { ActiveVehiclesClient } from "@/components/taller/active-vehicles"

export default async function TallerPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const [vehicles, branches, initialServiceTypes] = await Promise.all([
    getActiveVehicles(),
    getBranches(),
    getServiceTypes(),
  ])

  return (
    <div className="p-4 md:p-6">
      <ActiveVehiclesClient initialVehicles={vehicles} branches={branches} initialServiceTypes={initialServiceTypes} />
    </div>
  )
}
