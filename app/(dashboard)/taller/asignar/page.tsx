import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getActiveVehicles } from "@/lib/actions/vehicles"
import { getBranches, getUsers } from "@/lib/actions/users"
import { ServiceAssignmentClient } from "@/components/taller/service-assignment"

export default async function AsignarPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const [vehicles, branches, mechanics] = await Promise.all([
    getActiveVehicles(),
    getBranches(),
    getUsers(),
  ])

  const mechanicUsers = mechanics.filter((u) => u.role === "MECHANIC")

  // Filter vehicles that don't have services yet
  const vehiclesWithoutServices = vehicles.filter(
    (v) => v.services.length === 0
  )

  return (
    <div className="p-4 md:p-6">
      <ServiceAssignmentClient
        initialVehicles={vehiclesWithoutServices}
        branches={branches}
        mechanics={mechanicUsers}
      />
    </div>
  )
}
