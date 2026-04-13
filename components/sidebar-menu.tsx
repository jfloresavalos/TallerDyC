"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import Link from "next/link"
import {
  Menu, X, LayoutDashboard, FileText, Wrench, LogOut, Car,
  ClipboardList, Settings, Users2, ShoppingCart,
  Package, ChevronRight, ShieldCheck, ArrowLeftRight
} from "lucide-react"
import type { UserRole } from "@prisma/client"

interface SidebarMenuProps {
  user: {
    name: string
    role: UserRole
    branchCode: string | null
  }
}

const menuConfig: Record<UserRole, { group: string; items: { href: string; label: string; icon: typeof Car }[] }[]> = {
  ADMIN: [
    { group: "Taller", items: [
      { href: "/dashboard",          label: "Dashboard",        icon: LayoutDashboard },
      { href: "/taller",             label: "Autos Activos",    icon: Car },
      { href: "/taller/registrar",   label: "Registrar Auto",   icon: FileText },
    ]},
    { group: "Negocio", items: [
      { href: "/clientes",   label: "Clientes",   icon: Users2 },
      { href: "/inventario", label: "Inventario", icon: Package },
      { href: "/ventas",     label: "Ventas",     icon: ShoppingCart },
      { href: "/reportes",   label: "Reportes",   icon: ClipboardList },
    ]},
    { group: "Sistema", items: [
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ]},
  ],
  RECEPTIONIST: [
    { group: "Trabajo", items: [
      { href: "/taller/registrar", label: "Registrar Auto", icon: FileText },
    ]},
  ],
  MECHANIC: [
    { group: "Mi Trabajo", items: [
      { href: "/mis-autos", label: "Mis Autos Asignados", icon: Wrench },
    ]},
  ],
  CERTIFIER: [
    { group: "Mi Trabajo", items: [
      { href: "/certificar", label: "Certificar Servicios", icon: ShieldCheck },
    ]},
  ],
}

const roleLabel: Record<UserRole, string> = {
  ADMIN: "Administrador",
  MECHANIC: "Mecánico",
  RECEPTIONIST: "Recepcionista",
  CERTIFIER: "Certificador",
}

const roleColors: Record<UserRole, { gradient: string; initial: string }> = {
  ADMIN:        { gradient: "from-blue-500 to-blue-700",       initial: "bg-blue-600" },
  MECHANIC:     { gradient: "from-violet-500 to-violet-700",   initial: "bg-violet-600" },
  RECEPTIONIST: { gradient: "from-orange-500 to-orange-600",   initial: "bg-orange-500" },
  CERTIFIER:    { gradient: "from-emerald-500 to-emerald-700", initial: "bg-emerald-600" },
}

const mobileNavItems: Record<UserRole, { href: string; label: string; icon: typeof Car }[]> = {
  ADMIN: [
    { href: "/dashboard", label: "Inicio",    icon: LayoutDashboard },
    { href: "/taller",    label: "Taller",    icon: Car },
    { href: "/ventas",    label: "Ventas",    icon: ShoppingCart },
    { href: "/reportes",  label: "Reportes",  icon: ClipboardList },
  ],
  MECHANIC:     [{ href: "/mis-autos",   label: "Mis Autos",   icon: Wrench }],
  RECEPTIONIST: [
    { href: "/taller/registrar", label: "Registrar", icon: FileText },
  ],
  CERTIFIER: [{ href: "/certificar", label: "Certificar", icon: ShieldCheck }],
}

export default function SidebarMenu({ user }: SidebarMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mechanicMode, setMechanicMode] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (user.role === "ADMIN") {
      const saved = localStorage.getItem("tallerdyc-mechanic-mode")
      if (saved === "true") setMechanicMode(true)
    }
  }, [user.role])

  const isAdminAsMechanic = user.role === "ADMIN" && mechanicMode
  const effectiveRole: UserRole = isAdminAsMechanic ? "MECHANIC" : user.role

  const groups = menuConfig[effectiveRole] || []
  const isMobileRole = effectiveRole === "MECHANIC" || effectiveRole === "RECEPTIONIST" || effectiveRole === "CERTIFIER"
  const colors = roleColors[effectiveRole]
  const navItems = mobileNavItems[effectiveRole] || []

  const toggleMechanicMode = () => {
    const newMode = !mechanicMode
    setMechanicMode(newMode)
    localStorage.setItem("tallerdyc-mechanic-mode", String(newMode))
    setIsOpen(false)
    router.push(newMode ? "/mis-autos" : "/dashboard")
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    if (pathname === href) return true
    if (pathname.startsWith(href + "/")) {
      const allHrefs = groups.flatMap(g => g.items.map(i => i.href))
      return !allHrefs.some(h => h !== href && pathname === h)
    }
    return false
  }

  const userInitial = user.name.charAt(0).toUpperCase()
  const displayRole = isAdminAsMechanic ? "Mecánico" : roleLabel[user.role]

  return (
    <>
      {/* ══════════════════════════════════════
          MOBILE: Bottom Nav
          ══════════════════════════════════════ */}
      {isMobileRole && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/60"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="flex">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 pt-3 pb-2 transition-colors cursor-pointer min-h-[56px] ${
                    active ? "text-blue-600" : "text-slate-400"
                  }`}
                >
                  <div className="relative flex items-center justify-center w-6 h-6">
                    <Icon className="w-[22px] h-[22px]" />
                    {active && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-blue-600 rounded-full" />
                    )}
                  </div>
                  <span className={`text-xs font-medium leading-none ${active ? "text-blue-600" : "text-slate-400"}`}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
            {isAdminAsMechanic && (
              <button
                onClick={toggleMechanicMode}
                className="flex-1 flex flex-col items-center justify-center gap-1 pt-3 pb-2 text-blue-500 cursor-pointer min-h-[56px]"
              >
                <ArrowLeftRight className="w-[22px] h-[22px]" />
                <span className="text-xs font-medium leading-none">Admin</span>
              </button>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex-1 flex flex-col items-center justify-center gap-1 pt-3 pb-2 text-slate-400 cursor-pointer min-h-[56px]"
            >
              <LogOut className="w-[22px] h-[22px]" />
              <span className="text-xs font-medium leading-none">Salir</span>
            </button>
          </div>
        </nav>
      )}

      {/* ══════════════════════════════════════
          MOBILE: Top Header
          ══════════════════════════════════════ */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/60"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center h-14 px-4 gap-3">
          {!isMobileRole && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer -ml-1 shrink-0"
              aria-label="Abrir menú"
            >
              {isOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
            </button>
          )}

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <img src="/logo.png" alt="DyC" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-sm text-slate-900 leading-none truncate">DyC Conversiones</p>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5 truncate">{user.name}</p>
            </div>
          </div>

          <div className={`shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r ${colors.gradient} text-white`}>
            {displayRole}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          DESKTOP SIDEBAR / MOBILE DRAWER
          ══════════════════════════════════════ */}
      <aside
        className={`fixed left-0 top-0 h-screen w-[260px] bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col transform transition-transform duration-300 ease-in-out z-50
          md:translate-x-0 md:relative md:sticky md:top-0 md:shrink-0
          ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
      >
        {/* ── Header ── */}
        <div className="px-4 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo.png" alt="DyC Conversiones" className="h-10 object-contain brightness-110" />
          </div>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full ${colors.initial} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white truncate leading-tight">{user.name}</p>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">
                {displayRole}{user.branchCode ? ` · ${user.branchCode}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {groups.map((group) => (
            <div key={group.group}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] px-3 mb-1.5">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer min-h-[42px] ${
                        active
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                          : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                      }`}
                    >
                      <Icon className={`shrink-0 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} style={{ width: '18px', height: '18px' }} />
                      <span className="text-[13px] font-medium flex-1">{item.label}</span>
                      {active && <ChevronRight className="w-3.5 h-3.5 text-blue-200 shrink-0" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="px-3 pb-4 pt-2 border-t border-white/[0.06] space-y-0.5">
          {user.role === "ADMIN" && (
            <button
              onClick={toggleMechanicMode}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer min-h-[42px] group ${
                mechanicMode
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
              }`}
            >
              <ArrowLeftRight className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                mechanicMode ? "text-violet-400" : "group-hover:text-blue-400"
              }`} />
              <span className="text-[13px] font-medium">
                {mechanicMode ? "Volver a Admin" : "Modo Mecánico"}
              </span>
            </button>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-all duration-150 cursor-pointer min-h-[42px] group"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0 group-hover:text-red-400 transition-colors" />
            <span className="text-[13px] font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && !isMobileRole && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden cursor-pointer"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
