import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VendorApiSandbox } from "@/components/VendorApiSandbox";
import { LicensingContact } from "@/components/LicensingContact";
import { UpdateSubscription } from "@/components/UpdateSubscription";
import { portalLinks, tools } from "@/data/nciDoseTools";

const summaries: Record<string, string> = {
  ncict: "CT organ-dose estimation for scan protocols and patient-size workflows.",
  ncirf: "Geometry-aware organ and skin dose estimation for radiography and fluoroscopy.",
  ncinm: "Nuclear medicine absorbed-dose estimation for radionuclide and radiopharmaceutical workflows.",
  phantom: "Reference, size-dependent, and pregnant computational phantom libraries for integration and research.",
};

const Engine = () => {
  const { search, hash } = useLocation();
  const navigate = useNavigate();
  const requestedToolId = new URLSearchParams(search).get("tool") || "ncict";
  const requestedTool = tools.find((tool) => tool.id === requestedToolId) ?? tools[0];
  const licensingProduct = requestedTool.id === "phantom" ? "PHANTOM libraries" : `${requestedTool.name} REST API`;
  const selectTool = (tool: string) => {
    const params = new URLSearchParams(search);
    params.set("tool", tool);
    navigate({ pathname: "/vendors", search: params.toString(), hash }, { replace: true, state: { preserveScroll: true } });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-16">
        <section className="pb-10 pt-10 sm:pt-12">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl">
              <span className="font-mono text-xs uppercase tracking-widest text-primary">For Vendors</span>
              <h1 className="mt-4 text-section-md lg:text-section">Dosimetry APIs &amp; Commercial Licensing</h1>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">Integrate NCI-developed dose calculations and phantom libraries into your product. Try the public API sandbox or contact NCI directly to discuss your licensing needs.</p>
              <p className="mt-3 text-sm text-muted-foreground">No account or API key is required for sandbox testing. Production or commercial integration requires an appropriate NCI licensing agreement.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#api-sandbox" className="btn-precision" data-analytics-location="vendor_hero" data-analytics-tool={requestedTool.id} data-analytics-audience="vendor" data-analytics-action="open_live_demo">Try Live API Sandbox</a>
                <a href="#commercial-access" className="btn-precision-outline" data-analytics-location="vendor_hero" data-analytics-tool={requestedTool.id} data-analytics-audience="vendor" data-analytics-action="view_licensing_path">Discuss Commercial Licensing</a>
                <Link to={requestedTool.id === "phantom" ? "/manuals/phantom" : `/manuals/${requestedTool.id}-api`} className="inline-flex items-center px-2 text-sm font-medium text-primary underline underline-offset-4">{requestedTool.id === "phantom" ? "View PHANTOM Manual" : "View API Manual"}</Link>
              </div>
            </div>
          </div>
        </section>

        <VendorApiSandbox initialTool={requestedTool.id} onToolChange={selectTool} />

        <section id="commercial-access" className="scroll-mt-24 border-b border-border bg-white py-12 sm:py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-5xl">
              <span className="font-mono text-xs uppercase tracking-widest text-primary">Commercial Licensing</span>
              <h2 className="mt-3 text-section-md">Discuss your integration</h2>
              <p className="mt-4 max-w-3xl text-muted-foreground">Tell us how {requestedTool.name} would fit your product. You can inquire at any stage; completing a sandbox test is optional.</p>
              <div className="mt-7 grid items-start gap-6 md:grid-cols-[1.4fr_1fr]">
                <div className="border border-border p-5 sm:p-6">
                  <h3 className="mb-4 text-lg font-medium">{requestedTool.name} licensing inquiry</h3>
                  <LicensingContact product={licensingProduct} tool={requestedTool.id} />
                </div>
                <div className="space-y-5">
                  <div className="border border-border bg-slate-50 p-5">
                    <h3 className="flex items-center gap-2 font-medium"><ShieldCheck className="h-5 w-5 text-primary" /> Approved commercial user</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">If your commercial access has already been approved, sign in with the email in your User Portal welcome message.</p>
                    <a href={portalLinks.userPortal} target="_blank" rel="noopener noreferrer" aria-label="Open User Portal (opens in a new tab)" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4" data-analytics-event="portal_login_click" data-analytics-location="vendor_commercial_access" data-analytics-tool={requestedTool.id} data-analytics-audience="vendor" data-analytics-action="open_portal">Open User Portal <ExternalLink className="h-4 w-4" /></a>
                  </div>
                  <UpdateSubscription source="vendor" collapsible />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="components" className="scroll-mt-24 py-12 sm:py-16">
          <div className="container mx-auto px-6">
            <h2 className="text-section-md">Components vendors can test and review</h2>
            <p className="mt-4 max-w-3xl text-muted-foreground">Explore three calculation APIs and the computational phantom libraries. <Link to="/tools" className="text-primary underline underline-offset-4">View software overviews</Link> for GUI and research workflows.</p>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {tools.map((tool) => (
                <article key={tool.id} className="border border-border bg-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xl font-medium">{tool.name}</h3>
                    <span className="font-mono text-xs text-muted-foreground">{tool.id === "phantom" ? "Phantom libraries" : "REST API"}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{summaries[tool.id]}</p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-primary">
                    {tool.id === "phantom" ? (
                      <Link to="/vendors?tool=phantom#commercial-access" data-analytics-action="view_licensing_path">Discuss PHANTOM licensing <ArrowRight className="inline h-3.5 w-3.5" /></Link>
                    ) : (
                      <Link to={`/vendors?tool=${tool.id}#api-sandbox`} data-analytics-event="vendor_sandbox_open" data-analytics-location="vendor_component" data-analytics-tool={tool.id} data-analytics-audience="vendor" data-analytics-action="open_live_demo">Try {tool.name} in sandbox <ArrowRight className="inline h-3.5 w-3.5" /></Link>
                    )}
                    <Link to={tool.id === "phantom" ? tool.manualHref : `/manuals/${tool.id}-api`} data-analytics-event="documentation_click" data-analytics-location="vendor_component" data-analytics-tool={tool.id} data-analytics-audience="vendor" data-analytics-action="read_api_manual">{tool.id === "phantom" ? "View user manual" : "View API manual"}</Link>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-8 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
              <p>NCI-developed computational phantoms support dose estimation across CT, radiography/fluoroscopy, and nuclear medicine. Review the <Link to="/literature" className="text-primary underline underline-offset-4">peer-reviewed literature</Link> and <Link to="/manuals#vendor-api-documentation" className="text-primary underline underline-offset-4">API documentation</Link> for the scientific and technical background.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Engine;
