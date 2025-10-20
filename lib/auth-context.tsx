"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export type UserRole = "admin" | "mechanic" | "receptionist"

export interface Mechanic {
  id: string
  username: string
  name: string
  branch: "sede1" | "sede2"
  role: UserRole
}

interface AuthContextType {
  mechanic: Mechanic | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  isAdmin: boolean
  isReceptionist: boolean
  isMechanic: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mechanic, setMechanic] = useState<Mechanic | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("mechanic")
    if (stored) {
      setMechanic(JSON.parse(stored))
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    const mechanics: Record<string, { password: string; name: string; branch: "sede1" | "sede2"; role: UserRole }> = {
      admin: { password: "admin123", name: "Administrador", branch: "sede1", role: "admin" },
      receptionist: { password: "1234", name: "Recepcionista", branch: "sede1", role: "receptionist" },
      juan: { password: "1234", name: "Juan García", branch: "sede1", role: "mechanic" },
      carlos: { password: "1234", name: "Carlos López", branch: "sede1", role: "mechanic" },
      pedro: { password: "1234", name: "Pedro Martínez", branch: "sede2", role: "mechanic" },
      luis: { password: "1234", name: "Luis Rodríguez", branch: "sede2", role: "mechanic" },
    }

    const user = mechanics[username]
    if (user && user.password === password) {
      const mechanicData: Mechanic = {
        id: username,
        username,
        name: user.name,
        branch: user.branch,
        role: user.role,
      }
      setMechanic(mechanicData)
      localStorage.setItem("mechanic", JSON.stringify(mechanicData))
      return true
    }
    return false
  }

  const logout = () => {
    setMechanic(null)
    localStorage.removeItem("mechanic")
  }

  return (
    <AuthContext.Provider
      value={{
        mechanic,
        login,
        logout,
        isLoading,
        isAdmin: mechanic?.role === "admin",
        isReceptionist: mechanic?.role === "receptionist",
        isMechanic: mechanic?.role === "mechanic",
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
