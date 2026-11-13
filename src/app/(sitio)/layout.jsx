import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SitioLayout({ children }) {
  return (
    <div className="site-shell flex min-h-full flex-col bg-[#e7dcd2] pt-16 text-[#946541]">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
