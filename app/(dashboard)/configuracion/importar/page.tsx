import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function ImportarPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/configuracion">
          <Button variant="outline" size="icon" className="h-10 w-10 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Importar Datos</h1>
          <p className="text-sm text-slate-600 mt-1">Carga masiva de productos y categorías</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importación Masiva</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Módulo de importación en desarrollo. Próximamente podrás cargar productos, categorías y stock desde archivos Excel.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
