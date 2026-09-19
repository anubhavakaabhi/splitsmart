import Navbar from "@/layouts/Navbar"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
    <Navbar/>
        {children}
    </>
  )
}