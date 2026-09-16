import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Raíz Quilpué",
  description:
    "Corporación cultural dedicada a rescatar, preservar y difundir la historia e identidad de Quilpué.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#f6f1e8] pt-16 text-[#3d2f24]">
        <Header />
        {children}
      </body>
    </html>
  );
}
