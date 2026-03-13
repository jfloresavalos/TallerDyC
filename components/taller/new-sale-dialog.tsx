"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { createSale } from "@/lib/actions/sales"
import { getAllProducts } from "@/lib/actions/products"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Trash2, ShoppingCart } from "lucide-react"
import type { Branch, Product } from "@prisma/client"

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
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "")
  const [clientName, setClientName] = useState("")
  const [clientDNI, setClientDNI] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [step, setStep] = useState<"products" | "confirm">("products")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      getAllProducts().then(setProducts)
      setCart([])
      setSearch("")
      setClientName("")
      setClientDNI("")
      setClientPhone("")
      setStep("products")
      if (branches[0]) setBranchId(branches[0].id)
    }
  }, [open, branches])

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.code?.toLowerCase().includes(search.toLowerCase()))
  )

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1, unitPrice: product.price }]
    })
  }

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(i => i.product.id !== productId))

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeFromCart(productId); return }
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i))
  }

  const updatePrice = (productId: string, price: number) => {
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, unitPrice: price } : i))
  }

  const total = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0)

  const handleConfirm = async () => {
    if (!branchId || cart.length === 0) return
    setIsLoading(true)
    try {
      await createSale({
        clientName: clientName || undefined,
        clientDNI: clientDNI || undefined,
        clientPhone: clientPhone || undefined,
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
      <DialogContent className="max-w-[calc(100vw-2rem)] max-h-[92vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Venta</DialogTitle>
        </DialogHeader>

        {/* Step tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setStep("products")}
            className={`flex-1 h-9 rounded-lg text-sm font-medium cursor-pointer transition-colors ${step === "products" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
          >Productos {cart.length > 0 && <span className="ml-1 bg-blue-600 text-white text-xs px-1.5 rounded-full">{cart.length}</span>}</button>
          <button
            onClick={() => cart.length > 0 && setStep("confirm")}
            className={`flex-1 h-9 rounded-lg text-sm font-medium cursor-pointer transition-colors ${step === "confirm" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"} ${cart.length === 0 ? "opacity-40" : ""}`}
          >Confirmar</button>
        </div>

        {step === "products" && (
          <div className="space-y-3">
            {/* Sede */}
            {branches.length > 1 && (
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Sede" /></SelectTrigger>
                <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..." className="h-11 pl-9 rounded-xl" />
            </div>

            {/* Products list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Sin productos</p>
              ) : filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock === 0}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                    p.stock === 0 ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-200" :
                    cart.find(i => i.product.id === p.id) ? "bg-blue-50 border-blue-200" :
                    "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">Stock: {p.stock} {p.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">S/ {p.price.toFixed(2)}</p>
                    <Plus className="w-4 h-4 text-blue-600 ml-auto mt-0.5" />
                  </div>
                </button>
              ))}
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Carrito</p>
                {cart.map(item => (
                  <div key={item.product.id} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-slate-800 flex-1 truncate">{item.product.name}</p>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 hover:text-red-700 cursor-pointer p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Cantidad</p>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max={item.product.stock}
                          value={item.quantity}
                          onChange={e => updateQty(item.product.id, parseInt(e.target.value) || 0)}
                          className="h-11 rounded-xl text-center"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Precio unit.</p>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">S/.</span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.50"
                            value={item.unitPrice}
                            onChange={e => updatePrice(item.product.id, parseFloat(e.target.value) || 0)}
                            className="h-11 rounded-xl pl-8"
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-right font-bold text-green-600 mt-1">Subtotal: S/ {(item.quantity * item.unitPrice).toFixed(2)}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between bg-slate-900 text-white rounded-xl px-4 py-3">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold">S/ {total.toFixed(2)}</span>
                </div>
                <Button
                  onClick={() => setStep("confirm")}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer font-semibold"
                >
                  Continuar
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-700">Resumen</p>
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-slate-600">{item.product.name} × {item.quantity}</span>
                  <span className="font-semibold">S/ {(item.quantity * item.unitPrice).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                <span>Total</span>
                <span className="text-green-600 text-lg">S/ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Datos cliente (opcional) */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Datos del cliente (opcional)</p>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente" className="h-12 rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={clientDNI} onChange={e => setClientDNI(e.target.value)} placeholder="DNI" inputMode="numeric" className="h-12 rounded-xl" />
                <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Teléfono" inputMode="tel" className="h-12 rounded-xl" />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("products")} className="flex-1 h-14 rounded-xl cursor-pointer" disabled={isLoading}>
                Volver
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-[2] h-14 rounded-xl bg-green-600 hover:bg-green-700 cursor-pointer font-bold text-base"
                disabled={isLoading}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {isLoading ? "Procesando..." : "Confirmar Venta"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
