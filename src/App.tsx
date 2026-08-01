import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Analytics } from "@/components/Analytics";
import Index from "./pages/Index";
import Engine from "./pages/Engine";
import Protocols from "./pages/Protocols";
import Documentation from "./pages/Documentation";
import Research from "./pages/Research";
import Researchers from "./pages/Researchers";
import Literature from "./pages/Literature";
import NotFound from "./pages/NotFound";
import Portal from "./pages/Portal";
import { portalLinks } from "@/data/nciDoseTools";

const queryClient = new QueryClient();
const publicSiteBuild = import.meta.env.VITE_PUBLIC_SITE === "true";

const PortalRedirect = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const suffix = pathname.startsWith("/portal") ? pathname : "/portal";
    window.location.replace(`${portalLinks.userPortal}/#${suffix}`);
  }, [pathname]);
  return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Opening the secure user portal…</div>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Analytics />
        <div onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/vendors" element={<Engine />} />
            <Route path="/tools" element={<Protocols />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/researchers" element={<Researchers />} />
            <Route path="/literature" element={<Literature />} />
            <Route path="/literature/:toolId" element={<Literature />} />
            <Route path="/resources" element={<Research />} />
            <Route path="/portal/*" element={publicSiteBuild ? <PortalRedirect /> : <Portal />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
