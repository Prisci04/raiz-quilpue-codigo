import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AssistantProvider } from "@/components/ai/AssistantProvider";
import AssistantWidget from "@/components/ai/AssistantWidget";
import "@/components/ai/assistant.css";

export default function SitioLayout({ children }) {
  return (
    <AssistantProvider><div className="flex min-h-full flex-col bg-[#fffdf9] pt-16 text-[#946541]">
      <Header />
      {children}
      <Footer />
      <AssistantWidget />
    </div></AssistantProvider>
  );
}
