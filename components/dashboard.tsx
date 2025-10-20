"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import VehicleRegistration from "./vehicle-registration"
import ActiveVehicles from "./active-vehicles"
import ServiceAssignment from "./service-assignment"
import MyAssignedVehicles from "./my-assigned-vehicles"
import AdminDashboard from "./admin-dashboard"
import Reports from "./reports"
import UserManagement from "./user-management"
import SidebarMenu from "./sidebar-menu"

export default function Dashboard() {
  const { mechanic, isAdmin, isReceptionist, isMechanic } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState(isAdmin ? "dashboard" : isReceptionist ? "register" : "assigned")
  const [selectedBranch, setSelectedBranch] = useState<"sede1" | "sede2" | "both">(
    isAdmin ? "sede1" : mechanic?.branch || "sede1",
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <SidebarMenu activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-0 md:pt-0">
        <div className="w-full">
          {isAdmin && activeTab === "dashboard" && (
            <div className="p-4 md:p-6">
              <AdminDashboard key={`dashboard-${refreshKey}`} branch={selectedBranch} />
            </div>
          )}

          {isAdmin && activeTab === "active" && (
            <div className="p-4 md:p-6">
              <ActiveVehicles
                key={`active-${refreshKey}`}
                branch={selectedBranch}
                isAdmin={isAdmin}
                onBranchChange={setSelectedBranch}
              />
            </div>
          )}

          {(isAdmin || isReceptionist) && activeTab === "register" && (
            <div className="p-4 md:p-6">
              <VehicleRegistration
                branch={isAdmin ? selectedBranch : mechanic?.branch || "sede1"}
                onSuccess={handleRefresh}
                isAdmin={isAdmin}
                onBranchChange={isAdmin ? setSelectedBranch : undefined}
              />
            </div>
          )}

          {isAdmin && activeTab === "service" && (
            <div className="p-4 md:p-6">
              <ServiceAssignment
                key={`service-${refreshKey}`}
                mechanicId={mechanic?.id || ""}
                mechanicName={mechanic?.name || ""}
                branch={selectedBranch}
                onSuccess={handleRefresh}
                isAdmin={isAdmin}
                onBranchChange={setSelectedBranch}
              />
            </div>
          )}

          {isAdmin && activeTab === "users" && (
            <div className="p-4 md:p-6">
              <UserManagement key={`users-${refreshKey}`} onSuccess={handleRefresh} />
            </div>
          )}

          {isAdmin && activeTab === "reports" && (
            <div className="p-4 md:p-6">
              <Reports
                key={`reports-${refreshKey}`}
                branch={selectedBranch}
                isAdmin={isAdmin}
                mechanicId={mechanic?.id || ""}
                onBranchChange={setSelectedBranch}
              />
            </div>
          )}

          {isMechanic && activeTab === "assigned" && (
            <div className="p-4 md:p-6">
              <MyAssignedVehicles
                key={`assigned-${refreshKey}`}
                mechanicId={mechanic?.id || ""}
                branch={mechanic?.branch || "sede1"}
                onSuccess={handleRefresh}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  )
}
