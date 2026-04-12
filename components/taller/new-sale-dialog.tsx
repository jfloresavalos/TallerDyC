"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { toast } from "sonner"
import { createSale } from "@/lib/actions/sales"
import { getProducts } from "@/lib/actions/products"
import { searchClientQuick } from "@/lib/actions/clients"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Trash2, ShoppingCart, Plus, Minus, Loader2, Package, Check, UserSearch } from "lucide-react"
import type { Branch, Product } from "@prisma/client"

type ClientSuggestion = { clientDNI: string; clientName: string; clientPhone: string }

interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
}

interface NewSaleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branches: Branch[]
  userId: string
  onSaleCreated: () => void
}

export function NewSaleDialog({ open, onOpenChange, branches, userId, onSaleCreated }: NewSaleDialogProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Product[]>([])
  // Producto seleccionado actualmente para editar antes de agregar al carrito
  const [selected, setSelected] = useState<Product | null>(null)
  const [pendingQty, setPendingQty] = useState(1)
  const [pendingPrice, setPendingPrice] = useState(0)
  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "")
  const [clientName, setClientName] = useState("")
  const [clientDNI, setClientDNI] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientSearch, setClientSearch] = useState("")
  const [clientSuggestions, setClientSuggestions] = useState<ClientSuggestion[]>([])
  const [clientMode, setClientMode] = useState<"search" | "manual" | "filled">("search")
  const [clientSearchPending, startClientSearch] = useTransition()
  const clientDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [payMethod1, setPayMethod1] = useState("efectivo")
  const [payAmount1, setPayAmount1] = useState<string>("")
  const [payMethod2, setPayMethod2] = useState("")
  const [payAmount2, setPayAmount2] = useState<string>("")
  const [step, setStep] = useState<"products" | "confirm">("products")
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setCart([])
      setSearch("")
      setResults([])
      setSelected(null)
      setClientName("")
      setClientDNI("")
      setClientPhone("")
      setClientSearch("")
      setClientSuggestions([])
      setClientMode("search")
      setPayMethod1("efectivo")
      setPayAmount1("")
      setPayMethod2("")
      setPayAmount2("")
      setStep("products")
      if (branches[0]) setBranchId(branches[0].id)
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [open, branches])

  const doSearch = (q: string, bid: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const found = await getProducts(bid || undefined, q.trim())
        setResults(found)
      })
    }, 300)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setSelected(null) // limpiar selección al escribir de nuevo
    doSearch(value, branchId)
  }

  const handleBranchChange = (id: string) => {
    setBranchId(id)
    doSearch(search, id)
  }

  // Seleccionar producto de la lista → mostrar editor inline
  const handleSelect = (product: Product) => {
    // Si ya está en el carrito, precarga sus valores actuales
    const existing = cart.find(i => i.product.id === product.id)
    setSelected(product)
    setPendingQty(existing ? existing.quantity : 1)
    setPendingPrice(existing ? existing.unitPrice : product.price)
    setResults([])
    setSearch("")
    // Focus en cantidad
    setTimeout(() => qtyRef.current?.focus(), 80)
  }

  // Confirmar el producto seleccionado y agregarlo/actualizarlo en carrito
  const confirmSelected = () => {
    if (!selected || pendingQty <= 0) return
    const qty = Math.min(pendingQty, selected.stock)
    setCart(prev => {
      const existing = prev.find(i => i.product.id === selected.id)
      if (existing) {
        return prev.map(i => i.product.id === selected.id
          ? { ...i, quantity: qty, unitPrice: pendingPrice }
          : i
        )
      }
      return [...prev, { product: selected, quantity: qty, unitPrice: pendingPrice }]
    })
    // Limpiar y volver a buscador
    setSelected(null)
    setSearch("")
    setResults([])
    setTimeout(() => searchRef.current?.focus(), 80)
  }

  const cancelSelected = () => {
    setSelected(null)
    setSearch("")
    setResults([])
    setTimeout(() => searchRef.current?.focus(), 80)
  }

  const removeFromCart = (productId: string) =>
    setCart(prev => prev.filter(i => i.product.id !== productId))

  const editCartItem = (item: CartItem) => {
    setSelected(item.product)
    setPendingQty(item.quantity)
    setPendingPrice(item.unitPrice)
    setSearch("")
    setResults([])
    setTimeout(() => qtyRef.current?.focus(), 80)
  }

  const total = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0)

  const handleClientSearchChange = (value: string) => {
    setClientSearch(value)
    if (clientDebounceRef.current) clearTimeout(clientDebounceRef.current)
    if (value.trim().length < 2) { setClientSuggestions([]); return }
    clientDebounceRef.current = setTimeout(() => {
      startClientSearch(async () => {
        const results = await searchClientQuick(value.trim())
        setClientSuggestions(results)
      })
    }, 300)
  }

  const applyClientSuggestion = (c: ClientSuggestion) => {
    setClientName(c.clientName)
    setClientDNI(c.clientDNI)
    setClientPhone(c.clientPhone)
    setClientSearch("")
    setClientSuggestions([])
    setClientMode("filled")
  }

  const switchToManual = () => {
    // Pre-cargar el DNI si la búsqueda es numérica
    if (clientSearch.match(/^\d+$/)) setClientDNI(clientSearch)
    setClientSuggestions([])
    setClientMode("manual")
  }

  const clearClient = () => {
    setClientName("")
    setClientDNI("")
    setClientPhone("")
    setClientSearch("")
    setClientSuggestions([])
    setClientMode("search")
  }

  const PAYMENT_METHODS = [
    { value: "efectivo",      label: "Efectivo" },
    { value: "yape",          label: "Yape" },
    { value: "plin",          label: "Plin" },
    { value: "tarjeta",       label: "Tarjeta" },
    { value: "transferencia", label: "Transferencia" },
  ]

  const pay1 = parseFloat(payAmount1) || 0
  const pay2 = parseFloat(payAmount2) || 0
  const isMixed = !!payMethod2
  const paySum = isMixed ? pay1 + pay2 : pay1

  // En modo mixto: ambos montos requeridos y deben sumar el total
  const payError: string | null = isMixed
    ? (!payAmount1 || !payAmount2)
      ? "Debes ingresar el monto de ambos métodos de pago"
      : Math.abs(paySum - total) > 0.01
        ? `Los montos suman S/ ${paySum.toFixed(2)}, debe ser S/ ${total.toFixed(2)}`
        : null
    : null

  const handleConfirm = async () => {
    if (!branchId || cart.length === 0) return
    if (payError) return
    // Validación extra: en modo mixto ambos montos deben estar completos
    if (isMixed && (!payAmount1.trim() || !payAmount2.trim())) return
    setIsLoading(true)
    try {
      await createSale({
        clientName: clientName.trim() || "Clientes varios",
        clientDNI: clientDNI || undefined,
        clientPhone: clientPhone || undefined,
        paymentMethod1: payMethod1,
        paymentAmount1: isMixed ? pay1 : total,
        paymentMethod2: payMethod2 || undefined,
        paymentAmount2: isMixed ? pay2 : undefined,
        branchId,
        createdById: userId,
        items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, unitPrice: i.unitPrice })),
      })
      toast.success("Venta registrada correctamente")
      onSaleCreated()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al crear la venta"
      toast.error(msg)
    } finally { setIsLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[92vh] flex flex-col rounded-2xl p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle>Nueva Venta</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-5 pb-3 shrink-0">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => { setStep("products"); setSelected(null) }}
              className={`flex-1 h-9 rounded-lg text-sm font-medium cursor-pointer transition-colors ${step === "products" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
            >
              Productos {cart.length > 0 && (
                <span className="ml-1 bg-blue-600 text-white text-xs px-1.5 rounded-full">{cart.length}</span>
              )}
            </button>
            <button
              onClick={() => cart.length > 0 && setStep("confirm")}
              className={`flex-1 h-9 rounded-lg text-sm font-medium cursor-pointer transition-colors ${step === "confirm" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"} ${cart.length === 0 ? "opacity-40" : ""}`}
            >
              Confirmar
            </button>
          </div>
        </div>

        {/* ── PASO 1 ── */}
        {step === "products" && (
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3 min-h-0">

            {/* Sede */}
            {branches.length > 1 && (
              <Select value={branchId} onValueChange={handleBranchChange}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Sede" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {/* ── Editor de producto seleccionado ── */}
            {selected ? (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 space-y-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{selected.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selected.brand && (
                      <span className="text-xs bg-slate-800 text-white px-1.5 py-0.5 rounded-full">{selected.brand}</span>
                    )}
                    <span className="text-xs text-slate-500">Stock disponible: {selected.stock} {selected.unit}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1 font-medium">Cantidad</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPendingQty(q => Math.max(1, q - 1))}
                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <Input
                        ref={qtyRef}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max={selected.stock}
                        value={pendingQty}
                        onChange={e => setPendingQty(parseInt(e.target.value) || 1)}
                        onKeyDown={e => e.key === "Enter" && confirmSelected()}
                        className="h-9 rounded-xl text-center font-bold flex-1 p-0"
                      />
                      <button
                        onClick={() => setPendingQty(q => Math.min(selected.stock, q + 1))}
                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1 font-medium">Precio unit.</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">S/</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.50"
                        value={pendingPrice}
                        onChange={e => setPendingPrice(parseFloat(e.target.value) || 0)}
                        onKeyDown={e => e.key === "Enter" && confirmSelected()}
                        className="h-9 rounded-xl pl-8"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-sm font-bold text-green-600 text-right">
                  Subtotal: S/ {(pendingQty * pendingPrice).toFixed(2)}
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={cancelSelected}
                    className="flex-1 h-10 rounded-xl cursor-pointer text-sm"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmSelected}
                    className="flex-[2] h-10 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer font-semibold text-sm"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    {cart.find(i => i.product.id === selected.id) ? "Actualizar" : "Agregar al carrito"}
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Buscador (visible cuando no hay selección) ── */
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    ref={searchRef}
                    value={search}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder="Nombre, marca o código..."
                    className="h-11 pl-9 pr-9 rounded-xl"
                  />
                  {isPending && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                  )}
                </div>

                {/* Hint vacío */}
                {search.trim().length < 2 && !isPending && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                      <Package className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">Escribe para buscar un producto</p>
                  </div>
                )}

                {/* Sin resultados */}
                {search.trim().length >= 2 && !isPending && results.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">
                    Sin resultados para &ldquo;{search}&rdquo;
                  </p>
                )}

                {/* Lista de resultados */}
                {results.length > 0 && (
                  <div className="space-y-1.5">
                    {results.map(p => {
                      const outOfStock = p.stock === 0
                      const inCart = cart.find(i => i.product.id === p.id)
                      return (
                        <button
                          key={p.id}
                          onClick={() => !outOfStock && handleSelect(p)}
                          disabled={outOfStock}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                            outOfStock  ? "opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed" :
                            inCart      ? "bg-green-50 border-green-300" :
                            "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {p.brand && (
                                <span className="text-xs bg-slate-800 text-white px-1.5 py-0.5 rounded-full leading-none">{p.brand}</span>
                              )}
                              <span className="text-xs text-slate-500">Stock: {p.stock}</span>
                              <span className="text-xs font-bold text-green-600">S/ {p.price.toFixed(2)}</span>
                            </div>
                          </div>
                          {inCart ? (
                            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-lg shrink-0 ml-2">
                              ×{inCart.quantity}
                            </span>
                          ) : (
                            <Plus className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Carrito compacto ── */}
            {cart.length > 0 && !selected && (
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Carrito · {cart.length} {cart.length === 1 ? "producto" : "productos"}
                </p>
                <div className="space-y-1.5">
                  {cart.map(item => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{item.product.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.quantity} × S/ {item.unitPrice.toFixed(2)}
                          <span className="font-bold text-green-600 ml-1">= S/ {(item.quantity * item.unitPrice).toFixed(2)}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => editCartItem(item)}
                        className="text-xs text-blue-600 hover:underline cursor-pointer shrink-0 font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-400 hover:text-red-600 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between bg-slate-900 text-white rounded-xl px-4 py-3">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold">S/ {total.toFixed(2)}</span>
                </div>
                <Button
                  onClick={() => setStep("confirm")}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer font-semibold"
                >
                  Continuar →
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── PASO 2: CONFIRMAR ── */}
        {step === "confirm" && (
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4 min-h-0">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-700">Resumen</p>
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-slate-600 truncate flex-1 mr-2">{item.product.name} × {item.quantity}</span>
                  <span className="font-semibold shrink-0">S/ {(item.quantity * item.unitPrice).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                <span>Total</span>
                <span className="text-green-600 text-lg">S/ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Cliente (opcional)</p>

              {/* ── MODO: buscar ── */}
              {clientMode === "search" && (
                <div className="space-y-2">
                <div className="relative">
                  <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={clientSearch}
                    onChange={e => handleClientSearchChange(e.target.value)}
                    placeholder="Buscar por DNI o nombre..."
                    className="h-11 pl-9 pr-9 rounded-xl"
                  />
                  {clientSearchPending && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                  )}
                  {/* Sugerencias */}
                  {clientSuggestions.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      {clientSuggestions.map(c => (
                        <button
                          key={c.clientDNI}
                          onMouseDown={e => { e.preventDefault(); applyClientSuggestion(c) }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer text-left transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{c.clientName}</p>
                            <p className="text-xs text-slate-500">DNI: {c.clientDNI} · {c.clientPhone}</p>
                          </div>
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                  {/* No encontrado → botón "Agregar nuevo" */}
                  {clientSearch.trim().length >= 2 && !clientSearchPending && clientSuggestions.length === 0 && (
                    <div className="mt-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-amber-800">No encontrado para &ldquo;{clientSearch}&rdquo;</p>
                      <button
                        onMouseDown={e => { e.preventDefault(); switchToManual() }}
                        className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer shrink-0 ml-2"
                      >
                        + Agregar nuevo
                      </button>
                    </div>
                  )}
                </div>
                {/* Acceso rápido: sin cliente */}
                {!clientSearch && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Acceso rápido:</span>
                    <button
                      onMouseDown={e => { e.preventDefault(); setClientName("Varios"); setClientMode("filled") }}
                      className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Clientes varios
                    </button>
                  </div>
                )}
                </div>
              )}

              {/* ── MODO: ingresar manualmente ── */}
              {clientMode === "manual" && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Nuevo cliente</p>
                    <button onClick={clearClient} className="text-xs text-slate-400 hover:text-red-500 cursor-pointer">Cancelar</button>
                  </div>
                  <Input
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Nombre completo *"
                    className="h-10 rounded-xl bg-white"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={clientDNI} onChange={e => setClientDNI(e.target.value)} placeholder="DNI" inputMode="numeric" className="h-10 rounded-xl bg-white" />
                    <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Teléfono" inputMode="tel" className="h-10 rounded-xl bg-white" />
                  </div>
                  <button
                    onClick={() => { if (clientName.trim()) setClientMode("filled") }}
                    className={`w-full h-9 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${clientName.trim() ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                    disabled={!clientName.trim()}
                  >
                    <Check className="w-4 h-4 inline mr-1.5" />
                    Confirmar cliente
                  </button>
                </div>
              )}

              {/* ── MODO: cliente confirmado ── */}
              {clientMode === "filled" && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Cliente</p>
                    <button onClick={clearClient} className="text-xs text-slate-400 hover:text-red-500 cursor-pointer">Cambiar</button>
                  </div>
                  <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre" className="h-10 rounded-xl bg-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={clientDNI} onChange={e => setClientDNI(e.target.value)} placeholder="DNI" inputMode="numeric" className="h-10 rounded-xl bg-white" />
                    <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Teléfono" inputMode="tel" className="h-10 rounded-xl bg-white" />
                  </div>
                </div>
              )}
            </div>

            {/* ── Forma de pago ── */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Forma de pago</p>

              {/* Método 1 */}
              <div className="grid grid-cols-2 gap-2">
                <Select value={payMethod1} onValueChange={v => { setPayMethod1(v); setPayAmount1("") }}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.filter(m => m.value !== payMethod2).map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">S/</span>
                  {isMixed ? (
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.50"
                      value={payAmount1}
                      onChange={e => setPayAmount1(e.target.value)}
                      placeholder="Monto 1"
                      className="h-11 rounded-xl pl-8"
                    />
                  ) : (
                    <div className="h-11 rounded-xl pl-8 pr-3 bg-slate-100 border border-slate-200 flex items-center text-sm font-semibold text-slate-700 select-none">
                      {total.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Botón agregar segundo método / segundo método */}
              {!payMethod2 ? (
                <button
                  onClick={() => setPayMethod2("yape")}
                  className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
                >
                  + Agregar segundo método de pago
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Select value={payMethod2} onValueChange={setPayMethod2}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.filter(m => m.value !== payMethod1).map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">S/</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.50"
                        value={payAmount2}
                        onChange={e => setPayAmount2(e.target.value)}
                        placeholder="Monto 2"
                        className="h-11 rounded-xl pl-8"
                      />
                    </div>
                    <button
                      onClick={() => { setPayMethod2(""); setPayAmount2(""); setPayAmount1("") }}
                      className="w-11 h-11 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Error de suma */}
              {payError && (
                <p className="text-xs text-red-600 font-medium">{payError}</p>
              )}

              {/* Resumen de pago */}
              {isMixed && pay1 > 0 && pay2 > 0 && !payError && (
                <p className="text-xs text-green-700 font-medium">
                  {PAYMENT_METHODS.find(m => m.value === payMethod1)?.label} S/ {pay1.toFixed(2)} +{" "}
                  {PAYMENT_METHODS.find(m => m.value === payMethod2)?.label} S/ {pay2.toFixed(2)}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("products")} className="flex-1 h-14 rounded-xl cursor-pointer" disabled={isLoading}>
                Volver
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-[2] h-14 rounded-xl bg-green-600 hover:bg-green-700 cursor-pointer font-bold text-base"
                disabled={isLoading || !!payError}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {isLoading ? "Procesando..." : `Cobrar S/ ${total.toFixed(2)}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
