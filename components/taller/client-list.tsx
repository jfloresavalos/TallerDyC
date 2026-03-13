"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getClients } from "@/lib/actions/clients"
import { Search, Users, Car, Wrench, ChevronRight, Loader2 } from "lucide-react"

interface Client {
  clientName: string
  clientDNI: string
  clientPhone: string
  totalVehicles: number
  totalServices: number
}

export function ClientListClient() {
  const [search, setSearch] = useState("")
  const [clients, setClients] = useState<Client[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <p className="text-sm text-slate-500 mt-0.5">Busca por nombre, DNI o teléfono</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre, DNI o teléfono..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 h-12 rounded-xl"
          autoFocus
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
        )}
      </div>

      {/* Stats when there are results */}
      {hasSearched && clients.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-900">{clients.length}</p>
              <p className="text-xs text-slate-500">Clientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Car className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-900">{clients.reduce((s, c) => s + c.totalVehicles, 0)}</p>
              <p className="text-xs text-slate-500">Vehículos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Wrench className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-900">{clients.reduce((s, c) => s + c.totalServices, 0)}</p>
              <p className="text-xs text-slate-500">Servicios</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* State: prompt to search */}
      {!hasSearched && !isPending && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Busca un cliente</h3>
          <p className="text-sm text-slate-400">Escribe al menos 2 caracteres</p>
        </div>
      )}

      {/* Loading */}
      {isPending && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      )}

      {/* No results */}
      {hasSearched && !isPending && clients.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-medium text-slate-600">Sin resultados</p>
            <p className="text-sm text-slate-400 mt-1">No se encontraron clientes</p>
          </CardContent>
        </Card>
      )}

      {/* Client list */}
      {hasSearched && !isPending && clients.length > 0 && (
        <div className="space-y-2">
          {clients.map((client) => (
            <Link key={client.clientDNI} href={`/clientes/${client.clientDNI}`}>
              <Card className="hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {client.clientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{client.clientName}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">DNI: {client.clientDNI}</span>
                        <span className="text-xs text-slate-500">Tel: {client.clientPhone}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                          <Car className="w-3 h-3" /> {client.totalVehicles} vehículos
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-md">
                          <Wrench className="w-3 h-3" /> {client.totalServices} servicios
                        </span>
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
  )
}
