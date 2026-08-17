import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useParams } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Analytics } from "@/components/Analytics";
import { Seo } from "@/components/Seo";
import Index from "./pages/Index";
import Engine from "./pages/Engine";
import Protocols from "./pages/Protocols";
import Manuals from "./pages/Manuals";
import Versions from "./pages/Versions";
import Research from "./pages/Research";
import Researchers from "./pages/Researchers";
import Literature from "./pages/Literature";
import NotFound from "./pages/NotFound";
import Portal from "./pages/Portal";
import Questions from "./pages/Questions";

const queryClient = new QueryClient();
const publicSiteBuild = import.meta.env.VITE_PUBLIC_SITE === "true";

const LegacyQuestionRedirect = () => {
  const { questionId } = useParams();
  return <Navigate to={questionId ? `/discussions/${questionId}` : "/discussions"} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Seo />
        <Analytics />
        <div onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/vendors" element={<Engine />} />
            <Route path="/tools" element={<Protocols />} />
            <Route path="/tools/:toolId" element={<Protocols />} />
            <Route path="/manuals" element={<Manuals />} />
            <Route path="/manuals/:manualId" element={<Manuals />} />
            <Route path="/versions/:toolId" element={<Versions />} />
            <Route path="/questions" element={<LegacyQuestionRedirect />} />
            <Route path="/questions/:questionId" element={<LegacyQuestionRedirect />} />
            <Route path="/discussions" element={<Questions />} />
            <Route path="/discussions/:questionId" element={<Questions />} />
            <Route path="/documentation" element={<Navigate to="/manuals" replace />} />
            <Route path="/researchers" element={<Researchers />} />
            <Route path="/literature" element={<Literature />} />
            <Route path="/literature/:toolId" element={<Literature />} />
            <Route path="/resources" element={<Research />} />
            <Route path="/portal/*" element={<Portal publicLanding={publicSiteBuild} />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
