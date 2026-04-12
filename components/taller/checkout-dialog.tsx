"use client"

import { useState } from "react"
import { toast } from "sonner"
import { checkoutVehicle, getVehicleForCheckout } from "@/lib/actions/vehicles"
import { getAllProducts } from "@/lib/actions/products"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle, Minus, Plus, Search, X, Receipt, CreditCard,
  Banknote, ArrowLeftRight, FileText, ChevronDown, ChevronUp, Trash2
} from "lucide-react"
import type { Product } from "@prisma/client"

type ServiceItemDetail = {
  id: string
  quantity: number
  unitPrice: number
  subtotal: number
  discount: number | null
  product: { id: string; name: string; unit: string }
}

type ServiceDetail = {
  id: string
  serviceType: string
  description: string
  mechanic: { id: string; name: string } | null
  coMechanic: { id: string; name: string } | null
  startTime: Date
  completionTime: Date | null
  items: ServiceItemDetail[]
}

type VehicleDetail = {
  id: string
  plate: string
  brand: string
  model: string
  clientName: string
  clientDNI: string
  clientPhone: string
  entryTime: Date
  services: ServiceDetail[]
}

type ServiceState = {
  id: string
  serviceType: string
  mechanic: string
  price: string
  discount: string
  items: ItemState[]
}

type ItemState = {
  id: string
  productId: string
  productName: string
  unit: string
  quantity: string
  unitPrice: string
  discount: string
}

type ExtraItem = {
  tempId: string
  serviceId: string
  productId: string
  productName: string
  unit: string
  quantity: string
  unitPrice: string
  discount: string
}

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { value: "transferencia", label: "Transferencia", icon: ArrowLeftRight },
]

interface CheckoutDialogProps {
  vehicleId: string | null
  vehicleLabel: string
  onClose: () => void
  onSuccess: () => void
}

export function CheckoutDialog({ vehicleId, vehicleLabel, onClose, onSuccess }: CheckoutDialogProps) {
  const [step, setStep] = useState<"loading" | "form">("loading")
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null)
  const [serviceStates, setServiceStates] = useState<ServiceState[]>([])
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([])
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({})

  // Comprobante
  const [voucherType, setVoucherType] = useState("boleta")
  const [clientRuc, setClientRuc] = useState("")
  const [clientBusinessName, setClientBusinessName] = useState("")

  // Pago
  const [paymentMethod1, setPaymentMethod1] = useState("efectivo")
  const [paymentAmount1, setPaymentAmount1] = useState("")
  const [mixedPayment, setMixedPayment] = useState(false)
  const [paymentMethod2, setPaymentMethod2] = useState("tarjeta")
  const [paymentAmount2, setPaymentAmount2] = useState("")

  // Observaciones
  const [notes, setNotes] = useState("")

  // Buscador de productos extra
  const [productSearch, setProductSearch] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [productLoading, setProductLoading] = useState(false)
  const [addingToServiceId, setAddingToServiceId] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)

  // Cargar datos al abrir
  const handleOpen = async (open: boolean) => {
    if (!open) { onClose(); return }
    if (!vehicleId) return
    setStep("loading")
    try {
      const [veh, prods] = await Promise.all([
        getVehicleForCheckout(vehicleId),
        getAllProducts(),
      ])
      if (!veh) { toast.error("No se encontró el vehículo"); onClose(); return }
      setVehicle(veh as VehicleDetail)
      setProducts(prods as Product[])
      // Inicializar estados editables de servicios
      setServiceStates(veh.services.map(svc => ({
        id: svc.id,
        serviceType: svc.serviceType,
        mechanic: [svc.mechanic?.name, svc.coMechanic?.name].filter(Boolean).join(" + "),
        price: svc.price != null ? String(svc.price) : "0",
        discount: "0",
        items: svc.items.map(it => ({
          id: it.id,
          productId: it.product.id,
          productName: it.product.name,
          unit: it.product.unit,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          discount: "0",
        })),
      })))
      setExtraItems([])
      setStep("form")
    } catch {
      toast.error("Error al cargar datos del vehículo")
      onClose()
    }
  }

  // Totales calculados
  const serviceTotals = serviceStates.map(svc => {
    const price = parseFloat(svc.price) || 0
    const disc = parseFloat(svc.discount) || 0
    const itemsTotal = svc.items.reduce((sum, it) => {
      const sub = (parseFloat(it.unitPrice) || 0) * (parseFloat(it.quantity) || 0)
      const itDisc = parseFloat(it.discount) || 0
      return sum + sub - itDisc
    }, 0)
    return price - disc + itemsTotal
  })

  const extrasTotal = extraItems.reduce((sum, ex) => {
    const sub = (parseFloat(ex.unitPrice) || 0) * (parseFloat(ex.quantity) || 0)
    return sum + sub - (parseFloat(ex.discount) || 0)
  }, 0)

  const grandTotal = serviceTotals.reduce((a, b) => a + b, 0) + extrasTotal

  // Búsqueda de productos
  const filteredProducts = products.filter(p =>
    productSearch.trim() &&
    (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.code ?? "").toLowerCase().includes(productSearch.toLowerCase()))
  ).slice(0, 8)

  const handleAddExtra = (product: Product) => {
    if (!addingToServiceId) return
    setExtraItems(prev => [...prev, {
      tempId: Math.random().toString(36).slice(2),
      serviceId: addingToServiceId,
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      quantity: "1",
      unitPrice: String(product.price),
      discount: "0",
    }])
    setProductSearch("")
  }

  const handleConfirm = async () => {
    if (!vehicle) return
    if (!paymentMethod1) { toast.error("Selecciona la forma de pago"); return }
    const amt1 = parseFloat(paymentAmount1)
    if (isNaN(amt1) || amt1 <= 0) { toast.error("Ingresa el monto del pago"); return }
    if (mixedPayment) {
      const amt2 = parseFloat(paymentAmount2)
      if (isNaN(amt2) || amt2 <= 0) { toast.error("Ingresa el monto del segundo pago"); return }
      if (Math.abs(amt1 + amt2 - grandTotal) > 0.01) {
        toast.error(`Los pagos (S/ ${(amt1 + amt2).toFixed(2)}) no suman el total (S/ ${grandTotal.toFixed(2)})`)
        return
      }
    }
    if (voucherType === "factura" && !clientRuc.trim()) { toast.error("Ingresa el RUC para factura"); return }

    setSaving(true)
    try {
      await checkoutVehicle({
        vehicleId: vehicle.id,
        services: serviceStates.map(s => ({
          id: s.id,
          price: parseFloat(s.price) || 0,
          discount: parseFloat(s.discount) || 0,
        })),
        serviceItems: serviceStates.flatMap(s => s.items.map(it => ({
          id: it.id,
          unitPrice: parseFloat(it.unitPrice) || 0,
          quantity: parseFloat(it.quantity) || 0,
          discount: parseFloat(it.discount) || 0,
        }))),
        extraItems: extraItems.map(ex => ({
          serviceId: ex.serviceId,
          productId: ex.productId,
          quantity: parseFloat(ex.quantity) || 1,
          unitPrice: parseFloat(ex.unitPrice) || 0,
          discount: parseFloat(ex.discount) || 0,
        })),
        totalAmount: grandTotal,
        discount: 0,
        voucherType,
        clientRuc: voucherType === "factura" ? clientRuc.trim() : undefined,
        clientBusinessName: voucherType === "factura" ? clientBusinessName.trim() : undefined,
        paymentMethod1,
        paymentAmount1: amt1,
        paymentMethod2: mixedPayment ? paymentMethod2 : undefined,
        paymentAmount2: mixedPayment ? parseFloat(paymentAmount2) : undefined,
        checkoutNotes: notes.trim() || undefined,
      })
      toast.success("Salida registrada correctamente")
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al registrar salida")
    } finally { setSaving(false) }
  }

  const updateService = (id: string, field: keyof ServiceState, value: string) =>
    setServiceStates(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))

  const updateItem = (svcId: string, itemId: string, field: keyof ItemState, value: string) =>
    setServiceStates(prev => prev.map(s => s.id !== svcId ? s : {
      ...s,
      items: s.items.map(it => it.id === itemId ? { ...it, [field]: value } : it)
    }))

  const updateExtra = (tempId: string, field: keyof ExtraItem, value: string) =>
    setExtraItems(prev => prev.map(ex => ex.tempId === tempId ? { ...ex, [field]: value } : ex))

  return (
    <Dialog open={!!vehicleId} onOpenChange={handleOpen}>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-2xl rounded-2xl p-0 overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 shrink-0">
          <DialogTitle className="text-white font-bold text-lg">Cobro y Salida</DialogTitle>
          <DialogDescription className="text-slate-300 text-sm mt-0.5">{vehicleLabel}</DialogDescription>
        </div>

        {step === "loading" ? (
          <div className="flex-1 flex items-center justify-center py-20 text-slate-400 text-sm">Cargando...</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">

              {/* ── Servicios ── */}
              <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Servicios realizados</h3>
                <div className="space-y-2">
                  {serviceStates.map((svc, i) => {
                    const expanded = expandedServices[svc.id] ?? true
                    const svcNet = (parseFloat(svc.price) || 0) - (parseFloat(svc.discount) || 0)
                    return (
                      <div key={svc.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        {/* Cabecera del servicio */}
                        <button
                          type="button"
                          onClick={() => setExpandedServices(p => ({ ...p, [svc.id]: !expanded }))}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                            <span className="font-semibold text-sm text-slate-800 truncate">{svc.serviceType}</span>
                            {svc.mechanic && <span className="text-[10px] text-slate-400 truncate hidden sm:block">— {svc.mechanic}</span>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold text-slate-700">S/ {svcNet.toFixed(2)}</span>
                            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </button>

                        {expanded && (
                          <div className="px-3 pb-3 pt-2 space-y-3 bg-white">
                            {/* Precio + descuento del servicio */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Precio servicio</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">S/</span>
                                  <Input value={svc.price} onChange={e => updateService(svc.id, "price", e.target.value)}
                                    type="number" min="0" step="0.50"
                                    className="h-9 pl-8 rounded-lg text-sm" />
                                </div>
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Descuento</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">S/</span>
                                  <Input value={svc.discount} onChange={e => updateService(svc.id, "discount", e.target.value)}
                                    type="number" min="0" step="0.50"
                                    className="h-9 pl-8 rounded-lg text-sm" />
                                </div>
                              </div>
                            </div>

                            {/* Repuestos del servicio */}
                            {svc.items.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Repuestos usados</p>
                                <div className="space-y-1.5">
                                  {svc.items.map(it => (
                                    <div key={it.id} className="bg-slate-50 rounded-lg px-2.5 py-2 space-y-1.5">
                                      <p className="text-xs font-semibold text-slate-700">{it.productName} <span className="font-normal text-slate-400">({it.unit})</span></p>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                        <div>
                                          <label className="text-[10px] text-slate-400">Cant.</label>
                                          <Input value={it.quantity} onChange={e => updateItem(svc.id, it.id, "quantity", e.target.value)}
                                            type="number" min="0.01" step="1"
                                            className="h-8 text-xs rounded-lg px-2" />
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-slate-400">P. unit.</label>
                                          <div className="relative">
                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">S/</span>
                                            <Input value={it.unitPrice} onChange={e => updateItem(svc.id, it.id, "unitPrice", e.target.value)}
                                              type="number" min="0" step="0.50"
                                              className="h-8 text-xs rounded-lg pl-6 pr-2" />
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-slate-400">Desc.</label>
                                          <div className="relative">
                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">S/</span>
                                            <Input value={it.discount} onChange={e => updateItem(svc.id, it.id, "discount", e.target.value)}
                                              type="number" min="0" step="0.50"
                                              className="h-8 text-xs rounded-lg pl-6 pr-2" />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Extras agregados a este servicio */}
                            {extraItems.filter(ex => ex.serviceId === svc.id).map(ex => (
                              <div key={ex.tempId} className="bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-2 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-blue-800">{ex.productName} <span className="font-normal text-blue-500">(extra)</span></p>
                                  <button onClick={() => setExtraItems(p => p.filter(e => e.tempId !== ex.tempId))}
                                    className="text-red-400 hover:text-red-600 cursor-pointer" aria-label="Quitar">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <div>
                                    <label className="text-[10px] text-slate-400">Cant.</label>
                                    <Input value={ex.quantity} onChange={e => updateExtra(ex.tempId, "quantity", e.target.value)}
                                      type="number" min="1" className="h-8 text-xs rounded-lg px-2" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400">P. unit.</label>
                                    <div className="relative">
                                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">S/</span>
                                      <Input value={ex.unitPrice} onChange={e => updateExtra(ex.tempId, "unitPrice", e.target.value)}
                                        type="number" min="0" className="h-8 text-xs rounded-lg pl-6 pr-2" />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400">Desc.</label>
                                    <div className="relative">
                                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">S/</span>
                                      <Input value={ex.discount} onChange={e => updateExtra(ex.tempId, "discount", e.target.value)}
                                        type="number" min="0" className="h-8 text-xs rounded-lg pl-6 pr-2" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Agregar repuesto extra */}
                            {addingToServiceId === svc.id ? (
                              <div className="space-y-1.5">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                  <Input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                    placeholder="Buscar repuesto o producto..."
                                    className="h-9 pl-9 text-sm rounded-lg" autoFocus />
                                  <button onClick={() => { setAddingToServiceId(null); setProductSearch("") }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer" aria-label="Cerrar">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {filteredProducts.length > 0 && (
                                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    {filteredProducts.map(p => (
                                      <button key={p.id} type="button" onClick={() => handleAddExtra(p)}
                                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 text-left cursor-pointer border-b border-slate-100 last:border-0 transition-colors">
                                        <div>
                                          <p className="text-xs font-semibold text-slate-800">{p.name}</p>
                                          <p className="text-[10px] text-slate-400">{p.unit} · stock: {p.stock}</p>
                                        </div>
                                        <span className="text-xs font-bold text-blue-600">S/ {p.price.toFixed(2)}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button type="button"
                                onClick={() => setAddingToServiceId(svc.id)}
                                className="w-full h-8 rounded-lg border border-dashed border-blue-300 text-blue-600 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-blue-50 transition-colors cursor-pointer">
                                <Plus className="w-3.5 h-3.5" />Agregar repuesto extra
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* ── Total ── */}
              <section className="bg-slate-800 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Total a cobrar</span>
                  <span className="text-white text-2xl font-bold">S/ {grandTotal.toFixed(2)}</span>
                </div>
              </section>

              {/* ── Comprobante ── */}
              <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Comprobante</h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { value: "boleta", label: "Boleta" },
                    { value: "factura", label: "Factura" },
                    { value: "ninguno", label: "Ninguno" },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setVoucherType(opt.value)}
                      className={`h-10 rounded-xl text-sm font-semibold border-2 transition-colors cursor-pointer ${
                        voucherType === opt.value
                          ? "border-slate-700 bg-slate-700 text-white"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {voucherType === "boleta" && (
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-sm text-slate-600">
                    <span className="font-medium">DNI:</span> {vehicle?.clientDNI} — {vehicle?.clientName}
                  </div>
                )}
                {voucherType === "factura" && (
                  <div className="space-y-2">
                    <Input value={clientRuc} onChange={e => setClientRuc(e.target.value)}
                      placeholder="RUC *" maxLength={11} className="h-10 rounded-xl" />
                    <Input value={clientBusinessName} onChange={e => setClientBusinessName(e.target.value)}
                      placeholder="Razón social" className="h-10 rounded-xl" />
                  </div>
                )}
              </section>

              {/* ── Forma de pago ── */}
              <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Forma de pago</h3>
                <div className="space-y-3">
                  {/* Pago 1 */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex gap-1.5 flex-1">
                      {PAYMENT_METHODS.map(m => (
                        <button key={m.value} type="button" onClick={() => setPaymentMethod1(m.value)}
                          className={`flex-1 h-10 rounded-xl text-xs font-semibold border-2 flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                            paymentMethod1 === m.value
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}>
                          <m.icon className="w-3.5 h-3.5" />{m.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative w-full sm:w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">S/</span>
                      <Input value={paymentAmount1} onChange={e => setPaymentAmount1(e.target.value)}
                        type="number" min="0" step="0.50" placeholder={grandTotal.toFixed(2)}
                        className="h-10 pl-8 rounded-xl text-sm" />
                    </div>
                  </div>

                  {/* Toggle pago mixto */}
                  <button type="button" onClick={() => { setMixedPayment(p => !p); setPaymentAmount2("") }}
                    className={`w-full h-10 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      mixedPayment ? "border-blue-200 bg-blue-50 text-blue-700" : "border-dashed border-slate-300 text-slate-500 hover:bg-slate-50"
                    }`}>
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    {mixedPayment ? "Quitar pago mixto" : "Agregar segundo método de pago"}
                  </button>

                  {/* Pago 2 */}
                  {mixedPayment && (
                    <div className="flex gap-2">
                      <div className="flex gap-1.5 flex-1">
                        {PAYMENT_METHODS.filter(m => m.value !== paymentMethod1).map(m => (
                          <button key={m.value} type="button" onClick={() => setPaymentMethod2(m.value)}
                            className={`flex-1 h-10 rounded-xl text-xs font-semibold border-2 flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                              paymentMethod2 === m.value
                                ? "border-purple-600 bg-purple-600 text-white"
                                : "border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}>
                            <m.icon className="w-3.5 h-3.5" />{m.label}
                          </button>
                        ))}
                      </div>
                      <div className="relative w-28">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">S/</span>
                        <Input value={paymentAmount2} onChange={e => setPaymentAmount2(e.target.value)}
                          type="number" min="0" step="0.50" placeholder="0.00"
                          className="h-10 pl-8 rounded-xl text-sm" />
                      </div>
                    </div>
                  )}

                  {/* Verificación montos mixtos */}
                  {mixedPayment && paymentAmount1 && paymentAmount2 && (
                    <div className={`text-xs px-3 py-2 rounded-xl ${
                      Math.abs((parseFloat(paymentAmount1)||0) + (parseFloat(paymentAmount2)||0) - grandTotal) <= 0.01
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}>
                      Suma pagos: S/ {((parseFloat(paymentAmount1)||0) + (parseFloat(paymentAmount2)||0)).toFixed(2)} / Total: S/ {grandTotal.toFixed(2)}
                    </div>
                  )}
                </div>
              </section>

              {/* ── Observaciones ── */}
              <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Observaciones</h3>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Notas adicionales (opcional)..."
                  rows={2} className="rounded-xl text-sm resize-none" />
              </section>
            </div>
          </div>
        )}

        {/* Footer */}
        {step === "form" && (
          <div className="shrink-0 px-4 py-3 border-t border-slate-100 flex gap-2.5 bg-white">
            <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl cursor-pointer" disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={saving}
              className="flex-[2] h-12 font-bold rounded-xl bg-green-600 hover:bg-green-700 cursor-pointer">
              <CheckCircle className="w-4 h-4 mr-2" />
              {saving ? "Registrando..." : `Confirmar cobro · S/ ${grandTotal.toFixed(2)}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
