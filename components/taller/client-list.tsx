"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getClients, getRecentClients, exportClientsCSV, upsertClientContact } from "@/lib/actions/clients"
import { Search, Users, Car, Wrench, ChevronRight, Loader2, Plus, ShoppingCart, X, Check, UserPlus, Download } from "lucide-react"
import type { ClientSummary } from "@/lib/actions/clients"

export function ClientListClient({ initialClients = [] }: { initialClients?: ClientSummary[] }) {
  const [search, setSearch] = useState("")
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [recentClients, setRecentClients] = useState<ClientSummary[]>(initialClients)
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const csv = await exportClientsCSV()
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Clientes exportados correctamente")
    } catch {
      toast.error("Error al exportar clientes")
    } finally {
      setIsExporting(false)
    }
  }

  // Dialog nuevo cliente
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDNI, setNewDNI] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleSearch = (value: string) => {
    setSearch(value)
    if (value.trim().length < 2) {
      setClients([])
      setHasSearched(false)
      return
    }
    startTransition(async () => {
      const results = await getClients(value.trim())
      setClients(results)
      setHasSearched(true)
    })
  }

  const handleClearSearch = () => {
    setSearch("")
    setClients([])
    setHasSearched(false)
  }

  const openNew = () => {
    setNewName("")
    setNewDNI(search.match(/^\d+$/) ? search : "")
    setNewPhone("")
    setNewNotes("")
    setNewOpen(true)
  }

  const handleSaveNew = async () => {
    if (!newName.trim() || !newDNI.trim()) return
    setIsSaving(true)
    try {
      await upsertClientContact({ name: newName.trim(), dni: newDNI.trim(), phone: newPhone.trim() || undefined, notes: newNotes.trim() || undefined })
      toast.success("Cliente guardado correctamente")
      setNewOpen(false)
      // Refrescar búsqueda o recientes
      if (search.trim().length >= 2) {
        startTransition(async () => {
          const results = await getClients(search.trim())
          setClients(results)
          setHasSearched(true)
        })
      } else {
        getRecentClients(15).then(setRecentClients).catch(() => {})
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar cliente")
    } finally {
      setIsSaving(false)
    }
  }

  const totalVehicles = clients.reduce((s, c) => s + c.totalVehicles, 0)
  const totalServices = clients.reduce((s, c) => s + c.totalServices, 0)
  const totalSales    = clients.reduce((s, c) => s + c.totalSales, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Busca por nombre, DNI o teléfono</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="h-11 rounded-xl cursor-pointer font-semibold"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button onClick={openNew} className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer font-semibold shrink-0">
            <Plus className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Nuevo Cliente</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre, DNI o teléfono..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 pr-9 h-12 rounded-xl"
          autoFocus
        />
        {isPending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
        {!isPending && search && (
          <button onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Stats */}
      {hasSearched && clients.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900">{clients.length}</p>
              <p className="text-xs text-slate-500">Clientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Car className="w-4 h-4 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900">{totalVehicles}</p>
              <p className="text-xs text-slate-500">Vehículos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Wrench className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900">{totalServices}</p>
              <p className="text-xs text-slate-500">Servicios</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <ShoppingCart className="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900">{totalSales}</p>
              <p className="text-xs text-slate-500">Compras</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Últimos clientes (estado inicial) */}
      {!hasSearched && !isPending && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">Últimos clientes</p>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline cursor-pointer font-medium"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Agregar nuevo
            </button>
          </div>
          {recentClients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <p className="font-medium text-slate-600">No hay clientes registrados</p>
              <p className="text-sm text-slate-400 mt-1">Registra tu primer cliente o ingresa un vehículo</p>
            </div>
          )}
          {recentClients.length > 0 && (
            <div className="space-y-2">
              {recentClients.map((client) => (
                <Link key={client.clientDNI} href={`/clientes/${encodeURIComponent(client.clientDNI)}`}>
                  <Card className="hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(client.clientName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{client.clientName || "Sin nombre"}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-500">DNI: {client.clientDNI}</span>
                            {client.clientPhone && <span className="text-xs text-slate-500">{client.clientPhone}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {client.totalVehicles > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                                <Car className="w-3 h-3" /> {client.totalVehicles}
                              </span>
                            )}
                            {client.totalServices > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-md">
                                <Wrench className="w-3 h-3" /> {client.totalServices}
                              </span>
                            )}
                            {client.totalSales > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                                <ShoppingCart className="w-3 h-3" /> {client.totalSales}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {isPending && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      )}

      {/* Sin resultados */}
      {hasSearched && !isPending && clients.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-medium text-slate-600">Sin resultados para &ldquo;{search}&rdquo;</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">No se encontraron clientes</p>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Agregar &ldquo;{search}&rdquo; como nuevo cliente
            </button>
          </CardContent>
        </Card>
      )}

      {/* Lista de clientes */}
      {hasSearched && !isPending && clients.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 px-1">{clients.length} {clients.length === 1 ? "cliente" : "clientes"}</p>
          {clients.map((client) => (
            <Link key={client.clientDNI} href={`/clientes/${encodeURIComponent(client.clientDNI)}`}>
              <Card className="hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(client.clientName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 text-sm truncate">{client.clientName || "Sin nombre"}</p>
                        {client.source === "contact" && client.totalVehicles === 0 && client.totalSales === 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-medium shrink-0">contacto</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500">DNI: {client.clientDNI}</span>
                        {client.clientPhone && <span className="text-xs text-slate-500">{client.clientPhone}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {client.totalVehicles > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                            <Car className="w-3 h-3" /> {client.totalVehicles} {client.totalVehicles === 1 ? "vehículo" : "vehículos"}
                          </span>
                        )}
                        {client.totalServices > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-md">
                            <Wrench className="w-3 h-3" /> {client.totalServices} {client.totalServices === 1 ? "servicio" : "servicios"}
                          </span>
                        )}
                        {client.totalSales > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                            <ShoppingCart className="w-3 h-3" /> {client.totalSales} {client.totalSales === 1 ? "compra" : "compras"}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* ── Dialog: Nuevo Cliente ── */}
      <Dialog open={newOpen} onOpenChange={v => !isSaving && setNewOpen(v)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-2xl p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100">
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Nuevo Cliente
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Nombre completo *</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ej: Juan Pérez García"
                className="h-11 rounded-xl"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">DNI *</label>
                <Input
                  value={newDNI}
                  onChange={e => setNewDNI(e.target.value)}
                  placeholder="12345678"
                  inputMode="numeric"
                  maxLength={8}
                  className="h-11 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Teléfono</label>
                <Input
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="987654321"
                  inputMode="tel"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Notas (opcional)</label>
              <Input
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="Ej: cliente frecuente, referido por..."
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="px-5 pb-5 flex gap-3">
            <Button variant="outline" onClick={() => setNewOpen(false)} className="flex-1 h-11 rounded-xl cursor-pointer" disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveNew}
              disabled={!newName.trim() || !newDNI.trim() || isSaving}
              className="flex-[2] h-11 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer font-semibold"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {isSaving ? "Guardando..." : "Guardar Cliente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
