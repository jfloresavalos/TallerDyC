import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    if (session.user.role === "ADMIN") redirect("/dashboard")
    if (session.user.role === "RECEPTIONIST") redirect("/taller/registrar")
    if (session.user.role === "MECHANIC") redirect("/mis-autos")
  }

  redirect("/login")
}
