import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/taller/:path*",
    "/mis-autos/:path*",
    "/reportes/:path*",
    "/configuracion/:path*",
    "/inventario/:path*",
  ],
}
