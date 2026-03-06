import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getUsers, getBranches } from "@/lib/actions/users"
import { UserManagementClient } from "@/components/taller/user-management"

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const [users, branches] = await Promise.all([getUsers(), getBranches()])

  return (
    <div className="p-4 md:p-6">
      <UserManagementClient initialUsers={users} branches={branches} currentUserId={session.user.id} />
    </div>
  )
}
