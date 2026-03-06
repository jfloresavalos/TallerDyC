import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getBranches } from "@/lib/actions/users"
import { getBrandsForSelect } from "@/lib/actions/brands"
import { VehicleRegistrationClient } from "@/components/taller/vehicle-registration"

export default async function RegistrarPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "RECEPTIONIST")) {
    redirect("/")
  }

  const [branches, brands] = await Promise.all([getBranches(), getBrandsForSelect()])

  return (
    <div className="p-4 md:p-6">
      <VehicleRegistrationClient
        branches={branches}
        brands={brands}
        isAdmin={session.user.role === "ADMIN"}
        userBranchId={session.user.branchId}
      />
    </div>
  )
}
