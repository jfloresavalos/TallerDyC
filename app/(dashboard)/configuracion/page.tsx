import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, Building, Upload, Car, ArrowRight } from "lucide-react"

const sections = [
  {
    title: "Gestión de Usuarios",
    description: "Crear, editar y gestionar usuarios del sistema",
    href: "/configuracion/usuarios",
    icon: Users,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    borderColor: "hover:border-blue-400",
    linkColor: "text-blue-600",
  },
  {
    title: "Gestión de Sedes",
    description: "Administrar las sedes de la empresa",
    href: "/configuracion/sedes",
    icon: Building2,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    borderColor: "hover:border-green-400",
    linkColor: "text-green-600",
  },
  {
    title: "Marcas y Modelos",
    description: "Gestionar marcas y modelos de vehículos",
    href: "/configuracion/marcas",
    icon: Car,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    borderColor: "hover:border-amber-400",
    linkColor: "text-amber-600",
  },
  {
    title: "Configuración de Empresa",
    description: "Datos de la empresa, RUC, dirección y contacto",
    href: "/configuracion/empresa",
    icon: Building,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    borderColor: "hover:border-purple-400",
    linkColor: "text-purple-600",
  },
  {
    title: "Importar Datos",
    description: "Carga masiva de productos y categorías",
    href: "/configuracion/importar",
    icon: Upload,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    borderColor: "hover:border-orange-400",
    linkColor: "text-orange-600",
  },
]

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/")

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">Administra los ajustes generales del sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className={`cursor-pointer hover:shadow-md transition-all h-full ${section.borderColor}`}>
                <CardHeader className="pb-2">
                  <div className={`p-3 rounded-xl w-fit ${section.iconBg}`}>
                    <Icon className={`w-6 h-6 ${section.iconColor}`} />
                  </div>
                  <CardTitle className="text-lg mt-3">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
                  <span className={`text-sm font-medium ${section.linkColor} inline-flex items-center gap-1`}>
                    Administrar <ArrowRight className="w-4 h-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
