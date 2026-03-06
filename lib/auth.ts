import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import prisma from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
          include: { branch: true },
        })

        if (!user || !user.active) {
          return null
        }

        const isValid = await compare(credentials.password, user.password)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          branchId: user.branchId,
          branchCode: user.branch?.code ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.role = user.role
        token.branchId = user.branchId
        token.branchCode = user.branchCode
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        username: token.username,
        name: token.name ?? "",
        role: token.role,
        branchId: token.branchId,
        branchCode: token.branchCode,
      }
      return session
    },
  },
}
