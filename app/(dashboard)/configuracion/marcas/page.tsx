import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getBrands } from "@/lib/actions/brands"
import { BrandManagementClient } from "@/components/taller/brand-management"

export default async function MarcasPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const brands = await getBrands()

  return (
    <div className="p-4 md:p-6">
      <BrandManagementClient initialBrands={brands} />
    </div>
  )
}
