import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getCompany } from "@/lib/actions/company"
import { CompanyConfigClient } from "@/components/taller/company-config"

export default async function EmpresaPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const company = await getCompany()

  return (
    <div className="p-4 md:p-6">
      <CompanyConfigClient initialCompany={company} />
    </div>
  )
}
