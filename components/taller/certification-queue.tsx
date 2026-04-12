"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getCertificationQueue, getCertifiedServices, certifyService } from "@/lib/actions/certifications"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ShieldCheck, ShieldX, Car, Clock, CheckCircle2,
  XCircle, Package, Wrench, User, ArrowRightLeft, ChevronDown, ChevronUp
} from "lucide-react"
import type { Branch, Vehicle, Service, User, ServiceCertification } from "@prisma/client"

type ServiceItemMin = {
  id: string
  quantity: number
  unitPrice: number
  subtotal: number
  product: { name: string; unit: string }
}

type HandoffMin = {
  id: string
  fromMechanic: { name: string }
  toMechanic: { name: string }
  note: string | null
}

type QueueService = Service & {
  vehicle: Vehicle & { branch: Branch }
  mechanic: { id: string; name: string } | null
  coMechanic: { id: string; name: string } | null
  items: ServiceItemMin[]
  handoffs: HandoffMin[]
}

type CertifiedRecord = ServiceCertification & {
  service: Service & {
    vehicle: Vehicle & { branch: Branch }
    mechanic: { id: string; name: string } | null
    coMechanic: { id: string; name: string } | null
  }
  certifier: { id: string; name: string }
}

interface CertificationQueueClientProps {
  initialQueue: QueueService[]
  initialCertified: CertifiedRecord[]
  certifierId: string
  certifierBranchId: string | null
  branches: Branch[]
}

export function CertificationQueueClient({
  initialQueue,
  initialCertified,
  certifierId,
  certifierBranchId,
  branches,
}: CertificationQueueClientProps) {
  const [queue, setQueue] = useState(initialQueue)
  const [certified, setCertified] = useState(initialCertified)
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue")
  const [selectedBranchId, setSelectedBranchId] = useState<string>(certifierBranchId ?? "__all__")
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  // Dialog: Certificar
  const [certifyId, setCertifyId] = useState<string | null>(null)
  const [certifyPassed, setCertifyPassed] = useState<boolean | null>(null)
  const [certifyNotes, setCertifyNotes] = useState("")
  const [certifyLoading, setCertifyLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const router = useRouter()

  // Lógica de fetch centralizada — usada por refresh y handleBranchChange
  const fetchData = (branchId: string | null) => {
    startTransition(async () => {
      const [q, c] = await Promise.all([
        getCertificationQueue(branchId),
        getCertifiedServices(branchId),
      ])
      setQueue(q as QueueService[])
      setCertified(c as CertifiedRecord[])
    })
  }

  const refresh = () => fetchData(selectedBranchId === "__all__" ? null : selectedBranchId)

  const handleBranchChange = (value: string) => {
    setSelectedBranchId(value)
    fetchData(value === "__all__" ? null : value)
  }

  const handleOpenCertify = (serviceId: string) => {
    setCertifyId(serviceId)
    setCertifyPassed(null)
    setCertifyNotes("")
  }

  const handleCertify = async () => {
    if (!certifyId || certifyPassed === null) {
      toast.error("Debes seleccionar si aprueba o no")
      return
    }
    setCertifyLoading(true)
    try {
      await certifyService(certifyId, certifierId, certifyPassed, certifyNotes.trim() || undefined)
      toast.success(certifyPassed ? "Servicio aprobado" : "Servicio observado")
      setCertifyId(null)
      setCertifyPassed(null)
      setCertifyNotes("")
      refresh()
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al certificar"
      toast.error(msg)
    } finally { setCertifyLoading(false) }
  }

  const serviceToCertify = queue.find(s => s.id === certifyId)

  return (
    <div className="space-y-4">
      {/* Header + filtro de sede */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Certificaciones</h1>
          <p className="text-sm text-slate-500">Revisión de trabajos completados</p>
        </div>
        {branches.length > 1 && (
          <Select value={selectedBranchId} onValueChange={handleBranchChange}>
            <SelectTrigger className="w-full sm:w-44 h-11 rounded-xl border-slate-200 text-sm">
              <SelectValue placeholder="Sede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las sedes</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("queue")}
          className={`flex-1 h-11 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "queue" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Por certificar {queue.length > 0 && (
            <span className="ml-1 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
              {queue.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 h-11 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Historial
        </button>
      </div>

      {/* ── Tab: Cola de certificación ── */}
      {activeTab === "queue" && (
        <div className="space-y-3">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">Todo al día</h3>
              <p className="text-sm text-slate-500">No hay trabajos pendientes de certificación</p>
            </div>
          ) : (
            queue.map(service => {
              const isExpanded = expandedItems[service.id] ?? false
              return (
                <div key={service.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-base leading-tight">
                        {service.vehicle.brand} {service.vehicle.model}
                      </p>
                      <p className="text-emerald-200 text-sm font-mono">{service.vehicle.plate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-200">Orden</p>
                      <p className="font-bold text-white text-lg">#{service.vehicle.arrivalOrder}</p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-slate-400 shrink-0" />
                      <p className="text-sm font-semibold text-slate-900">{service.serviceType}</p>
                    </div>
                    {service.mechanic && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <p className="text-sm text-slate-600">
                          {service.mechanic.name}
                          {service.coMechanic && (
                            <span className="text-slate-400"> + {service.coMechanic.name}</span>
                          )}
                        </p>
                      </div>
                    )}
                    {service.description && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <p className="text-xs text-amber-700 font-medium mb-0.5">Trabajo realizado:</p>
                        <p className="text-sm text-amber-900">{service.description}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{service.vehicle.branch.name}</span>
                      {service.completionTime && (
                        <span>· Completado {new Date(service.completionTime).toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })}</span>
                      )}
                    </div>

                    {/* Historial de relevos */}
                    {service.handoffs.length > 0 && (
                      <div className="border-t border-slate-100 pt-2">
                        <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                          <ArrowRightLeft className="w-3.5 h-3.5" />Relevos ({service.handoffs.length})
                        </p>
                        <div className="space-y-1">
                          {service.handoffs.map(h => (
                            <div key={h.id} className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-2 py-1">
                              <span className="font-medium text-slate-700">{h.fromMechanic.name}</span>
                              {" → "}
                              <span className="font-medium text-slate-700">{h.toMechanic.name}</span>
                              {h.note && <span className="ml-1 text-slate-400">— {h.note}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Repuestos */}
                    {service.items.length > 0 && (
                      <div className="border-t border-slate-100 pt-2">
                        <button
                          onClick={() => setExpandedItems(p => ({ ...p, [service.id]: !isExpanded }))}
                          className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 cursor-pointer py-1"
                        >
                          <span className="flex items-center gap-1.5 font-semibold">
                            <Package className="w-3.5 h-3.5" />
                            Repuestos ({service.items.length})
                          </span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 space-y-1">
                            {service.items.map(item => (
                              <div key={item.id} className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                                <span>{item.product.name} × {item.quantity} {item.product.unit}</span>
                                <span className="tabular-nums">S/ {item.subtotal.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs font-bold text-slate-800 border-t border-slate-100 pt-1">
                              <span>Total repuestos</span>
                              <span className="tabular-nums">
                                S/ {service.items.reduce((s, i) => s + i.subtotal, 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botón certificar */}
                  <div className="px-4 pb-4">
                    <Button
                      onClick={() => handleOpenCertify(service.id)}
                      className="w-full h-13 font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                    >
                      <ShieldCheck className="w-5 h-5 mr-2" />
                      CERTIFICAR TRABAJO
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Tab: Historial ── */}
      {activeTab === "history" && (
        <div className="space-y-2">
          {certified.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">Sin registros</div>
          ) : (
            certified.map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {c.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <p className="font-semibold text-slate-800 truncate">
                        {c.service.vehicle.brand} {c.service.vehicle.model}
                        <span className="font-normal text-slate-500 ml-1.5 font-mono text-sm">{c.service.vehicle.plate}</span>
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 ml-6">{c.service.serviceType}</p>
                    {c.notes && (
                      <p className="text-xs text-slate-600 ml-6 mt-0.5 italic">"{c.notes}"</p>
                    )}
                    <p className="text-[11px] text-slate-400 ml-6 mt-1">
                      Por {c.certifier.name} · {new Date(c.certifiedAt).toLocaleDateString("es-PE", {
                        day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima"
                      })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    c.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}>
                    {c.passed ? "APROBADO" : "OBSERVADO"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Dialog: Certificar ── */}
      <Dialog open={!!certifyId} onOpenChange={(o) => !o && setCertifyId(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Certificar Trabajo</DialogTitle>
            <DialogDescription>
              {serviceToCertify?.vehicle.brand} {serviceToCertify?.vehicle.model} — {serviceToCertify?.serviceType}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Decisión aprobado/observado */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Resultado <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCertifyPassed(true)}
                  className={`h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                    certifyPassed === true
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-500 hover:border-emerald-300"
                  }`}
                >
                  <ShieldCheck className="w-6 h-6" />
                  <span className="text-xs font-bold">APROBADO</span>
                </button>
                <button
                  onClick={() => setCertifyPassed(false)}
                  className={`h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                    certifyPassed === false
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-slate-200 text-slate-500 hover:border-red-300"
                  }`}
                >
                  <ShieldX className="w-6 h-6" />
                  <span className="text-xs font-bold">OBSERVADO</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Observaciones (opcional)</label>
              <Textarea
                placeholder="Describe lo observado o aprobado..."
                value={certifyNotes}
                onChange={(e) => setCertifyNotes(e.target.value)}
                rows={3}
                className="rounded-xl text-base"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setCertifyId(null)} variant="outline"
                className="flex-1 h-12 rounded-xl cursor-pointer" disabled={certifyLoading}>
                Cancelar
              </Button>
              <Button
                onClick={handleCertify}
                className={`flex-[2] h-12 font-semibold rounded-xl cursor-pointer ${
                  certifyPassed === false
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
                disabled={certifyLoading || certifyPassed === null}
              >
                {certifyLoading ? "Guardando..." : "Confirmar Certificación"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
