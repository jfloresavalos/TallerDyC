"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { resolveCorrection } from "@/lib/actions/services"
import { getMechanicsByBranch } from "@/lib/actions/users"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, Car, User, Clock, CheckCircle, Wrench } from "lucide-react"
import type { Branch, Vehicle, Service, User as PrismaUser } from "@prisma/client"

type CorrectionService = Service & {
  vehicle: Vehicle & { branch: Branch }
  mechanic: PrismaUser
}

interface CorrectionsClientProps {
  initialCorrections: CorrectionService[]
}

export function CorrectionsClient({ initialCorrections }: CorrectionsClientProps) {
  const [corrections, setCorrections] = useState(initialCorrections)
  const [resolveId, setResolveId] = useState<string | null>(null)
  const [mechanics, setMechanics] = useState<PrismaUser[]>([])
  const [selectedMechanicId, setSelectedMechanicId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const selected = corrections.find(c => c.id === resolveId)

  const handleOpenResolve = async (correction: CorrectionService) => {
    setResolveId(correction.id)
    setSelectedMechanicId(correction.mechanicId)
    const mechs = await getMechanicsByBranch(correction.vehicle.branchId)
    setMechanics(mechs as PrismaUser[])
  }

  const handleResolve = async () => {
    if (!resolveId || !selectedMechanicId) return
    setIsLoading(true)
    try {
      await resolveCorrection(resolveId, selectedMechanicId)
      toast.success("Correccion resuelta — servicio reactivado")
      setCorrections(prev => prev.filter(c => c.id !== resolveId))
      setResolveId(null)
      router.refresh()
    } catch { toast.error("Error al resolver") } finally { setIsLoading(false) }
  }

  if (corrections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="font-semibold text-slate-700 mb-1">Sin correcciones pendientes</h3>
        <p className="text-sm text-slate-500">Todo esta en orden</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
        <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
        <p className="text-sm text-orange-800 font-medium">{corrections.length} servicio{corrections.length !== 1 ? "s" : ""} requiere{corrections.length === 1 ? "" : "n"} atencion</p>
      </div>

      {corrections.map((c) => (
        <div key={c.id} className="bg-white rounded-2xl border-2 border-orange-200 shadow-sm overflow-hidden">
          <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="font-semibold text-orange-800 text-sm">Correccion Solicitada</span>
            </div>
            <span className="text-xs text-slate-500">
              {new Date(c.startTime).toLocaleDateString("es-PE")}
            </span>
          </div>

          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-slate-400" />
              <p className="font-semibold text-slate-900">{c.vehicle.brand} {c.vehicle.model}</p>
              <span className="text-slate-500 font-mono text-sm">— {c.vehicle.plate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-700">{c.serviceType}</p>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-600">Reportado por: <span className="font-medium">{c.mechanic.name}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">{c.vehicle.branch.name}</p>
            </div>

            {c.correctionReason && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 mt-2">
                <p className="text-xs font-semibold text-red-700 mb-1">Motivo del reporte:</p>
                <p className="text-sm text-red-900">{c.correctionReason}</p>
              </div>
            )}
          </div>

          <div className="px-4 pb-4">
            <Button
              onClick={() => handleOpenResolve(c)}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 cursor-pointer font-semibold"
            >
              Resolver y Reasignar Mecanico
            </Button>
          </div>
        </div>
      ))}

      {/* Dialog Resolver */}
      <Dialog open={!!resolveId} onOpenChange={(o) => !o && setResolveId(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Resolver Correccion</DialogTitle>
            <DialogDescription>
              {selected?.vehicle.brand} {selected?.vehicle.model} — {selected?.serviceType}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Reasignar a mecanico *</label>
              <Select value={selectedMechanicId} onValueChange={setSelectedMechanicId}>
                <SelectTrigger className="h-14 rounded-xl border-slate-200">
                  <SelectValue placeholder="Selecciona un mecanico" />
                </SelectTrigger>
                <SelectContent>
                  {mechanics.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        {m.name}
                        {m.id === selected?.mechanicId && <span className="text-xs text-slate-400">(actual)</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setResolveId(null)} className="flex-1 h-14 rounded-xl cursor-pointer" disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                onClick={handleResolve}
                className="flex-[2] h-14 font-semibold rounded-xl bg-green-600 hover:bg-green-700 cursor-pointer"
                disabled={isLoading || !selectedMechanicId}
              >
                {isLoading ? "Resolviendo..." : "Confirmar Resolucion"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
