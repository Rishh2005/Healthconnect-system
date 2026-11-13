import type { Metadata, Viewport } from "next"
import "./globals.css"
import 'leaflet/dist/leaflet.css'

export const metadata: Metadata = {
  title: "HealthConnect | Connected care, made clearer",
  description: "A private care workspace for patients and approved hospital teams, with nearby facility discovery, appointments, and patient-controlled record sharing.",
  applicationName: "HealthConnect",
}

export const viewport: Viewport = {
  themeColor: "#0b0e13",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark"><body>{children}</body></html>
}
