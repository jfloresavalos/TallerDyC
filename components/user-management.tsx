"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Edit2, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface User {
  id: string
  username: string
  name: string
  password: string
  role: "admin" | "mechanic" | "receptionist"
  branch: "sede1" | "sede2"
}

export default function UserManagement({ onSuccess }: { onSuccess: () => void }) {
  const [users, setUsers] = useState<User[]>([
    { id: "admin", username: "admin", name: "Administrador", password: "admin123", role: "admin", branch: "sede1" },
    {
      id: "receptionist",
      username: "receptionist",
      name: "Recepcionista",
      password: "1234",
      role: "receptionist",
      branch: "sede1",
    },
    { id: "juan", username: "juan", name: "Juan García", password: "1234", role: "mechanic", branch: "sede1" },
    { id: "carlos", username: "carlos", name: "Carlos López", password: "1234", role: "mechanic", branch: "sede1" },
    { id: "pedro", username: "pedro", name: "Pedro Martínez", password: "1234", role: "mechanic", branch: "sede2" },
    { id: "luis", username: "luis", name: "Luis Rodríguez", password: "1234", role: "mechanic", branch: "sede2" },
  ])

  const [formData, setFormData] = useState<Partial<User>>({
    username: "",
    name: "",
    password: "",
    role: "mechanic",
    branch: "sede1",
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username || !formData.name || !formData.password) {
      return
    }

    if (editingId) {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === editingId
            ? {
                ...user,
                username: formData.username || user.username,
                name: formData.name || user.name,
                password: formData.password || user.password,
                role: (formData.role as User["role"]) || user.role,
                branch: formData.role === "admin" ? user.branch : (formData.branch as User["branch"]) || user.branch,
              }
            : user,
        ),
      )
      setEditingId(null)
    } else {
      const newUser: User = {
        id: formData.username || "",
        username: formData.username || "",
        name: formData.name || "",
        password: formData.password || "",
        role: (formData.role as User["role"]) || "mechanic",
        branch: formData.role === "admin" ? "sede1" : (formData.branch as User["branch"]) || "sede1",
      }
      setUsers((prev) => [...prev, newUser])
    }

    setFormData({
      username: "",
      name: "",
      password: "",
      role: "mechanic",
      branch: "sede1",
    })
    setSuccess(true)
    setIsOpen(false)

    setTimeout(() => setSuccess(false), 2000)
  }

  const handleEdit = (user: User) => {
    setFormData(user)
    setEditingId(user.id)
    setIsOpen(true)
  }

  const handleDelete = (id: string) => {
    if (id === "admin") {
      alert("No puedes eliminar el usuario administrador")
      return
    }
    setUsers((prev) => prev.filter((user) => user.id !== id))
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({
        username: "",
        name: "",
        password: "",
        role: "mechanic",
        branch: "sede1",
      })
      setEditingId(null)
    }
    setIsOpen(open)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Gestionar Usuarios</h1>
          <p className="text-sm text-slate-600 mt-1">Crea, edita y elimina usuarios del sistema</p>
        </div>

        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full md:w-auto">
              <Plus className="w-4 h-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Actualiza los datos del usuario" : "Ingresa los datos del nuevo usuario"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre de Usuario *</label>
                <Input
                  name="username"
                  placeholder="Ej: juan_garcia"
                  value={formData.username || ""}
                  onChange={handleChange}
                  disabled={!!editingId}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre Completo *</label>
                <Input
                  name="name"
                  placeholder="Ej: Juan García"
                  value={formData.name || ""}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contraseña *</label>
                <Input
                  name="password"
                  type="password"
                  placeholder="Ingresa la contraseña"
                  value={formData.password || ""}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Rol *</label>
                <select
                  name="role"
                  value={formData.role || "mechanic"}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                >
                  <option value="mechanic">Mecánico</option>
                  <option value="receptionist">Recepcionista</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {formData.role !== "admin" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sede *</label>
                  <select
                    name="branch"
                    value={formData.branch || "sede1"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  >
                    <option value="sede1">Sede 1</option>
                    <option value="sede2">Sede 2</option>
                  </select>
                </div>
              )}

              <Button type="submit" className="w-full">
                {editingId ? "Actualizar Usuario" : "Crear Usuario"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            {editingId ? "Usuario actualizado exitosamente" : "Usuario creado exitosamente"}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900">{user.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                        user.role === "admin"
                          ? "bg-blue-100 text-blue-700"
                          : user.role === "receptionist"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {user.role === "admin"
                        ? "Administrador"
                        : user.role === "receptionist"
                          ? "Recepcionista"
                          : "Mecánico"}
                    </span>
                    {user.role !== "admin" && (
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-medium whitespace-nowrap">
                        {user.branch === "sede1" ? "Sede 1" : "Sede 2"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 truncate">Usuario: {user.username}</p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(user)} className="gap-2">
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden md:inline">Editar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(user.id)}
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={user.id === "admin"}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden md:inline">Eliminar</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
