"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createUser, updateUser, deleteUser } from "@/lib/actions/users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trash2, Edit2, Plus, ArrowLeft, Shield, Wrench, UserCheck } from "lucide-react"
import Link from "next/link"
import type { Branch, User, UserRole } from "@prisma/client"

type UserWithBranch = User & { branch: Branch | null }

interface UserManagementClientProps {
  initialUsers: UserWithBranch[]
  branches: Branch[]
  currentUserId: string
}

const roleConfig: Record<string, { label: string; badge: string; icon: typeof Shield }> = {
  ADMIN: { label: "Administrador", badge: "bg-blue-100 text-blue-800", icon: Shield },
  MECHANIC: { label: "Mecánico", badge: "bg-green-100 text-green-800", icon: Wrench },
  RECEPTIONIST: { label: "Recepcionista", badge: "bg-purple-100 text-purple-800", icon: UserCheck },
  CERTIFIER: { label: "Certificador", badge: "bg-amber-100 text-amber-800", icon: Shield },
}
const DEFAULT_ROLE_CONFIG = { label: "Desconocido", badge: "bg-slate-100 text-slate-800", icon: Shield }

export function UserManagementClient({ initialUsers, branches, currentUserId }: UserManagementClientProps) {
  const [users, setUsers] = useState(initialUsers)
  const [formData, setFormData] = useState({ username: "", name: "", password: "", role: "MECHANIC" as UserRole, branchId: branches[0]?.id ?? "" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.username || !formData.name || (!editingId && !formData.password)) return

    setIsLoading(true)
    try {
      if (editingId) {
        await updateUser(editingId, {
          name: formData.name,
          ...(formData.password && { password: formData.password }),
          role: formData.role,
          branchId: formData.role === "ADMIN" ? null : formData.branchId,
        })
        toast.success("Usuario actualizado")
      } else {
        await createUser({
          username: formData.username,
          name: formData.name,
          password: formData.password,
          role: formData.role,
          branchId: formData.role === "ADMIN" ? null : formData.branchId,
        })
        toast.success("Usuario creado")
      }

      setFormData({ username: "", name: "", password: "", role: "MECHANIC", branchId: branches[0]?.id ?? "" })
      setEditingId(null)
      setIsOpen(false)
      router.refresh()

      const { getUsers } = await import("@/lib/actions/users")
      const updatedUsers = await getUsers()
      setUsers(updatedUsers as UserWithBranch[])
    } catch {
      toast.error("Error al guardar usuario")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (user: UserWithBranch) => {
    setFormData({
      username: user.username,
      name: user.name,
      password: "",
      role: user.role,
      branchId: user.branchId ?? branches[0]?.id ?? "",
    })
    setEditingId(user.id)
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (id === currentUserId) {
      toast.error("No puedes eliminar tu propia cuenta")
      return
    }
    setIsLoading(true)
    try {
      await deleteUser(id)
      toast.success("Usuario eliminado")
      setUsers((prev) => prev.filter((u) => u.id !== id))
      router.refresh()
    } catch {
      toast.error("Error al eliminar usuario")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({ username: "", name: "", password: "", role: "MECHANIC", branchId: branches[0]?.id ?? "" })
      setEditingId(null)
    }
    setIsOpen(open)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/configuracion">
            <Button variant="outline" size="icon" className="h-10 w-10 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Gestión de Usuarios</h1>
            <p className="text-sm text-slate-600 mt-1">{users.length} usuarios registrados</p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full md:w-auto cursor-pointer h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-500/20">
              <Plus className="w-4 h-4" /> Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-md max-w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
              <DialogDescription>{editingId ? "Actualiza los datos del usuario" : "Ingresa los datos del nuevo usuario"}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre de Usuario *</label>
                <Input name="username" placeholder="Ej: juan_garcia" value={formData.username} onChange={handleChange} disabled={!!editingId} required className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre Completo *</label>
                <Input name="name" placeholder="Ej: Juan García" value={formData.name} onChange={handleChange} required className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{editingId ? "Nueva Contraseña (dejar vacío para no cambiar)" : "Contraseña *"}</label>
                <Input name="password" type="password" placeholder="Ingresa la contraseña" value={formData.password} onChange={handleChange} required={!editingId} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rol *</label>
                <select name="role" value={formData.role} onChange={handleChange} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background h-10">
                  <option value="MECHANIC">Mecánico</option>
                  <option value="RECEPTIONIST">Recepcionista</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              {formData.role !== "ADMIN" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sede *</label>
                  <select name="branchId" value={formData.branchId} onChange={handleChange} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background h-10">
                    {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                  </select>
                </div>
              )}
              <Button type="submit" className="w-full h-10 cursor-pointer" disabled={isLoading}>
                {isLoading ? "Guardando..." : editingId ? "Actualizar Usuario" : "Crear Usuario"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <th className="text-left py-4 px-6 text-sm font-semibold">Usuario</th>
                <th className="text-left py-4 px-6 text-sm font-semibold">Rol</th>
                <th className="text-left py-4 px-6 text-sm font-semibold">Sede</th>
                <th className="text-left py-4 px-6 text-sm font-semibold">Estado</th>
                <th className="text-right py-4 px-6 text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const role = roleConfig[user.role] ?? DEFAULT_ROLE_CONFIG
                const RoleIcon = role.icon
                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
                          <p className="text-xs text-slate-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${role.badge}`}>
                        <RoleIcon className="w-3.5 h-3.5" />
                        {role.label}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-700">
                        {user.branch?.name ?? "—"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${user.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        <span className={`w-2 h-2 rounded-full ${user.active ? "bg-green-500" : "bg-red-500"}`} />
                        {user.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-xs font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={user.id === currentUserId || isLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-xs font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-sm shadow-red-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {users.map((user) => {
          const role = roleConfig[user.role]
          const RoleIcon = role.icon
          return (
            <Card key={user.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${role.badge}`}>
                        <RoleIcon className="w-3 h-3" />
                        {role.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">@{user.username}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {user.branch && (
                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {user.branch.name}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${user.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.active ? "bg-green-500" : "bg-red-500"}`} />
                        {user.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleEdit(user)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={user.id === currentUserId || isLoading}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
