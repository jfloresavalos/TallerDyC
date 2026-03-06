import { UserRole } from "@prisma/client"
import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      name: string
      role: UserRole
      branchId: string | null
      branchCode: string | null
    }
  }

  interface User {
    id: string
    username: string
    name: string
    role: UserRole
    branchId: string | null
    branchCode: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username: string
    role: UserRole
    branchId: string | null
    branchCode: string | null
  }
}
