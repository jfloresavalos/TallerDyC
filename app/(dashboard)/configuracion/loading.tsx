export default function Loading() {
  return (
    <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="text-sm text-slate-500">Cargando...</p>
      </div>
    </div>
  )
}
