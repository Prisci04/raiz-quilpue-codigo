import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const raiz = localFont({
  src: "./fonts/TipografiaRaiz-Regular.otf",
  variable: "--font-raiz-local",
  weight: "400",
});

export const metadata = {
  title: "Corporación Raíz Quilpué",
  description:
    "Corporación cultural dedicada a rescatar, preservar y difundir la historia e identidad de Quilpué.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${poppins.variable} ${raiz.variable} h-full antialiased`}
    >
      <body className="h-full min-h-full">{children}</body>
    </html>
  );
}
