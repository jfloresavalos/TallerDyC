import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getServicesByMechanic } from "@/lib/actions/services"
import { MyAssignedVehiclesClient } from "@/components/taller/my-assigned-vehicles"

export default async function MisAutosPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MECHANIC") redirect("/")

  const services = await getServicesByMechanic(session.user.id, "IN_PROGRESS")

  return (
    <div className="p-4 md:p-6">
      <MyAssignedVehiclesClient
        initialServices={services}
        mechanicId={session.user.id}
      />
    </div>
  )
}
