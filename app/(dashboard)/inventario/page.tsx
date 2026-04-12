import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getCategories, getAllProductsCached } from "@/lib/actions/products"
import { getBranchesCached } from "@/lib/actions/users"
import { InventoryClient } from "@/components/taller/inventory-client"

export default async function InventarioPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const [categories, branches, allProducts] = await Promise.all([
    getCategories(),
    getBranchesCached(),
    getAllProductsCached(),
  ])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <InventoryClient categories={categories} branches={branches} initialProducts={allProducts} />
    </div>
  )
}
