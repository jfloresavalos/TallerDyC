import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getClientByDNI } from "@/lib/actions/clients"
import { ClientDetailClient } from "@/components/taller/client-detail"
import { notFound } from "next/navigation"

interface ClientDetailPageProps {
  params: Promise<{ dni: string }>
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const { dni } = await params
  const client = await getClientByDNI(decodeURIComponent(dni))

  if (!client) notFound()

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <ClientDetailClient client={client} />
    </div>
  )
}
