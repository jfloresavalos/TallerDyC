import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getBranchesCached } from "@/lib/actions/users"
import { BranchManagementClient } from "@/components/taller/branch-management"

export default async function SedesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const branches = await getBranchesCached()

  return (
    <div className="p-4 md:p-6">
      <BranchManagementClient initialBranches={branches} />
    </div>
  )
}
