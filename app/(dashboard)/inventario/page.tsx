import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getCategories } from "@/lib/actions/products"
import { getBranches } from "@/lib/actions/users"
import { InventoryClient } from "@/components/taller/inventory-client"

export default async function InventarioPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const [categories, branches] = await Promise.all([
    getCategories(),
    getBranches(),
  ])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <InventoryClient categories={categories} branches={branches} />
    </div>
  )
}
