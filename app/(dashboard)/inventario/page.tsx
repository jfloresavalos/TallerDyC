import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function InventarioPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Módulo de inventario en desarrollo. Próximamente podrás gestionar tu stock de repuestos y herramientas.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
