import type React from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import SidebarMenu from "@/components/sidebar-menu"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <SidebarMenu user={session.user} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 pb-safe md:pb-0">
        <div className="w-full max-w-3xl mx-auto md:max-w-none">
          {children}
        </div>
      </main>
    </div>
  )
}
