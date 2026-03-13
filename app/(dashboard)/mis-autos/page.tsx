import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getServicesByMechanic } from "@/lib/actions/services"
import { getServiceTypes } from "@/lib/actions/service-types"
import { MyAssignedVehiclesClient } from "@/components/taller/my-assigned-vehicles"

export default async function MisAutosPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MECHANIC") redirect("/")

  const [services, serviceTypes] = await Promise.all([
    getServicesByMechanic(session.user.id, "ACTIVE"),
    getServiceTypes(),
  ])

  return (
    <div className="p-4 md:p-6">
      <MyAssignedVehiclesClient
        initialServices={services}
        mechanicId={session.user.id}
        mechanicBranchId={session.user.branchId ?? null}
        serviceTypes={serviceTypes}
      />
    </div>
  )
}
