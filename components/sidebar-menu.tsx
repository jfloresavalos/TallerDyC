"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, LayoutDashboard, FileText, Wrench, LogOut, Car, ClipboardList, Settings, Users2 } from "lucide-react"
import type { UserRole } from "@prisma/client"

interface SidebarMenuProps {
  user: {
    name: string
    role: UserRole
    branchCode: string | null
  }
}

const menuConfig = {
  ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/taller", label: "Autos Activos", icon: Car },
    { href: "/taller/registrar", label: "Registrar Auto", icon: FileText },
    { href: "/taller/asignar", label: "Asignar Servicio", icon: Wrench },
    { href: "/reportes", label: "Reportes", icon: ClipboardList },
    { href: "/clientes", label: "Clientes", icon: Users2 },
    { href: "/configuracion", label: "Configuración", icon: Settings },
  ],
  RECEPTIONIST: [
    { href: "/taller/registrar", label: "Registrar Auto", icon: FileText },
  ],
  MECHANIC: [
    { href: "/mis-autos", label: "Mis Autos Asignados", icon: Wrench },
  ],
}

export default function SidebarMenu({ user }: SidebarMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const menuItems = menuConfig[user.role] || []

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center px-4 z-40 shadow-sm">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          {isOpen ? (
            <X className="w-5 h-5 text-slate-900" />
          ) : (
            <Menu className="w-5 h-5 text-slate-900" />
          )}
        </button>
        <div className="ml-3 flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-1.5 rounded-lg">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold text-sm text-slate-900">DyC Conversiones</h1>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white transform transition-transform duration-300 z-50 md:translate-x-0 md:relative md:w-64 md:sticky md:top-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg shadow-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base md:text-lg">DyC Conversiones</h1>
              <p className="text-xs text-slate-400">Sistema de Gestión</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            <p>{user.name}</p>
            <p className="capitalize">{user.role.toLowerCase()}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/")

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-900 space-y-2">
          <Button
            onClick={() => signOut({ callbackUrl: "/login" })}
            variant="outline"
            className="w-full gap-2 bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Cerrar Sesión</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden cursor-pointer"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
