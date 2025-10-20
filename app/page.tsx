"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import LoginPage from "@/components/login-page"
import Dashboard from "@/components/dashboard"

export default function Home() {
  const { mechanic, isLoading } = useAuth()
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return mechanic ? <Dashboard /> : <LoginPage />
}
