"use client"

import type { Branch } from "@prisma/client"

interface BranchSelectorProps {
  branches: Branch[]
  selected: string | "all"
  onChange: (branchId: string | "all") => void
}

export function BranchSelector({ branches, selected, onChange }: BranchSelectorProps) {
  const allOptions = [...branches, { id: "all", name: "Todas" }]

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {allOptions.map((b) => {
        const active = selected === b.id
        return (
          <button
            key={b.id}
            onClick={() => onChange(b.id as string | "all")}
            className={`h-7 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {b.name}
          </button>
        )
      })}
    </div>
  )
}
