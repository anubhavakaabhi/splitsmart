export { default as proxy } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/groups/:path*",
    "/expenses/:path*",
    "/profile/:path*",
  ],
}
