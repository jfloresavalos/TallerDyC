"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createServiceType, toggleServiceType, updateServiceTypeColor } from "@/lib/actions/service-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, ToggleLeft, ToggleRight, Wrench } from "lucide-react"
import Link from "next/link"
import type { ServiceType } from "@prisma/client"

const COLOR_OPTIONS = [
  { name: "green",  hex: "#16a34a", label: "Verde" },
  { name: "blue",   hex: "#2563eb", label: "Azul" },
  { name: "red",    hex: "#dc2626", label: "Rojo" },
  { name: "teal",   hex: "#0d9488", label: "Teal" },
  { name: "amber",  hex: "#d97706", label: "Ambar" },
  { name: "purple", hex: "#9333ea", label: "Morado" },
  { name: "pink",   hex: "#db2777", label: "Rosa" },
  { name: "slate",  hex: "#475569", label: "Gris" },
]

interface ServiceTypesClientProps {
  initialTypes: ServiceType[]
}

export function ServiceTypesClient({ initialTypes }: ServiceTypesClientProps) {
  const [types, setTypes] = useState(initialTypes)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("green")
  const [isLoading, setIsLoading] = useState(false)
  const [colorPickerId, setColorPickerId] = useState<string | null>(null)
  const router = useRouter()

  const handleAdd = async () => {
    if (!newName.trim()) return
    setIsLoading(true)
    try {
      const created = await createServiceType(newName.trim(), newColor)
      setTypes(prev => [...prev, created])
      setNewName("")
      setNewColor("green")
      toast.success("Tipo de servicio creado")
      router.refresh()
    } catch {
      toast.error("Ya existe un tipo con ese nombre")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await toggleServiceType(id, !active)
      setTypes(prev => prev.map(t => t.id === id ? { ...t, active: !active } : t))
      toast.success(active ? "Desactivado" : "Activado")
    } catch {
      toast.error("Error al actualizar")
    }
  }

  const handleColorChange = async (id: string, color: string) => {
    try {
      await updateServiceTypeColor(id, color)
      setTypes(prev => prev.map(t => t.id === id ? { ...t, color } : t))
      setColorPickerId(null)
      toast.success("Color actualizado")
    } catch {
      toast.error("Error al actualizar color")
    }
  }

  const getHex = (colorName: string) =>
    COLOR_OPTIONS.find(c => c.name === colorName)?.hex ?? "#475569"

  const active = types.filter(t => t.active)
  const inactive = types.filter(t => !t.active)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/configuracion">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl cursor-pointer shrink-0" aria-label="Volver">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tipos de Servicio</h1>
          <p className="text-sm text-slate-500">Gestiona los servicios y sus colores</p>
        </div>
      </div>

      {/* Agregar nuevo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Agregar tipo de servicio</p>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="ej. Cambio de correas"
            className="h-12 rounded-xl flex-1"
          />
          <Button
            onClick={handleAdd}
            disabled={isLoading || !newName.trim()}
            className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer font-semibold px-5"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {/* Selector de color para el nuevo tipo */}
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500 font-medium">Color del borde en el tablero:</p>
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.name}
                onClick={() => setNewColor(c.name)}
                title={c.label}
                className={`w-7 h-7 rounded-full cursor-pointer transition-all border-2 ${
                  newColor === c.name ? "border-slate-800 scale-110" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c.hex }}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Activos */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Activos ({active.length})
        </p>
        {active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-8 text-center">
            <Wrench className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">Sin tipos activos</p>
          </div>
        ) : active.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center px-4 py-3 min-h-[56px] gap-3">
              {/* Dot de color — clic abre/cierra picker */}
              <button
                onClick={() => setColorPickerId(colorPickerId === t.id ? null : t.id)}
                className="w-5 h-5 rounded-full shrink-0 cursor-pointer border-2 border-white shadow-sm hover:scale-110 transition-transform"
                style={{ backgroundColor: getHex(t.color) }}
                title="Cambiar color"
                aria-label="Cambiar color"
              />
              <span className="text-sm font-medium text-slate-800 flex-1">{t.name}</span>
              <button
                onClick={() => handleToggle(t.id, t.active)}
                className="text-green-600 hover:text-green-700 cursor-pointer p-2.5 -mr-1 rounded-xl transition-colors shrink-0"
                aria-label="Desactivar"
              >
                <ToggleRight className="w-6 h-6" />
              </button>
            </div>

            {/* Color picker inline */}
            {colorPickerId === t.id && (
              <div className="px-4 pb-3 border-t border-slate-100 pt-3 bg-slate-50">
                <p className="text-xs text-slate-500 mb-2">Selecciona el color del borde en el tablero:</p>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => handleColorChange(t.id, c.name)}
                      title={c.label}
                      className={`w-8 h-8 rounded-full cursor-pointer transition-all border-2 ${
                        t.color === c.name ? "border-slate-800 scale-110" : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      aria-label={c.label}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Inactivos */}
      {inactive.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Inactivos ({inactive.length})
          </p>
          {inactive.map(t => (
            <div key={t.id} className="bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 px-4 py-3 opacity-60 min-h-[56px]">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: getHex(t.color) }}
              />
              <span className="text-sm font-medium text-slate-600 line-through flex-1">{t.name}</span>
              <button
                onClick={() => handleToggle(t.id, t.active)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-2.5 -mr-1 rounded-xl transition-colors shrink-0"
                aria-label="Activar"
              >
                <ToggleLeft className="w-6 h-6" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
