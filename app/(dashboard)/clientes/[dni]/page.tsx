import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getClientByDNI } from "@/lib/actions/clients"
import { ClientDetailClient } from "@/components/taller/client-detail"

interface Props {
  params: Promise<{ dni: string }>
}

export default async function ClienteDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const { dni } = await params
  const client = await getClientByDNI(dni)
  if (!client) notFound()

  return (
    <div className="p-4 md:p-6">
      <ClientDetailClient client={client} />
    </div>
  )
}
