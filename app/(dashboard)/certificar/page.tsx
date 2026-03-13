import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getCertificationQueue, getCertifiedServices } from "@/lib/actions/certifications"
import { getBranches } from "@/lib/actions/users"
import { CertificationQueueClient } from "@/components/taller/certification-queue"

export default async function CertificarPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "CERTIFIER") redirect("/")

  const branchId = session.user.branchId ?? null

  const [queue, certified, branches] = await Promise.all([
    getCertificationQueue(branchId),
    getCertifiedServices(branchId),
    getBranches(),
  ])

  return (
    <div className="p-4 md:p-6">
      <CertificationQueueClient
        initialQueue={queue}
        initialCertified={certified}
        certifierId={session.user.id}
        certifierBranchId={branchId}
        branches={branches}
      />
    </div>
  )
}
