"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { addVehicleWithService } from "@/lib/actions/vehicles"
import { createBrand, createModel } from "@/lib/actions/brands"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Car, CheckCircle, ChevronRight, Search, X, ChevronDown, ShoppingBag, Shield, CalendarClock, Plus, Loader2 } from "lucide-react"
import type { Branch, ServiceType } from "@prisma/client"

interface BrandForSelect {
  id: string
  name: string
  models: { id: string; name: string }[]
}

interface VehicleRegistrationClientProps {
  branches: Branch[]
  brands: BrandForSelect[]
  serviceTypes: ServiceType[]
  isAdmin: boolean
  userBranchId: string | null
  userRole?: string
}

type VisitType = "general" | "garantia" | "revision" | "venta"

const VISIT_TYPES: {
  key: VisitType
  label: string
  borderColor: string
  bgColor: string
  textColor: string
  icon: React.FC<{ className?: string }>
}[] = [
  { key: "general",  label: "General",    borderColor: "#16a34a", bgColor: "#f0fdf4", textColor: "#15803d", icon: Car },
  { key: "garantia", label: "Garantía",   borderColor: "#dc2626", bgColor: "#fef2f2", textColor: "#b91c1c", icon: Shield },
  { key: "revision", label: "Anual",      borderColor: "#0d9488", bgColor: "#f0fdfa", textColor: "#0f766e", icon: CalendarClock },
  { key: "venta",    label: "Solo venta", borderColor: "#2563eb", bgColor: "#eff6ff", textColor: "#1d4ed8", icon: ShoppingBag },
]

export function VehicleRegistrationClient({
  branches,
  brands: initialBrands,
  serviceTypes,
  isAdmin,
  userBranchId,
  userRole,
}: VehicleRegistrationClientProps) {
  const defaultBranchId = isAdmin ? branches[0]?.id ?? "" : userBranchId ?? branches[0]?.id ?? ""
  const router = useRouter()

  // ── Lista de marcas (puede crecer con nuevas) ──
  const [brands, setBrands] = useState<BrandForSelect[]>(initialBrands)

  // ── Step ──
  const [step, setStep] = useState<1 | 2>(1)

  // ── Formulario ──
  const [visitType, setVisitType] = useState<VisitType>("general")
  const [formData, setFormData] = useState({
    brandId: "",
    brandName: "",
    modelId: "",
    modelName: "",
    plate: "",
    year: "" as string,
    clientName: "",
    clientPhone: "",
    clientDNI: "",
    branchId: defaultBranchId,
    serviceType: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // ── Selector de servicio ──
  const [serviceSearch, setServiceSearch] = useState("")
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false)

  // ── "Nueva marca" inline ──
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [newBrandLoading, setNewBrandLoading] = useState(false)

  // ── "Nuevo modelo" inline ──
  const [showNewModel, setShowNewModel] = useState(false)
  const [newModelName, setNewModelName] = useState("")
  const [newModelLoading, setNewModelLoading] = useState(false)

  const visibleVisitTypes = VISIT_TYPES

  const isSaleOnly = visitType === "venta"
  const selectedBrand = brands.find((b) => b.id === formData.brandId)
  const availableModels = selectedBrand?.models ?? []
  const filteredServiceTypes = serviceTypes.filter((st) =>
    st.name.toLowerCase().includes(serviceSearch.toLowerCase())
  )
  const activeVisitType = VISIT_TYPES.find(v => v.key === visitType)!

  const clearError = (field: string) =>
    setErrors((p) => { const n = { ...p }; delete n[field]; return n })

  // ── Agregar marca nueva ──
  const handleAddBrand = async () => {
    if (!newBrandName.trim()) return
    setNewBrandLoading(true)
    try {
      const created = await createBrand(newBrandName.trim())
      const newBrand: BrandForSelect = { id: created.id, name: created.name, models: [] }
      setBrands(prev => [...prev, newBrand].sort((a, b) => a.name.localeCompare(b.name)))
      setFormData(p => ({ ...p, brandId: created.id, brandName: created.name, modelId: "", modelName: "" }))
      setShowNewBrand(false)
      setNewBrandName("")
      clearError("brandId")
      toast.success(`Marca "${created.name}" creada`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al crear marca")
    } finally {
      setNewBrandLoading(false)
    }
  }

  // ── Agregar modelo nuevo ──
  const handleAddModel = async () => {
    if (!newModelName.trim() || !formData.brandId) return
    setNewModelLoading(true)
    try {
      const created = await createModel(formData.brandId, newModelName.trim())
      const newModel = { id: created.id, name: created.name }
      setBrands(prev => prev.map(b =>
        b.id === formData.brandId
          ? { ...b, models: [...b.models, newModel].sort((a, b) => a.name.localeCompare(b.name)) }
          : b
      ))
      setFormData(p => ({ ...p, modelId: created.id, modelName: created.name }))
      setShowNewModel(false)
      setNewModelName("")
      clearError("modelId")
      toast.success(`Modelo "${created.name}" creado`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al crear modelo")
    } finally {
      setNewModelLoading(false)
    }
  }

  // ── Validaciones ──
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!isSaleOnly) {
      if (!formData.brandId) newErrors.brandId = "Selecciona una marca"
      if (!formData.modelId) newErrors.modelId = "Selecciona un modelo"
      if (!formData.plate.trim()) newErrors.plate = "Ingresa la placa"
      else if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(formData.plate)) newErrors.plate = "Formato inválido (ej: ABC-123)"
      if (!formData.serviceType) newErrors.serviceType = "Selecciona el tipo de servicio"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!/^\d{8}$/.test(formData.clientDNI)) newErrors.clientDNI = "Debe tener 8 dígitos"
    if (!isSaleOnly) {
      if (!formData.clientName.trim()) newErrors.clientName = "Ingresa el nombre"
      if (!/^\d{9}$/.test(formData.clientPhone)) newErrors.clientPhone = "Debe tener 9 dígitos"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep1()) setStep(2)
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return

    if (!formData.branchId) {
      toast.error("No hay sede asignada. Contacta al administrador.")
      return
    }

    setIsLoading(true)
    try {
      await addVehicleWithService({
        brand: formData.brandName,
        model: formData.modelName,
        plate: formData.plate,
        year: formData.year ? parseInt(formData.year) : undefined,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientDNI: formData.clientDNI,
        branchId: formData.branchId,
        serviceType: formData.serviceType,
        visitType,
      })
      toast.success("Auto registrado exitosamente")
      setFormData({
        brandId: "", brandName: "", modelId: "", modelName: "",
        plate: "", year: "", clientName: "", clientPhone: "", clientDNI: "",
        branchId: defaultBranchId, serviceType: "",
      })
      setServiceSearch("")
      setVisitType("general")
      setStep(1)
      setErrors({})
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido"
      toast.error(`Error al registrar: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">

      {/* Progress bar */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-400 shrink-0">{step} de 2</span>
      </div>

      {/* ══════════════════════════════════════════
          PASO 1 — Vehículo + Servicio + Visita
      ══════════════════════════════════════════ */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">

          {/* Tipo de visita */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Tipo de visita</label>
            <div className={`grid gap-2 ${visibleVisitTypes.length === 4 ? "grid-cols-2" : "grid-cols-3"}`}>
              {visibleVisitTypes.map((vt) => {
                const Icon = vt.icon
                const isSelected = visitType === vt.key
                return (
                  <button
                    key={vt.key}
                    type="button"
                    onClick={() => setVisitType(vt.key)}
                    className="flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 transition-all cursor-pointer"
                    style={
                      isSelected
                        ? { borderColor: vt.borderColor, backgroundColor: vt.bgColor }
                        : { borderColor: "#e2e8f0", backgroundColor: "white" }
                    }
                  >
                    <span style={{ color: isSelected ? vt.borderColor : "#94a3b8" }}>
                      <Icon className="w-5 h-5 shrink-0" />
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: isSelected ? vt.textColor : "#64748b" }}
                    >
                      {vt.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Campos solo si NO es venta */}
          {!isSaleOnly && (
            <>
              {/* Marca */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Marca <span className="text-red-500">*</span>
                </label>
                {!showNewBrand ? (
                  <div className="flex gap-2">
                    <Select
                      value={formData.brandId}
                      onValueChange={(v) => {
                        const brand = brands.find(b => b.id === v)
                        setFormData(p => ({ ...p, brandId: v, brandName: brand?.name ?? "", modelId: "", modelName: "" }))
                        clearError("brandId")
                        setShowNewModel(false)
                      }}
                    >
                      <SelectTrigger className={`flex-1 h-12 rounded-xl border-slate-200 ${errors.brandId ? "border-red-400" : ""}`}>
                        <SelectValue placeholder="Selecciona una marca" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => setShowNewBrand(true)}
                      className="h-12 px-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer shrink-0"
                      title="Agregar nueva marca"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      placeholder="Nombre de la nueva marca"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddBrand(); if (e.key === "Escape") { setShowNewBrand(false); setNewBrandName("") } }}
                      className="flex-1 h-12 rounded-xl border-blue-300 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddBrand}
                      disabled={newBrandLoading || !newBrandName.trim()}
                      className="h-12 px-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer shrink-0 flex items-center"
                    >
                      {newBrandLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewBrand(false); setNewBrandName("") }}
                      className="h-12 px-3 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {errors.brandId && <p className="text-xs text-red-500">{errors.brandId}</p>}
              </div>

              {/* Modelo */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Modelo <span className="text-red-500">*</span>
                </label>
                {!showNewModel ? (
                  <div className="flex gap-2">
                    <Select
                      value={formData.modelId}
                      onValueChange={(v) => {
                        const model = availableModels.find(m => m.id === v)
                        setFormData(p => ({ ...p, modelId: v, modelName: model?.name ?? "" }))
                        clearError("modelId")
                      }}
                      disabled={!formData.brandId}
                    >
                      <SelectTrigger className={`flex-1 h-12 rounded-xl border-slate-200 ${errors.modelId ? "border-red-400" : ""}`}>
                        <SelectValue placeholder={formData.brandId ? "Selecciona un modelo" : "Primero elige la marca"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => setShowNewModel(true)}
                      disabled={!formData.brandId}
                      className="h-12 px-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Agregar nuevo modelo"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      placeholder={`Nuevo modelo para ${formData.brandName}`}
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddModel(); if (e.key === "Escape") { setShowNewModel(false); setNewModelName("") } }}
                      className="flex-1 h-12 rounded-xl border-blue-300 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddModel}
                      disabled={newModelLoading || !newModelName.trim()}
                      className="h-12 px-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer shrink-0 flex items-center"
                    >
                      {newModelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewModel(false); setNewModelName("") }}
                      className="h-12 px-3 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {errors.modelId && <p className="text-xs text-red-500">{errors.modelId}</p>}
              </div>

              {/* Placa + Año */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Placa <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="ABC-123"
                    value={formData.plate}
                    onChange={(e) => {
                      const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                      // Formato peruano: 3 chars + guión + 3 chars (ej: ABC-123 o A1B-234)
                      let formatted = raw
                      if (raw.length > 3) formatted = raw.slice(0, 3) + "-" + raw.slice(3, 6)
                      setFormData((p) => ({ ...p, plate: formatted }))
                      clearError("plate")
                    }}
                    maxLength={7}
                    inputMode="text"
                    autoCapitalize="characters"
                    className={`h-12 rounded-xl border-slate-200 font-mono tracking-widest text-center text-lg ${errors.plate ? "border-red-400" : ""}`}
                  />
                  {errors.plate && <p className="text-xs text-red-500">{errors.plate}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Año <span className="text-slate-400 font-normal text-xs">(opc.)</span>
                  </label>
                  <Input
                    type="number"
                    placeholder={String(new Date().getFullYear())}
                    value={formData.year}
                    onChange={(e) => setFormData((p) => ({ ...p, year: e.target.value }))}
                    className="h-12 rounded-xl border-slate-200"
                    min={1980}
                    max={new Date().getFullYear() + 1}
                  />
                </div>
              </div>

              {/* Tipo de servicio */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Tipo de servicio <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setServiceDialogOpen(true)}
                  className={`w-full h-12 rounded-xl border-2 px-4 flex items-center justify-between transition-colors cursor-pointer text-left ${
                    errors.serviceType
                      ? "border-red-400 bg-red-50"
                      : formData.serviceType
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className={`flex items-center gap-2.5 text-sm ${formData.serviceType ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                    {formData.serviceType && (
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: colorHex(serviceTypes.find(s => s.name === formData.serviceType)?.color) }}
                      />
                    )}
                    {formData.serviceType || "Selecciona el servicio..."}
                  </span>
                  <div className="flex items-center gap-1">
                    {formData.serviceType && (
                      <X
                        className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setFormData(p => ({ ...p, serviceType: "" })); setServiceSearch("") }}
                      />
                    )}
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
                {errors.serviceType && <p className="text-xs text-red-500">{errors.serviceType}</p>}
              </div>

              {/* Sede (solo admin) */}
              {isAdmin && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Sede</label>
                  <Select value={formData.branchId} onValueChange={(v) => setFormData((p) => ({ ...p, branchId: v }))}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200">
                      <SelectValue placeholder="Selecciona sede" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <Button
            onClick={handleNext}
            className="w-full h-12 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            Siguiente <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      )}

      {/* ══════════════════════════════════════════
          PASO 2 — Cliente
      ══════════════════════════════════════════ */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">

          {/* Resumen paso 1 */}
          <div
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
            style={{ backgroundColor: activeVisitType.bgColor, borderColor: activeVisitType.borderColor + "50" }}
          >
            <span style={{ color: activeVisitType.borderColor }}>
              <activeVisitType.icon className="w-5 h-5 shrink-0" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: activeVisitType.textColor }}>
                {!isSaleOnly
                  ? `${formData.brandName} ${formData.modelName} — `
                  : ""
                }
                <span className="font-mono">{formData.plate || activeVisitType.label}</span>
              </p>
              {!isSaleOnly && formData.serviceType && (
                <p className="text-xs text-slate-500 truncate">{formData.serviceType}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setStep(1); setErrors({}) }}
              className="text-xs font-semibold underline cursor-pointer shrink-0"
              style={{ color: activeVisitType.textColor }}
            >
              Editar
            </button>
          </div>

          {/* DNI */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              DNI <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="12345678"
              value={formData.clientDNI}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 8)
                setFormData((p) => ({ ...p, clientDNI: v }))
                clearError("clientDNI")
              }}
              inputMode="numeric"
              className={`h-12 rounded-xl border-slate-200 text-base ${errors.clientDNI ? "border-red-400" : ""}`}
            />
            {errors.clientDNI
              ? <p className="text-xs text-red-500">{errors.clientDNI}</p>
              : <p className="text-xs text-slate-400">{formData.clientDNI.length}/8 dígitos</p>
            }
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Nombre completo
              {!isSaleOnly
                ? <span className="text-red-500"> *</span>
                : <span className="text-slate-400 font-normal text-xs"> (opcional)</span>
              }
            </label>
            <Input
              placeholder="Juan Pérez"
              value={formData.clientName}
              onChange={(e) => {
                setFormData((p) => ({ ...p, clientName: e.target.value }))
                clearError("clientName")
              }}
              className={`h-12 rounded-xl border-slate-200 ${errors.clientName ? "border-red-400" : ""}`}
            />
            {errors.clientName && <p className="text-xs text-red-500">{errors.clientName}</p>}
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Teléfono
              {!isSaleOnly
                ? <span className="text-red-500"> *</span>
                : <span className="text-slate-400 font-normal text-xs"> (opcional)</span>
              }
            </label>
            <Input
              placeholder="987654321"
              value={formData.clientPhone}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 9)
                setFormData((p) => ({ ...p, clientPhone: v }))
                clearError("clientPhone")
              }}
              inputMode="numeric"
              className={`h-12 rounded-xl border-slate-200 ${errors.clientPhone ? "border-red-400" : ""}`}
            />
            {errors.clientPhone
              ? <p className="text-xs text-red-500">{errors.clientPhone}</p>
              : <p className="text-xs text-slate-400">{formData.clientPhone.length}/9 dígitos</p>
            }
          </div>

          {/* Botón final */}
          <Button
            onClick={handleSubmit}
            className="w-full h-12 text-base font-semibold rounded-xl cursor-pointer bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            {isLoading
              ? <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrando...
                </span>
              : <><CheckCircle className="w-5 h-5 mr-2" /> Registrar</>
            }
          </Button>
        </div>
      )}

      {/* ── Dialog: Selector de Tipo de Servicio ── */}
      <Dialog open={serviceDialogOpen} onOpenChange={(o) => { setServiceDialogOpen(o); if (!o) setServiceSearch("") }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-900">Tipo de servicio</DialogTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar servicio..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-3 text-sm rounded-xl border border-slate-200 outline-none focus:border-blue-400 bg-slate-50"
              />
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-3 space-y-1">
            {filteredServiceTypes.length === 0 ? (
              <div className="py-10 text-center">
                <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Sin resultados</p>
              </div>
            ) : (
              filteredServiceTypes.map((st) => {
                const isSelected = formData.serviceType === st.name
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setFormData(p => ({ ...p, serviceType: st.name }))
                      setServiceDialogOpen(false)
                      setServiceSearch("")
                      clearError("serviceType")
                    }}
                    className={`w-full px-4 py-3.5 rounded-xl text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: colorHex(st.color) }}
                    />
                    <span className={`text-sm flex-1 ${isSelected ? "font-semibold text-blue-700" : "font-medium text-slate-800"}`}>
                      {st.name}
                    </span>
                    {isSelected && <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function colorHex(color?: string | null): string {
  const map: Record<string, string> = {
    green: "#16a34a", red: "#dc2626", teal: "#0d9488",
    blue: "#2563eb", purple: "#9333ea", orange: "#ea580c", amber: "#d97706",
  }
  return map[color ?? "green"] ?? map.green
}
