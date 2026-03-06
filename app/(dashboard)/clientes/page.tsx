import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getClients } from "@/lib/actions/clients"
import { ClientListClient } from "@/components/taller/client-list"

export default async function ClientesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const clients = await getClients()

  return (
    <div className="p-4 md:p-6">
      <ClientListClient initialClients={clients} />
    </div>
  )
}
