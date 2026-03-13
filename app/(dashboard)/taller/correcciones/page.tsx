import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getPendingCorrections } from "@/lib/actions/services"
import { CorrectionsClient } from "@/components/taller/corrections-list"

export default async function CorreccionesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const corrections = await getPendingCorrections()

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Correcciones Pendientes</h1>
        <p className="text-sm text-slate-500 mt-1">Servicios reportados por los mecanicos que necesitan atencion</p>
      </div>
      <CorrectionsClient initialCorrections={corrections} />
    </div>
  )
}
