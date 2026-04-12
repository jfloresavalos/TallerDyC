"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ArrowLeft, Car, Wrench, Phone, CreditCard, Calendar,
  ShoppingCart, Package, FileText, DollarSign, Pencil, Loader2, Check,
} from "lucide-react"
import { toast } from "sonner"
import { upsertClientContact } from "@/lib/actions/clients"
import type { Vehicle, Service } from "@prisma/client"

type ServiceWithMechanic = Service & { mechanic: { name: string } }
type VehicleWithDetails = Vehicle & {
  services: ServiceWithMechanic[]
  branch: { name: string }
}
type SaleItem = {
  id: string; quantity: number; unitPrice: number; subtotal: number
  product: { id: string; name: string; unit: string }
}
type SaleRecord = {
  id: string; saleNumber: string; total: number; createdAt: Date
  paymentMethod1?: string | null; paymentMethod2?: string | null
  paymentAmount1?: number | null; paymentAmount2?: number | null
  branch: { name: string }; createdBy: { name: string }
  items: SaleItem[]
}

interface ClientData {
  clientName: string
  clientDNI: string
  clientPhone: string
  clientNotes?: string | null
  vehicles: VehicleWithDetails[]
  sales: SaleRecord[]
}

interface ClientDetailClientProps {
  client: ClientData
}

const serviceStatusLabels: Record<string, { label: string; class: string }> = {
  ACTIVE:      { label: "Activo",       class: "bg-blue-100 text-blue-800" },
  COMPLETED:   { label: "Completado",   class: "bg-green-100 text-green-800" },
  PENDING:     { label: "Pendiente",    class: "bg-yellow-100 text-yellow-800" },
  IN_PROGRESS: { label: "En Progreso",  class: "bg-blue-100 text-blue-800" },
  PAUSED:      { label: "Pausado",      class: "bg-amber-100 text-amber-800" },
}

const vehicleStatusLabels: Record<string, { label: string; class: string }> = {
  ACTIVE:    { label: "En taller",   class: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "Finalizado",  class: "bg-green-100 text-green-800" },
}

const visitTypeLabels: Record<string, { label: string; class: string }> = {
  general:  { label: "General",   class: "bg-green-100 text-green-800" },
  garantia: { label: "Garantía",  class: "bg-red-100 text-red-800" },
  revision: { label: "Revisión",  class: "bg-teal-100 text-teal-800" },
}

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo", yape: "Yape", plin: "Plin",
  tarjeta: "Tarjeta", transferencia: "Transferencia",
}

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima" })
const fmtTime = (d: Date | string) =>
  new Date(d).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })

export function ClientDetailClient({ client: initialClient }: ClientDetailClientProps) {
  const router = useRouter()
  const [client, setClient] = useState(initialClient)
  const [activeTab, setActiveTab] = useState<"vehicles" | "services" | "purchases">("vehicles")

  // ── Editar ClientContact ──
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  function openEdit() {
    setEditName(client.clientName ?? "")
    setEditPhone(client.clientPhone ?? "")
    setEditNotes(client.clientNotes ?? "")
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return
    setIsSavingEdit(true)
    try {
      await upsertClientContact({ name: editName.trim(), dni: client.clientDNI, phone: editPhone.trim() || undefined, notes: editNotes.trim() || undefined })
      setClient(prev => ({ ...prev, clientName: editName.trim(), clientPhone: editPhone.trim(), clientNotes: editNotes.trim() || null }))
      toast.success("Cliente actualizado")
      setEditOpen(false)
      router.refresh()
    } catch {
      toast.error("Error al actualizar cliente")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const allServices = client.vehicles.flatMap((v) =>
    v.services.map((s) => ({ ...s, vehiclePlate: v.plate, vehicleBrand: v.brand, vehicleModel: v.model }))
  )
  const salesList = client.sales ?? []

  // Totales financieros
  const totalFromVehicles = client.vehicles.reduce((sum, v) => sum + (v.totalAmount ?? 0), 0)
  const totalFromSales = salesList.reduce((sum, s) => sum + s.total, 0)
  const grandTotal = totalFromVehicles + totalFromSales

  const tabs = [
    { key: "vehicles",  label: "Vehículos", icon: Car,          count: client.vehicles.length },
    { key: "services",  label: "Servicios",  icon: Wrench,       count: allServices.length },
    { key: "purchases", label: "Compras",    icon: ShoppingCart, count: salesList.length },
  ] as const

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clientes">
          <Button variant="outline" size="icon" className="h-10 w-10 cursor-pointer shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{client.clientName || "Sin nombre"}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <CreditCard className="w-3.5 h-3.5" /> {client.clientDNI}
            </span>
            {client.clientPhone && (
              <a href={`tel:${client.clientPhone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
                <Phone className="w-3.5 h-3.5" /> {client.clientPhone}
              </a>
            )}
          </div>
          {client.clientNotes && (
            <p className="mt-1 text-xs text-slate-500 italic flex items-start gap-1">
              <FileText className="w-3 h-3 mt-0.5 shrink-0" />{client.clientNotes}
            </p>
          )}
        </div>
        <Button variant="outline" size="icon" className="h-10 w-10 cursor-pointer shrink-0" onClick={openEdit} aria-label="Editar cliente">
          <Pencil className="w-4 h-4" />
        </Button>
      </div>

      {/* Dialog: Editar Cliente */}
      <Dialog open={editOpen} onOpenChange={v => !isSavingEdit && setEditOpen(v)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-2xl p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" />
              Editar Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Nombre completo *</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ej: Juan Pérez García" className="h-11 rounded-xl" autoFocus />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">DNI</label>
              <Input value={client.clientDNI} disabled className="h-11 rounded-xl bg-slate-50 text-slate-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Teléfono</label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="987654321" inputMode="tel" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Notas (opcional)</label>
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Ej: cliente frecuente..." className="h-11 rounded-xl" />
            </div>
          </div>
          <div className="px-5 pb-5 flex gap-3">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1 h-11 rounded-xl cursor-pointer" disabled={isSavingEdit}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={!editName.trim() || isSavingEdit} className="flex-[2] h-11 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer font-semibold">
              {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {isSavingEdit ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats financieras */}
      <div className="bg-slate-900 rounded-2xl p-4 text-white">
        <p className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wide flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" /> Historial financiero
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-lg font-bold">S/ {totalFromVehicles.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Servicios taller</p>
          </div>
          <div>
            <p className="text-lg font-bold">S/ {totalFromSales.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Compras directas</p>
          </div>
          <div className="border-l border-slate-700 pl-3">
            <p className="text-lg font-bold text-green-400">S/ {grandTotal.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total gastado</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === tab.key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab: Vehículos ── */}
      {activeTab === "vehicles" && (
        <div className="space-y-3">
          {client.vehicles.map((v) => {
            const vstatus = vehicleStatusLabels[v.status]
            const vtype = visitTypeLabels[v.visitType] ?? visitTypeLabels["general"]
            return (
              <Card key={v.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {v.brand.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm">{v.brand} {v.model}</p>
                        {vstatus && <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${vstatus.class}`}>{vstatus.label}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${vtype.class}`}>{vtype.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{v.plate}{v.year ? ` · ${v.year}` : ""}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Ingreso: {fmtDate(v.entryTime)}
                        </span>
                        {v.exitTime && <span>Salida: {fmtDate(v.exitTime)}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{v.branch.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-semibold">{v.services.length} servicios</span>
                        {v.totalAmount != null && v.totalAmount > 0 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-md font-semibold">
                            S/ {v.totalAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {client.vehicles.length === 0 && (
            <Card><CardContent className="p-8 text-center text-slate-500">No hay vehículos registrados</CardContent></Card>
          )}
        </div>
      )}

      {/* ── Tab: Servicios ── */}
      {activeTab === "services" && (
        <div className="space-y-3">
          {allServices.map((s) => {
            const status = serviceStatusLabels[s.status]
            return (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white flex-shrink-0">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm">{s.serviceType}</p>
                        {status && <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${status.class}`}>{status.label}</span>}
                        {s.price != null && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md ml-auto">
                            S/ {s.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {s.description && <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{s.description}</p>}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 flex-wrap">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{s.vehiclePlate}</span>
                        <span>{s.vehicleBrand} {s.vehicleModel}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {fmtDate(s.startTime)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Mecánico: {s.mechanic.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {allServices.length === 0 && (
            <Card><CardContent className="p-8 text-center text-slate-500">No hay servicios registrados</CardContent></Card>
          )}
        </div>
      )}

      {/* ── Tab: Compras ── */}
      {activeTab === "purchases" && (
        <div className="space-y-3">
          {salesList.map((sale) => (
            <Card key={sale.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg font-semibold">{sale.saleNumber}</span>
                    <span className="text-xs text-slate-400">{sale.branch.name}</span>
                    {sale.paymentMethod1 && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                        {PAYMENT_LABELS[sale.paymentMethod1] ?? sale.paymentMethod1}
                        {sale.paymentMethod2 && ` + ${PAYMENT_LABELS[sale.paymentMethod2] ?? sale.paymentMethod2}`}
                      </span>
                    )}
                  </div>
                  <span className="text-base font-bold text-green-600 shrink-0">S/ {sale.total.toFixed(2)}</span>
                </div>

                <div className="space-y-1.5">
                  {sale.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <p className="text-xs font-medium text-slate-700 truncate">{item.product.name}</p>
                      </div>
                      <p className="text-xs text-slate-500 shrink-0 ml-2">
                        {item.quantity} × S/ {item.unitPrice.toFixed(2)}
                        <span className="font-semibold text-slate-700 ml-1">= S/ {item.subtotal.toFixed(2)}</span>
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {fmtDate(sale.createdAt)} {fmtTime(sale.createdAt)}
                  </span>
                  <span>Por: {sale.createdBy.name}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {salesList.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">Sin compras directas registradas</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
