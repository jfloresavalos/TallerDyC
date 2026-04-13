"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wrench, User, Lock } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Usuario o contraseña incorrectos")
      setIsLoading(false)
      return
    }

    localStorage.removeItem("tallerdyc-mechanic-mode")
    const session = await getSession()
    const role = (session?.user as { role?: string })?.role
    if (role === "MECHANIC") router.push("/mis-autos")
    else if (role === "RECEPTIONIST") router.push("/taller/registrar")
    else if (role === "CERTIFIER") router.push("/certificar")
    else router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl shadow-2xl w-fit mb-4">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">DyC Conversiones</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de Gestión de Taller</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
          {error && (
            <Alert variant="destructive" className="text-sm">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <label htmlFor="username" className="text-sm font-semibold text-slate-700">
              Usuario
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="username"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
                autoCapitalize="none"
                autoCorrect="off"
                className="pl-10 h-14 rounded-xl border-slate-200 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="pl-10 h-14 rounded-xl border-slate-200 focus:border-blue-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-14 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Ingresando...
              </span>
            ) : (
              "Ingresar al Sistema"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          DyC Conversiones © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
