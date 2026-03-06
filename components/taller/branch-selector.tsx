"use client"

import { Button } from "@/components/ui/button"
import type { Branch } from "@prisma/client"

interface BranchSelectorProps {
  branches: Branch[]
  selected: string | "all"
  onChange: (branchId: string | "all") => void
}

export function BranchSelector({ branches, selected, onChange }: BranchSelectorProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
      <label className="text-xs font-medium text-slate-700 block mb-2">
        Seleccionar Sede:
      </label>
      <div className="flex flex-wrap gap-2">
        {branches.map((branch) => (
          <Button
            key={branch.id}
            variant={selected === branch.id ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(branch.id)}
            className="text-xs h-9 px-3 cursor-pointer"
          >
            {branch.name}
          </Button>
        ))}
        <Button
          variant={selected === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange("all")}
          className="text-xs h-9 px-3 cursor-pointer"
        >
          Todas
        </Button>
      </div>
    </div>
  )
}
