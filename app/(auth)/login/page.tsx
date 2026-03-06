"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wrench } from "lucide-react"

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

    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg w-fit">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">DyC Conversiones</CardTitle>
          <CardDescription>Sistema de Gestión de Servicios</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Usuario
              </label>
              <Input
                id="username"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
              {isLoading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
