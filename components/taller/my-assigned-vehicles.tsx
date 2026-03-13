"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  getServicesByMechanic,
  completeService,
  updateService,
  addService,
  addServiceItem,
  removeServiceItem,
  deleteService,
  pauseService,
  resumeService,
  getUnassignedVehicles,
  handoffService,
  assignMechanicToService,
  assignCoMechanicToService,
} from "@/lib/actions/services"
import { getAllProducts } from "@/lib/actions/products"
import { getMechanicsByBranch } from "@/lib/actions/services"
import { getServiceTypes } from "@/lib/actions/service-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle, Phone, Car, Clock, Plus,
  Trash2, Package, Search, X, AlertCircle, Wrench,
  ChevronDown, ChevronUp, ArrowRightLeft, User, Zap,
  PauseCircle, PlayCircle
} from "lucide-react"
import type { Branch, Vehicle, Service, User, ServiceType, Product, ServiceHandoff } from "@prisma/client"

const COLOR_HEX: Record<string, string> = {
  green:  "#16a34a",
  blue:   "#2563eb",
  red:    "#dc2626",
  teal:   "#0d9488",
  amber:  "#d97706",
  purple: "#9333ea",
  pink:   "#db2777",
  slate:  "#475569",
}
const toHex = (c: string) => (c.startsWith("#") ? c : (COLOR_HEX[c] ?? "#475569"))

type ServiceItem = {
  id: string
  quantity: number
  unitPrice: number
  subtotal: number
  product: { id: string; name: string; unit: string }
}

type HandoffWithUsers = ServiceHandoff & {
  fromMechanic: { name: string }
  toMechanic: { name: string }
}

type ServiceWithRelations = Service & {
  vehicle: Vehicle & { branch: Branch }
  mechanic: User | null
  coMechanic: User | null
  items: ServiceItem[]
  handoffs: HandoffWithUsers[]
  pauseReason?: string | null
}

type UnassignedService = { id: string; serviceType: string; mechanicId: string | null; coMechanicId: string | null; status: string }
type UnassignedVehicle = Vehicle & { branch: Branch; services: UnassignedService[] }

interface MyAssignedVehiclesClientProps {
  initialServices: ServiceWithRelations[]
  mechanicId: string
  mechanicBranchId: string | null
  serviceTypes: ServiceType[]
}

export function MyAssignedVehiclesClient({
  initialServices,
  mechanicId,
  mechanicBranchId,
  serviceTypes,
}: MyAssignedVehiclesClientProps) {
  const [services, setServices] = useState(initialServices)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"mine" | "available">("mine")
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  // Dialog: Completar trabajo
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [completionStep, setCompletionStep] = useState<"parts" | "describe" | "more">("parts")
  const [completionDesc, setCompletionDesc] = useState("")
  const [completionUsedParts, setCompletionUsedParts] = useState<boolean | null>(null)
  const [completionItems, setCompletionItems] = useState<{ product: Product; quantity: number; unitPrice: number }[]>([])
  const [completionExtraService, setCompletionExtraService] = useState("")

  // Dialog: Nota (editar descripción)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState("")

  // Dialog: Pasar a otro mecánico (handoff)
  const [handoffServiceId, setHandoffServiceId] = useState<string | null>(null)
  const [handoffToMechanicId, setHandoffToMechanicId] = useState("")
  const [handoffNote, setHandoffNote] = useState("")
  const [handoffMechanics, setHandoffMechanics] = useState<User[]>([])
  const [handoffLoading, setHandoffLoading] = useState(false)

  // Dialog: Agregar servicio adicional
  const [addServiceId, setAddServiceId] = useState<string | null>(null)
  const [newServiceType, setNewServiceType] = useState("")

  // Productos (para buscador de repuestos en completar trabajo)
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [itemQty, setItemQty] = useState("1")
  const [itemPrice, setItemPrice] = useState("")

  // Dialog: Eliminar servicio (con razón obligatoria)
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null)
  const [deleteReason, setDeleteReason] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Dialog: Pausar servicio
  const [pauseServiceId, setPauseServiceId] = useState<string | null>(null)
  const [pauseReason, setPauseReason] = useState("")
  const [pauseLoading, setPauseLoading] = useState(false)

  // Tab: Autos disponibles
  const [unassigned, setUnassigned] = useState<UnassignedVehicle[]>([])
  const [unassignedLoading, setUnassignedLoading] = useState(false)
  const [unassignedSearch, setUnassignedSearch] = useState("")
  const [detailVehicle, setDetailVehicle] = useState<UnassignedVehicle | null>(null)   // Dialog selector de servicio
  const [confirmVehicle, setConfirmVehicle] = useState<UnassignedVehicle | null>(null) // Dialog confirmación
  const [takeServiceType, setTakeServiceType] = useState("") // solo cuando no tiene servicio
  const [takeLoading, setTakeLoading] = useState(false)
  const [localServiceTypes, setLocalServiceTypes] = useState<ServiceType[]>(serviceTypes)
  // Co-mecánico para revisión anual
  const [coMechanicId, setCoMechanicId] = useState("")
  const [availableMechanics, setAvailableMechanics] = useState<{ id: string; name: string }[]>([])

  const router = useRouter()

  // ¿Tengo un servicio IN_PROGRESS? (PAUSED no bloquea tomar otro auto)
  const hasActiveVehicle = services.some(s => s.status === "IN_PROGRESS")

  const refresh = async () => {
    const updated = await getServicesByMechanic(mechanicId, "ACTIVE")
    setServices(updated as ServiceWithRelations[])
  }

  // ── Completar trabajo ──
  const handleComplete = async (id: string) => {
    if (!completionDesc.trim()) {
      toast.error("Debes describir el trabajo realizado")
      return
    }
    setIsLoading(true)
    try {
      // Guardar repuestos nuevos primero
      for (const item of completionItems) {
        await addServiceItem({
          serviceId: id,
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })
      }
      await completeService(id, completionDesc.trim())
      // Ir al paso "¿hay otro servicio pendiente?"
      setCompletionStep("more")
      setCompletionDesc("")
      setCompletionUsedParts(null)
      setCompletionItems([])
      setSelectedProduct(null)
      setProductSearch("")
      await refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al completar"
      toast.error(msg)
    } finally { setIsLoading(false) }
  }

  const handleCloseCompletion = () => {
    setConfirmId(null)
    setCompletionStep("parts")
    setCompletionDesc("")
    setCompletionUsedParts(null)
    setCompletionItems([])
    setCompletionExtraService("")
    setSelectedProduct(null)
    setProductSearch("")
    router.refresh()
  }

  const handleAddExtraService = async () => {
    if (!completionExtraService || !confirmId) return
    const svc = services.find(s => s.id === confirmId) ?? serviceToComplete
    const vehicleId = svc?.vehicle.id
    if (!vehicleId) return
    setIsLoading(true)
    try {
      await addService({ vehicleId, serviceType: completionExtraService, description: "", mechanicId })
      toast.success("Servicio adicional agregado")
      handleCloseCompletion()
      await refresh()
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al agregar servicio"
      toast.error(msg)
    } finally { setIsLoading(false) }
  }

  const handleSaveNote = async (id: string) => {
    if (!noteText.trim()) return
    setIsLoading(true)
    try {
      await updateService(id, { description: noteText.trim() })
      toast.success("Nota guardada")
      setNoteId(null)
      setNoteText("")
      await refresh()
    } catch { toast.error("Error al guardar") } finally { setIsLoading(false) }
  }

  // ── Handoff ──
  const handleOpenHandoff = async (serviceId: string) => {
    setHandoffServiceId(serviceId)
    setHandoffToMechanicId("")
    setHandoffNote("")
    const mechanics = await getMechanicsByBranch(mechanicBranchId ?? undefined) as User[]
    // Excluir el mecánico actual
    setHandoffMechanics(mechanics.filter(m => m.id !== mechanicId))
  }

  const handleHandoff = async () => {
    if (!handoffServiceId || !handoffToMechanicId) {
      toast.error("Selecciona el mecánico destino")
      return
    }
    setHandoffLoading(true)
    try {
      await handoffService(
        handoffServiceId,
        mechanicId,
        handoffToMechanicId,
        handoffNote.trim() || undefined
      )
      toast.success("Servicio transferido")
      setHandoffServiceId(null)
      setHandoffToMechanicId("")
      setHandoffNote("")
      await refresh()
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al transferir"
      toast.error(msg)
    } finally { setHandoffLoading(false) }
  }

  const handleAddService = async (vehicleId: string) => {
    if (!newServiceType) { toast.error("Selecciona un servicio"); return }
    setIsLoading(true)
    try {
      await addService({ vehicleId, serviceType: newServiceType, description: "", mechanicId })
      toast.success("Servicio adicional agregado")
      setAddServiceId(null)
      setNewServiceType("")
      await refresh()
      router.refresh()
    } catch { toast.error("Error al agregar servicio") } finally { setIsLoading(false) }
  }

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeServiceItem(itemId)
      toast.success("Repuesto eliminado")
      await refresh()
    } catch { toast.error("Error al eliminar repuesto") }
  }

  // ── Eliminar servicio (razón obligatoria) ──
  const handleDeleteService = async () => {
    if (!deleteServiceId) return
    if (!deleteReason.trim()) {
      toast.error("Debes indicar el motivo de eliminación")
      return
    }
    setDeleteLoading(true)
    try {
      await deleteService(deleteServiceId, mechanicId, deleteReason.trim())
      toast.success("Servicio eliminado")
      setDeleteServiceId(null)
      setDeleteReason("")
      await refresh()
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al eliminar"
      toast.error(msg)
    } finally { setDeleteLoading(false) }
  }

  // ── Pausar / Reanudar servicio ──
  const handlePauseService = async () => {
    if (!pauseServiceId) return
    if (!pauseReason.trim()) {
      toast.error("Debes indicar el motivo de la pausa")
      return
    }
    setPauseLoading(true)
    try {
      await pauseService(pauseServiceId, mechanicId, pauseReason.trim())
      toast.success("Servicio pausado. Ya puedes tomar otro auto.")
      setPauseServiceId(null)
      setPauseReason("")
      await refresh()
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al pausar"
      toast.error(msg)
    } finally { setPauseLoading(false) }
  }

  const handleResumeService = async (serviceId: string) => {
    setIsLoading(true)
    try {
      await resumeService(serviceId, mechanicId)
      toast.success("Servicio reanudado")
      await refresh()
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al reanudar"
      toast.error(msg)
    } finally { setIsLoading(false) }
  }

  // ── Tab: Autos disponibles ──
  const handleLoadUnassigned = async () => {
    setUnassignedLoading(true)
    try {
      const [vehicles, types, mechanics] = await Promise.all([
        getUnassignedVehicles(mechanicBranchId ?? undefined) as Promise<UnassignedVehicle[]>,
        getServiceTypes() as Promise<ServiceType[]>,
        getMechanicsByBranch(mechanicBranchId ?? undefined),
      ])
      setUnassigned(vehicles)
      setLocalServiceTypes(types)
      // Excluir al propio mecánico de la lista de co-mecánicos
      setAvailableMechanics(mechanics.filter(m => m.id !== mechanicId))
    } finally { setUnassignedLoading(false) }
  }

  const handleTabChange = (tab: "mine" | "available") => {
    setActiveTab(tab)
    if (tab === "available") handleLoadUnassigned()
  }

  const handleTakeVehicle = async (vehicleId: string) => {
    setTakeLoading(true)
    try {
      const coId = (coMechanicId && coMechanicId !== "none") ? coMechanicId : undefined

      // Caso: revisión anual con mecánico principal ya asignado — unirse como co-mecánico
      const revisionWaiting = confirmVehicle?.services.find(
        s => s.mechanicId !== null && s.coMechanicId === null && s.status !== "COMPLETED"
      )
      if (revisionWaiting) {
        await assignCoMechanicToService(revisionWaiting.id, mechanicId)
        toast.success("Te uniste como co-mecánico. Aparece en Mis Trabajos.")
      } else {
        // Caso normal: servicio sin mecánico principal
        const existingService = confirmVehicle?.services.find(s => s.mechanicId === null && s.status !== "COMPLETED")
        if (existingService) {
          await assignMechanicToService(existingService.id, { mechanicId, coMechanicId: coId })
        } else {
          if (!takeServiceType) { toast.error("Selecciona un tipo de servicio"); setTakeLoading(false); return }
          await addService({ vehicleId, serviceType: takeServiceType, description: "", mechanicId, coMechanicId: coId })
        }
        toast.success("Auto asignado. Aparece en Mis Trabajos.")
      }
      toast.success("Auto asignado. Aparece en Mis Trabajos.")
      setConfirmVehicle(null)
      setTakeServiceType("")
      setCoMechanicId("")
      setDetailVehicle(null)
      setUnassignedSearch("")
      const [updatedServices, updatedVehicles] = await Promise.all([
        getServicesByMechanic(mechanicId, "ACTIVE"),
        getUnassignedVehicles(mechanicBranchId ?? undefined),
      ])
      setServices(updatedServices as ServiceWithRelations[])
      setUnassigned(updatedVehicles as UnassignedVehicle[])
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al tomar el auto"
      toast.error(msg)
    } finally { setTakeLoading(false) }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.code ?? "").toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 20)

  const filteredUnassigned = unassigned.filter(v => {
    if (!unassignedSearch.trim()) return true
    const q = unassignedSearch.toLowerCase()
    return (
      v.plate.toLowerCase().includes(q) ||
      v.clientName.toLowerCase().includes(q) ||
      (v.clientDNI ?? "").toLowerCase().includes(q) ||
      v.brand.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q)
    )
  })

  const serviceToComplete = services.find(s => s.id === confirmId)
  const serviceForNote = services.find(s => s.id === noteId)
  const serviceForAdd = services.find(s => s.id === addServiceId)
  const serviceToDelete = services.find(s => s.id === deleteServiceId)
  const serviceForPause = services.find(s => s.id === pauseServiceId)

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => handleTabChange("mine")}
          className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "mine" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Mis Trabajos {services.length > 0 && `(${services.length})`}
        </button>
        <button
          onClick={() => handleTabChange("available")}
          className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "available" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Disponibles
        </button>
      </div>

      {/* ── Tab: Mis trabajos ── */}
      {activeTab === "mine" && (
        <>
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Car className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">Sin asignaciones</h3>
              <p className="text-sm text-slate-500">No tienes autos asignados en este momento</p>
              <Button onClick={() => handleTabChange("available")} variant="outline"
                className="mt-4 h-11 rounded-xl cursor-pointer">
                Ver autos disponibles
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Agrupar servicios por vehículo */}
              {Object.values(
                services.reduce((groups, svc) => {
                  const vid = svc.vehicle.id
                  if (!groups[vid]) groups[vid] = { vehicle: svc.vehicle, services: [] }
                  groups[vid].services.push(svc)
                  return groups
                }, {} as Record<string, { vehicle: ServiceWithRelations["vehicle"]; services: ServiceWithRelations[] }>)
              ).map(({ vehicle, services: vehicleServices }) => {
                const allDone = vehicleServices.every(s => s.status === "COMPLETED")
                const hasInProgress = vehicleServices.some(s => s.status === "IN_PROGRESS")

                return (
                  <div key={vehicle.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Header del auto */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white text-base leading-tight">{vehicle.brand} {vehicle.model}</p>
                        <p className="text-blue-200 text-sm font-mono">{vehicle.plate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-200">Orden</p>
                        <p className="font-bold text-white text-lg">#{vehicle.arrivalOrder}</p>
                      </div>
                    </div>

                    {/* Cliente */}
                    <div className="px-4 pt-3 pb-0">
                      <a href={`tel:${vehicle.clientPhone}`} className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                        <Phone className="w-3.5 h-3.5 shrink-0" />{vehicle.clientName} — {vehicle.clientPhone}
                      </a>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{vehicle.branch.name}
                      </p>
                    </div>

                    {/* Servicios del auto */}
                    <div className="px-4 pt-3 space-y-2.5">
                      {vehicleServices.map((service) => {
                        const isItemsExpanded = expandedItems[service.id] ?? false
                        const isDone = service.status === "COMPLETED"
                        const isPaused = service.status === "PAUSED"
                        const isRevision = vehicle.visitType === "revision"
                        // Revisión anual sin co-mecánico asignado aún
                        const waitingCoMechanic = isRevision && !service.coMechanicId
                        // Co-mecánico completo: isRevision && service.coMechanicId !== null
                        const canPause = !isRevision
                        return (
                          <div key={service.id} className={`rounded-xl border overflow-hidden ${
                            isDone ? "border-green-200 bg-green-50" :
                            isPaused ? "border-orange-200 bg-orange-50" :
                            "border-slate-200 bg-slate-50"
                          }`}>
                            {/* Cabecera del servicio */}
                            <div className={`px-3 py-2 flex items-center justify-between gap-2 ${
                              isDone ? "bg-green-100" : isPaused ? "bg-orange-100" : "bg-white"
                            }`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isDone ? "bg-green-500" : isPaused ? "bg-orange-500" : "bg-blue-500"
                                }`} />
                                <p className="text-sm font-semibold text-slate-800 truncate">{service.serviceType}</p>
                                {service.coMechanic && (
                                  <span className="text-[10px] text-slate-500 shrink-0">+ {service.coMechanic.name}</span>
                                )}
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isDone ? "bg-green-200 text-green-800" :
                                isPaused ? "bg-orange-200 text-orange-800" :
                                "bg-blue-100 text-blue-700"
                              }`}>
                                {isDone ? "Listo" : isPaused ? "En pausa" : "En progreso"}
                              </span>
                            </div>

                            {/* Razón de pausa */}
                            {isPaused && service.pauseReason && (
                              <div className="px-3 py-1.5 bg-orange-50 border-t border-orange-100 flex items-start gap-1.5">
                                <PauseCircle className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-orange-800">
                                  <span className="font-semibold">Motivo de pausa: </span>
                                  {service.pauseReason}
                                </p>
                              </div>
                            )}

                            {/* Notas del servicio */}
                            {service.description && (
                              <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-100">
                                <p className="text-[11px] text-amber-800">{service.description}</p>
                              </div>
                            )}

                            {/* Repuestos ya guardados (solo si hay) */}
                            {service.items.length > 0 && (
                              <div className="px-3 py-1.5 border-t border-slate-100">
                                <button
                                  onClick={() => setExpandedItems(p => ({ ...p, [service.id]: !isItemsExpanded }))}
                                  className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 cursor-pointer py-0.5"
                                >
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <Package className="w-3 h-3" />
                                    Repuestos ({service.items.length})
                                  </span>
                                  {isItemsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                {isItemsExpanded && (
                                  <div className="mt-1.5 space-y-1">
                                    {service.items.map(item => (
                                      <div key={item.id} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-slate-800 truncate">{item.product.name}</p>
                                          <p className="text-[10px] text-slate-400 tabular-nums">{item.quantity} {item.product.unit} × S/ {item.unitPrice.toFixed(2)} = S/ {item.subtotal.toFixed(2)}</p>
                                        </div>
                                        {!isDone && (
                                          <button onClick={() => handleRemoveItem(item.id)}
                                            className="p-1 rounded text-slate-300 hover:text-red-500 cursor-pointer shrink-0" aria-label="Quitar">
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Banner: esperando co-mecánico */}
                            {waitingCoMechanic && (
                              <div className="px-3 py-2 bg-teal-50 border-t border-teal-100 flex items-start gap-2">
                                <User className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-teal-800">
                                  <span className="font-semibold">Esperando co-mecánico.</span> Este servicio requiere dos personas para comenzar.
                                </p>
                              </div>
                            )}

                            {/* Acciones del servicio (no COMPLETED) */}
                            {!isDone && (
                              <div className={`px-3 py-2 border-t space-y-1.5 ${isPaused ? "border-orange-100" : "border-slate-100"}`}>
                                {isPaused ? (
                                  /* ── Servicio pausado: solo Reanudar y Eliminar ── */
                                  <div className="flex gap-1.5">
                                    <Button
                                      onClick={() => handleResumeService(service.id)}
                                      className="flex-1 h-10 text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer"
                                      disabled={isLoading}
                                    >
                                      <PlayCircle className="w-4 h-4 mr-1.5" />
                                      Reanudar trabajo
                                    </Button>
                                    <Button variant="ghost" size="sm"
                                      onClick={() => { setDeleteServiceId(service.id); setDeleteReason("") }}
                                      className="h-10 w-10 rounded-xl cursor-pointer text-red-400 hover:text-red-600 hover:bg-red-50 px-0 shrink-0">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : waitingCoMechanic ? (
                                  /* ── Revisión sin co-mecánico: solo Eliminar ── */
                                  <div className="flex gap-1.5">
                                    <Button variant="ghost" size="sm"
                                      onClick={() => { setDeleteServiceId(service.id); setDeleteReason("") }}
                                      className="h-8 w-8 rounded-lg cursor-pointer text-red-400 hover:text-red-600 hover:bg-red-50 px-0">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  /* ── Servicio en progreso: Terminar + acciones secundarias ── */
                                  <>
                                    <Button
                                      onClick={() => { setConfirmId(service.id); setCompletionStep("parts"); setCompletionDesc(""); setCompletionUsedParts(null); setCompletionItems([]) }}
                                      className="w-full h-10 text-sm font-bold rounded-xl bg-green-600 hover:bg-green-700 shadow-sm cursor-pointer"
                                      disabled={isLoading}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1.5" />
                                      Terminar este trabajo
                                    </Button>
                                    <div className="flex gap-1.5">
                                      <Button variant="outline" size="sm"
                                        onClick={() => { setNoteId(service.id); setNoteText(service.description || "") }}
                                        className="flex-1 h-8 text-xs rounded-lg cursor-pointer">
                                        Nota
                                      </Button>
                                      {canPause && (
                                        <Button variant="outline" size="sm"
                                          onClick={() => { setPauseServiceId(service.id); setPauseReason("") }}
                                          className="flex-1 h-8 text-xs rounded-lg cursor-pointer text-orange-600 border-orange-200 hover:bg-orange-50">
                                          <PauseCircle className="w-3 h-3 mr-1" />Pausar
                                        </Button>
                                      )}
                                      <Button variant="outline" size="sm"
                                        onClick={() => handleOpenHandoff(service.id)}
                                        className="flex-1 h-8 text-xs rounded-lg cursor-pointer text-blue-600 hover:bg-blue-50">
                                        <ArrowRightLeft className="w-3 h-3 mr-1" />Pasar
                                      </Button>
                                      <Button variant="ghost" size="sm"
                                        onClick={() => { setDeleteServiceId(service.id); setDeleteReason("") }}
                                        className="h-8 w-8 rounded-lg cursor-pointer text-red-400 hover:text-red-600 hover:bg-red-50 px-0">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Acciones del auto — agregar otro servicio */}
                    {hasInProgress && (
                      <div className="px-4 pb-3">
                        <Button variant="outline"
                          onClick={() => { setAddServiceId(vehicleServices[0].id); setNewServiceType("") }}
                          className="w-full h-10 text-xs rounded-xl border-dashed cursor-pointer">
                          <Plus className="w-3.5 h-3.5 mr-1.5" />Agregar otro servicio
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Autos disponibles ── */}
      {activeTab === "available" && (
        <div className="space-y-3">
          {/* Banner: límite de 1 auto activo */}
          {hasActiveVehicle && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Ya tienes un trabajo en progreso.</span> Termínalo, transfiérelo o páusalo antes de tomar otro.
              </p>
            </div>
          )}

          {/* Buscador */}
          {!unassignedLoading && unassigned.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Placa, cliente o DNI..."
                value={unassignedSearch}
                onChange={e => setUnassignedSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-400 transition-colors"
              />
              {unassignedSearch && (
                <button onClick={() => setUnassignedSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400" aria-label="Limpiar">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {unassignedLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Cargando...</div>
          ) : unassigned.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Car className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">Sin autos disponibles</h3>
              <p className="text-sm text-slate-500">No hay autos sin asignar en tu sede</p>
            </div>
          ) : filteredUnassigned.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">Sin resultados para "{unassignedSearch}"</div>
          ) : (
            <div className="space-y-3">
              {(() => {
                // Mismos colores y orden que el tablero admin (por visitType)
                const VISIT_CONFIG: Record<string, { label: string; color: string }> = {
                  general:  { label: "General",        color: "#16a34a" },
                  garantia: { label: "Garantía",       color: "#dc2626" },
                  revision: { label: "Revisión anual", color: "#0d9488" },
                }
                const VISIT_ORDER = ["general", "garantia", "revision"]

                // Agrupar por visitType
                const byVisit: Record<string, UnassignedVehicle[]> = {}
                for (const vehicle of filteredUnassigned) {
                  const vt = vehicle.visitType ?? "general"
                  if (!byVisit[vt]) byVisit[vt] = []
                  byVisit[vt].push(vehicle)
                }

                // Renderizar en orden: general → garantia → revision → resto
                const orderedKeys = [
                  ...VISIT_ORDER.filter(k => byVisit[k]),
                  ...Object.keys(byVisit).filter(k => !VISIT_ORDER.includes(k)),
                ]

                return orderedKeys.map(vt => {
                  const cfg = VISIT_CONFIG[vt] ?? { label: vt, color: "#475569" }
                  const color = cfg.color
                  const groupVehicles = byVisit[vt]

                  return (
                    <div key={vt} className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                      {/* Header del grupo */}
                      <div
                        className="px-3 py-2 flex items-center gap-2"
                        style={{ backgroundColor: color + "18", borderLeft: `4px solid ${color}` }}
                      >
                        <span className="text-sm font-bold" style={{ color }}>{cfg.label}</span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: color + "30", color }}
                        >
                          {groupVehicles.length}
                        </span>
                      </div>

                      {/* Grid 2 columnas igual que el tablero admin */}
                      <div className="grid grid-cols-2 bg-white">
                        {groupVehicles
                          .slice()
                          .sort((a, b) => (a.arrivalOrder ?? 0) - (b.arrivalOrder ?? 0))
                          .map(vehicle => {
                            const existingService = vehicle.services.find(s => s.mechanicId === null && s.status !== "COMPLETED")
                            // Revisión esperando co-mecánico (ya tiene mechanicId pero no coMechanicId)
                            const waitingForCoMechanic = vehicle.services.find(s => s.mechanicId !== null && s.coMechanicId === null && s.status !== "COMPLETED")
                            return (
                              <button
                                key={vehicle.id}
                                type="button"
                                onClick={() => {
                                  if (existingService || waitingForCoMechanic) {
                                    setConfirmVehicle(vehicle)
                                  } else {
                                    setDetailVehicle(vehicle)
                                  }
                                }}
                                disabled={hasActiveVehicle}
                                className={`text-left px-3 py-2.5 flex items-center gap-2 border-b border-r border-slate-100 border-l-4 transition-colors ${hasActiveVehicle ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 cursor-pointer"}`}
                                style={{ borderLeftColor: color }}
                              >
                                <div
                                  className="w-7 h-7 rounded-lg text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: color }}
                                >
                                  #{vehicle.arrivalOrder}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-mono text-[11px] font-bold text-slate-700 truncate">{vehicle.plate} <span className="font-sans font-normal text-slate-500">{vehicle.brand.slice(0,3)}.</span></p>
                                  <p className="text-[10px] text-slate-400 truncate">{vehicle.clientName}</p>
                                </div>
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── Dialog: Detalle de vehículo disponible (solo cuando no tiene servicio) ── */}
      <Dialog open={!!detailVehicle} onOpenChange={o => !o && setDetailVehicle(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-2xl p-0 overflow-hidden">
          {detailVehicle && (
            <>
              <div className="px-5 pt-5 pb-4 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    #{detailVehicle.arrivalOrder}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-base">{detailVehicle.brand} {detailVehicle.model}</p>
                    <p className="font-mono text-sm text-slate-500">{detailVehicle.plate}</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-3">
                {/* Cliente */}
                <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{detailVehicle.clientName}</p>
                      {detailVehicle.clientDNI && <p className="text-[11px] text-slate-400">DNI: {detailVehicle.clientDNI}</p>}
                    </div>
                  </div>
                  {detailVehicle.clientPhone && (
                    <a href={`tel:${detailVehicle.clientPhone}`}
                      className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl font-medium min-h-[40px] shrink-0 transition-colors">
                      <Phone className="w-3.5 h-3.5" />{detailVehicle.clientPhone}
                    </a>
                  )}
                </div>

                {/* Tipo de visita */}
                {detailVehicle.visitType && detailVehicle.visitType !== "general" && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Wrench className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="capitalize font-medium">{detailVehicle.visitType}</span>
                  </div>
                )}

                {/* Hora de ingreso */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {new Date(detailVehicle.entryTime).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>

                {/* Servicio existente o selector */}
                {(() => {
                  const existingService = detailVehicle.services.find(s => s.mechanicId === null)
                  if (existingService) {
                    return (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                        <p className="text-[11px] text-blue-500 font-semibold mb-0.5">Servicio registrado</p>
                        <p className="text-sm font-bold text-blue-800">{existingService.serviceType}</p>
                      </div>
                    )
                  }
                  return (
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Tipo de servicio a realizar <span className="text-red-500">*</span></label>
                      <Select value={takeServiceType} onValueChange={setTakeServiceType}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200">
                          <SelectValue placeholder="Selecciona el servicio" />
                        </SelectTrigger>
                        <SelectContent>
                          {localServiceTypes.map(st => (
                            <SelectItem key={st.id} value={st.name}>{st.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })()}

                <div className="flex gap-2.5 pt-1">
                  <Button variant="outline" onClick={() => setDetailVehicle(null)}
                    className="flex-1 h-11 rounded-xl cursor-pointer" disabled={takeLoading}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      if (!takeServiceType) { toast.error("Selecciona un tipo de servicio"); return }
                      setConfirmVehicle(detailVehicle)
                      setDetailVehicle(null)
                    }}
                    className="flex-[2] h-11 font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer"
                    disabled={takeLoading || !takeServiceType}
                  >
                    <Wrench className="w-4 h-4 mr-1.5" />Tomar este auto
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar tomar auto ── */}
      <Dialog open={!!confirmVehicle} onOpenChange={o => { if (!o) { setConfirmVehicle(null); setTakeServiceType(""); setCoMechanicId("") } }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>¿Tomar este auto?</DialogTitle>
            <DialogDescription>
              {confirmVehicle?.brand} {confirmVehicle?.model} — {confirmVehicle?.plate}
            </DialogDescription>
          </DialogHeader>
          {(() => {
            // ¿Es el 2do mecánico uniéndose como co-mecánico?
            const joiningAsCoMechanic = !!confirmVehicle?.services.find(
              s => s.mechanicId !== null && s.coMechanicId === null && s.status !== "COMPLETED"
            )
            const svcName = confirmVehicle?.services.find(s => s.mechanicId === null)?.serviceType
              ?? confirmVehicle?.services.find(s => s.mechanicId !== null)?.serviceType
              ?? takeServiceType
            return (
          <div className="space-y-4 mt-1">
            <div className={`border rounded-xl px-4 py-3 space-y-1 text-sm ${joiningAsCoMechanic ? "bg-teal-50 border-teal-100" : "bg-blue-50 border-blue-100"}`}>
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente</span>
                <span className="font-medium">{confirmVehicle?.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Servicio</span>
                <span className={`font-semibold ${joiningAsCoMechanic ? "text-teal-700" : "text-blue-700"}`}>{svcName}</span>
              </div>
              {joiningAsCoMechanic && (
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-500">Tu rol</span>
                  <span className="font-semibold text-teal-700">Co-mecánico</span>
                </div>
              )}
            </div>

            {/* Selector de co-mecánico — solo para 1er mecánico en revisión anual */}
            {confirmVehicle?.visitType === "revision" && !joiningAsCoMechanic && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="text-sm font-semibold text-slate-700">¿Con qué compañero trabajarás?</span>
                </div>
                <Select value={coMechanicId} onValueChange={setCoMechanicId}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200">
                    <SelectValue placeholder="Selecciona un co-mecánico (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin co-mecánico</SelectItem>
                    {availableMechanics.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-teal-700 bg-teal-50 rounded-lg px-3 py-1.5">
                  La revisión técnica anual generalmente requiere dos mecánicos.
                </p>
              </div>
            )}

            {joiningAsCoMechanic
              ? <p className="text-xs text-teal-700 bg-teal-50 rounded-xl px-3 py-2 text-center font-medium">Te unirás como co-mecánico a este trabajo de revisión anual.</p>
              : <p className="text-xs text-slate-500 text-center">Este auto aparecerá en "Mis Trabajos" y será de tu responsabilidad.</p>
            }
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => { setConfirmVehicle(null); setTakeServiceType(""); setCoMechanicId("") }}
                className="flex-1 h-11 rounded-xl cursor-pointer" disabled={takeLoading}>
                Cancelar
              </Button>
              <Button
                onClick={() => confirmVehicle && handleTakeVehicle(confirmVehicle.id)}
                className="flex-[2] h-11 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer"
                disabled={takeLoading}
              >
                {takeLoading ? "Tomando..." : "Sí, confirmar"}
              </Button>
            </div>
          </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Completar trabajo ── */}
      <Dialog open={!!confirmId} onOpenChange={(o) => { if (!o) handleCloseCompletion() }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 bg-green-50 shrink-0">
            <DialogTitle className="text-base font-bold text-slate-900">Finalizar Trabajo</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              {serviceToComplete?.vehicle.brand} {serviceToComplete?.vehicle.model} — {serviceToComplete?.serviceType}
            </DialogDescription>
            {/* Indicador de pasos */}
            <div className="flex items-center gap-1.5 mt-2.5">
              <div className={`h-1 flex-1 rounded-full transition-colors ${completionStep === "parts" ? "bg-green-500" : "bg-green-300"}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors ${completionStep === "describe" ? "bg-green-500" : completionStep === "more" ? "bg-green-300" : "bg-slate-200"}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors ${completionStep === "more" ? "bg-green-500" : "bg-slate-200"}`} />
            </div>
          </div>

          {/* Cuerpo scrolleable */}
          <div className="px-4 py-4 space-y-4 overflow-y-auto flex-1">

            {/* ── PASO 1: ¿Usaste repuestos? ── */}
            {completionStep === "parts" && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-base font-bold text-slate-800">¿Usaste repuestos en este trabajo?</p>
                  <p className="text-xs text-slate-500">Selecciona una opción para continuar</p>
                </div>

                {/* Botones Sí / No */}
                {completionUsedParts === null && (
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button"
                      onClick={() => setCompletionUsedParts(true)}
                      className="flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border-2 border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
                      <Package className="w-7 h-7 text-blue-500" />
                      <span className="text-sm font-bold text-slate-700">Sí, usé repuestos</span>
                    </button>
                    <button type="button"
                      onClick={() => { setCompletionUsedParts(false); setCompletionStep("describe") }}
                      className="flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer">
                      <X className="w-7 h-7 text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">No usé repuestos</span>
                    </button>
                  </div>
                )}

                {/* Sección de repuestos cuando eligió Sí */}
                {completionUsedParts === true && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
                        <Package className="w-4 h-4" />
                        Repuestos utilizados
                        {completionItems.length > 0 && (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{completionItems.length}</span>
                        )}
                      </p>
                      <button type="button"
                        onClick={() => { setCompletionUsedParts(null); setCompletionItems([]); setSelectedProduct(null); setProductSearch("") }}
                        className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
                        Cambiar
                      </button>
                    </div>

                    {/* Lista de repuestos agregados */}
                    {completionItems.length > 0 && (
                      <div className="space-y-1.5">
                        {completionItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-blue-50 rounded-lg px-2.5 py-1.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{item.product.name}</p>
                              <p className="text-[10px] text-slate-500 tabular-nums">{item.quantity} {item.product.unit} × S/ {item.unitPrice.toFixed(2)} = <span className="font-semibold text-slate-700">S/ {(item.quantity * item.unitPrice).toFixed(2)}</span></p>
                            </div>
                            <button type="button" onClick={() => setCompletionItems(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Buscador de producto */}
                    {!selectedProduct ? (
                      <div className="space-y-1.5">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar repuesto..."
                            value={productSearch}
                            onChange={async (e) => {
                              setProductSearch(e.target.value)
                              if (products.length === 0) {
                                const prods = await getAllProducts() as Product[]
                                setProducts(prods)
                              }
                            }}
                            className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 transition-colors"
                          />
                        </div>
                        {productSearch && (
                          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                            {filteredProducts.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-3">Sin resultados</p>
                            ) : filteredProducts.map(p => (
                              <button key={p.id} type="button"
                                onClick={() => { setSelectedProduct(p); setItemPrice(String(p.price)); setItemQty("1"); setProductSearch("") }}
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                                <div className="text-left min-w-0">
                                  <p className="text-xs font-medium text-slate-800 truncate">{p.name}</p>
                                  <p className="text-[10px] text-slate-400">Stock: {p.stock} {p.unit}</p>
                                </div>
                                <span className="text-xs font-semibold text-slate-600 tabular-nums shrink-0 ml-2">S/ {Number(p.price).toFixed(2)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-lg px-3 py-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-800 truncate flex-1">{selectedProduct.name}</p>
                          <button type="button" onClick={() => { setSelectedProduct(null); setItemQty("1"); setItemPrice("") }}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0 ml-2">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="space-y-1 flex-1">
                            <label className="text-[10px] font-semibold text-slate-500">Cantidad ({selectedProduct.unit})</label>
                            <Input type="number" min="1" step="1" max={selectedProduct.stock}
                              value={itemQty} onChange={e => setItemQty(e.target.value)}
                              className="h-9 rounded-lg text-sm text-center tabular-nums" />
                            <p className="text-[10px] text-slate-400">Stock disponible: {selectedProduct.stock}</p>
                          </div>
                          <div className="space-y-1 shrink-0 text-right">
                            <label className="text-[10px] font-semibold text-slate-500">Precio unit.</label>
                            <p className="text-sm font-bold text-slate-800 tabular-nums h-9 flex items-center justify-end">S/ {Number(selectedProduct.price).toFixed(2)}</p>
                          </div>
                        </div>
                        <Button type="button" size="sm"
                          onClick={() => {
                            const qty = parseInt(itemQty)
                            const price = Number(selectedProduct.price)
                            if (isNaN(qty) || qty <= 0) { toast.error("Cantidad inválida"); return }
                            if (qty > selectedProduct.stock) { toast.error(`Stock insuficiente (max: ${selectedProduct.stock})`); return }
                            setCompletionItems(prev => [...prev, { product: selectedProduct, quantity: qty, unitPrice: price }])
                            setSelectedProduct(null); setItemQty("1"); setItemPrice("")
                          }}
                          className="w-full h-8 rounded-lg bg-blue-600 hover:bg-blue-700 cursor-pointer text-xs font-semibold">
                          <Plus className="w-3.5 h-3.5 mr-1" />Agregar
                        </Button>
                      </div>
                    )}

                    {/* Repuestos ya guardados anteriormente */}
                    {serviceToComplete && serviceToComplete.items.length > 0 && (
                      <div className="bg-slate-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Ya registrados</p>
                        {serviceToComplete.items.map(item => (
                          <div key={item.id} className="flex justify-between text-xs text-slate-600 py-0.5">
                            <span>{item.product.name} × {item.quantity}</span>
                            <span className="tabular-nums">S/ {item.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── PASO 2: Descripción del trabajo ── */}
            {completionStep === "describe" && (
              <div className="space-y-3">
                {/* Resumen repuestos del paso anterior */}
                {completionUsedParts === true && completionItems.length > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                    <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Repuestos a registrar ({completionItems.length})</p>
                    {completionItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-700 py-0.5">
                        <span>{item.product.name} × {item.quantity}</span>
                        <span className="tabular-nums font-medium">S/ {(item.quantity * item.unitPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {completionUsedParts === false && (
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                    <X className="w-4 h-4 text-slate-400 shrink-0" />
                    <p className="text-xs text-slate-500">Sin repuestos en este trabajo</p>
                    <button type="button" onClick={() => { setCompletionStep("parts"); setCompletionUsedParts(null) }}
                      className="text-xs text-blue-500 hover:underline cursor-pointer ml-auto">Cambiar</button>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    ¿Qué trabajo se realizó? <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    placeholder="Describe el trabajo realizado, observaciones..."
                    value={completionDesc}
                    onChange={(e) => setCompletionDesc(e.target.value)}
                    rows={4}
                    className="rounded-xl text-sm resize-none"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* ── PASO 3: ¿Hay otro servicio pendiente? ── */}
            {completionStep === "more" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-base font-bold text-slate-800">¡Trabajo completado!</p>
                  <p className="text-xs text-slate-500">¿Quedó algún otro servicio pendiente en este auto?</p>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="space-y-1.5">
                    <Select value={completionExtraService} onValueChange={setCompletionExtraService}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200">
                        <SelectValue placeholder="Selecciona el servicio adicional" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map(st => (
                          <SelectItem key={st.id} value={st.name}>{st.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer fijo */}
          <div className="px-4 pb-4 pt-2 flex gap-2.5 shrink-0 border-t border-slate-100">
            {completionStep === "parts" && (
              <>
                <Button onClick={handleCloseCompletion}
                  variant="outline" className="flex-1 h-11 rounded-xl cursor-pointer">
                  Cancelar
                </Button>
                {completionUsedParts === true && (
                  <Button
                    onClick={() => setCompletionStep("describe")}
                    className="flex-[2] h-11 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  >
                    Continuar →
                  </Button>
                )}
              </>
            )}
            {completionStep === "describe" && (
              <>
                <Button onClick={() => { setCompletionStep("parts"); setCompletionUsedParts(completionUsedParts === false ? null : completionUsedParts) }}
                  variant="outline" className="flex-1 h-11 rounded-xl cursor-pointer" disabled={isLoading}>
                  ← Atrás
                </Button>
                <Button
                  onClick={() => confirmId && handleComplete(confirmId)}
                  className="flex-[2] h-11 font-bold rounded-xl bg-green-600 hover:bg-green-700 cursor-pointer"
                  disabled={isLoading || !completionDesc.trim()}
                >
                  {isLoading ? "Guardando..." : "Completar →"}
                </Button>
              </>
            )}
            {completionStep === "more" && (
              <>
                <Button onClick={handleCloseCompletion}
                  variant="outline" className="flex-1 h-11 rounded-xl cursor-pointer" disabled={isLoading}>
                  No, listo
                </Button>
                <Button
                  onClick={handleAddExtraService}
                  className="flex-[2] h-11 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  disabled={isLoading || !completionExtraService}
                >
                  {isLoading ? "Agregando..." : "Sí, agregar servicio"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Nota ── */}
      <Dialog open={!!noteId} onOpenChange={(o) => !o && setNoteId(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Notas del Trabajo</DialogTitle>
            <DialogDescription>{serviceForNote?.serviceType} — {serviceForNote?.vehicle.plate}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea placeholder="Qué se hizo, qué encontraste..." value={noteText}
              onChange={(e) => setNoteText(e.target.value)} rows={4} className="rounded-xl text-base" />
            <Button onClick={() => noteId && handleSaveNote(noteId)}
              className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer"
              disabled={isLoading || !noteText.trim()}>
              {isLoading ? "Guardando..." : "Guardar Nota"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Pasar a otro mecánico ── */}
      <Dialog open={!!handoffServiceId} onOpenChange={(o) => !o && setHandoffServiceId(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Pasar a Otro Mecánico</DialogTitle>
            <DialogDescription>
              {services.find(s => s.id === handoffServiceId)?.vehicle.brand}{" "}
              {services.find(s => s.id === handoffServiceId)?.vehicle.model}
              {" — "}
              {services.find(s => s.id === handoffServiceId)?.serviceType}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">
                Mecánico destino <span className="text-red-500">*</span>
              </label>
              <Select value={handoffToMechanicId} onValueChange={setHandoffToMechanicId}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200">
                  <SelectValue placeholder="Selecciona el mecánico" />
                </SelectTrigger>
                <SelectContent>
                  {handoffMechanics.length === 0 ? (
                    <SelectItem value="__none__" disabled>No hay mecánicos disponibles</SelectItem>
                  ) : (
                    handoffMechanics.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Nota (opcional)</label>
              <Textarea
                placeholder="Indica en qué punto quedó el trabajo..."
                value={handoffNote}
                onChange={(e) => setHandoffNote(e.target.value)}
                rows={3}
                className="rounded-xl text-base"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setHandoffServiceId(null)} variant="outline"
                className="flex-1 h-12 rounded-xl cursor-pointer" disabled={handoffLoading}>Cancelar</Button>
              <Button onClick={handleHandoff}
                className="flex-[2] h-12 font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer"
                disabled={handoffLoading || !handoffToMechanicId}>
                {handoffLoading ? "Transfiriendo..." : "Transferir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Agregar servicio adicional ── */}
      <Dialog open={!!addServiceId} onOpenChange={(o) => !o && setAddServiceId(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Servicio Adicional</DialogTitle>
            <DialogDescription>{serviceForAdd?.vehicle.brand} {serviceForAdd?.vehicle.model} — {serviceForAdd?.vehicle.plate}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Tipo de servicio *</label>
              <Select value={newServiceType} onValueChange={setNewServiceType}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200">
                  <SelectValue placeholder="Selecciona un servicio" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map(st => (
                    <SelectItem key={st.id} value={st.name}>{st.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => serviceForAdd && handleAddService(serviceForAdd.vehicleId)}
              className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer"
              disabled={isLoading || !newServiceType}>
              {isLoading ? "Agregando..." : "Agregar Servicio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Pausar servicio ── */}
      <Dialog open={!!pauseServiceId} onOpenChange={(o) => { if (!o) { setPauseServiceId(null); setPauseReason("") } }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Pausar Servicio</DialogTitle>
            <DialogDescription>{serviceForPause?.serviceType} — {serviceForPause?.vehicle.plate}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
              <PauseCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800">
                El servicio quedará en pausa. Podrás tomar otro auto y luego retomar este trabajo.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Motivo de la pausa <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Ej: Esperando repuesto, falta de herramienta, espera del cliente..."
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                rows={3}
                className="rounded-xl text-base"
                autoFocus
              />
              {!pauseReason.trim() && (
                <p className="text-xs text-red-500">El motivo es obligatorio</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={() => { setPauseServiceId(null); setPauseReason("") }} variant="outline"
                className="flex-1 h-12 rounded-xl cursor-pointer" disabled={pauseLoading}>Cancelar</Button>
              <Button onClick={handlePauseService}
                className="flex-[2] h-12 font-semibold rounded-xl bg-orange-500 hover:bg-orange-600 cursor-pointer"
                disabled={pauseLoading || !pauseReason.trim()}>
                {pauseLoading ? "Pausando..." : "Pausar servicio"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Eliminar servicio (razón obligatoria) ── */}
      <Dialog open={!!deleteServiceId} onOpenChange={(o) => !o && setDeleteServiceId(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Eliminar Servicio</DialogTitle>
            <DialogDescription>{serviceToDelete?.serviceType} — {serviceToDelete?.vehicle.plate}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-800">
                Se eliminará el servicio y se devolverá el stock de los repuestos. Esta acción quedará registrada.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Motivo de eliminación <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Explica por qué se elimina este servicio..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                className="rounded-xl text-base"
                autoFocus
              />
              {!deleteReason.trim() && (
                <p className="text-xs text-red-500">El motivo es obligatorio</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setDeleteServiceId(null)} variant="outline"
                className="flex-1 h-12 rounded-xl cursor-pointer" disabled={deleteLoading}>Cancelar</Button>
              <Button onClick={handleDeleteService}
                className="flex-[2] h-12 font-semibold rounded-xl bg-red-600 hover:bg-red-700 cursor-pointer"
                disabled={deleteLoading || !deleteReason.trim()}>
                {deleteLoading ? "Eliminando..." : "Sí, eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
