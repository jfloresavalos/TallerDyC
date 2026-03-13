import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getAllServiceTypes } from "@/lib/actions/service-types"
import { ServiceTypesClient } from "@/components/taller/service-types-client"

export default async function ServiceTypesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const serviceTypes = await getAllServiceTypes()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <ServiceTypesClient initialTypes={serviceTypes} />
    </div>
  )
}
