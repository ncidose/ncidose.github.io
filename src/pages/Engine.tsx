import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VendorApiSandbox } from "@/components/VendorApiSandbox";
import { portalLinks, tools } from "@/data/nciDoseTools";
import { createLicensingMailto } from "@/lib/licensing";
import {
  ArrowRight,
  Building2,
  Code2,
  DatabaseZap,
  ExternalLink,
  Layers3,
  ScrollText,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const strengths = [
  {
    icon: Layers3,
    title: "Shared reference phantom foundation",
    description:
      "NCI-developed reference phantoms support a consistent anatomical basis across CT, RF, and nuclear medicine workflows.",
  },
  {
    icon: DatabaseZap,
    title: "CT/RF/NM ecosystem",
    description:
      "The suite is not a single modality calculator. CT, radiography/fluoroscopy, and nuclear medicine tools are organized as one dosimetry ecosystem.",
  },
  {
    icon: ShieldCheck,
    title: "Live API testing before licensing",
    description:
      "Public sandbox runs and REST API manuals support technical testing before any production integration or licensing decision.",
  },
  {
    icon: ScrollText,
    title: "Documented in peer-reviewed research",
    description:
      "A maintained public technical site and a growing publication registry provide technical and scientific context.",
  },
];

const vendorComponentSummaries: Record<string, string> = {
  ncict:
    "REST API-accessible CT organ-dose estimation component for protocol, scanner, and patient-size workflows.",
  ncirf:
    "REST API-accessible radiography and fluoroscopy dose component with geometry-aware exposure modeling.",
  ncinm:
    "REST API-accessible nuclear medicine absorbed-dose component for radionuclide and radiopharmaceutical workflows, including fuzzy algorithm-based radiopharmaceutical name matching.",
  phantom:
    "Shared reference anatomy library supporting consistent dose estimates across the tool suite.",
};

const vendorComponentIcons: Record<string, typeof Code2> = {
  ncict: Code2,
  ncirf: Workflow,
  ncinm: DatabaseZap,
  phantom: Layers3,
};

const apiManualLinks: Partial<Record<string, string>> = {
  ncict: "/manuals/ncict-api",
  ncirf: "/manuals/ncirf-api",
  ncinm: "/manuals/ncinm-api",
};

const licensingProductForTool = (tool: (typeof tools)[number]) =>
  tool.id === "phantom" ? "PHANTOM libraries" : `${tool.name} REST API`;

const Engine = () => {
  const { search } = useLocation();
  const requestedToolId = new URLSearchParams(search).get("tool");
  const requestedTool = tools.find((tool) => tool.id === requestedToolId);
  const analyticsTool = requestedTool?.id ?? "suite";
  const licensingProduct = requestedTool
    ? licensingProductForTool(requestedTool)
    : "NCI Dose Tools REST APIs";
  const licensingHref = createLicensingMailto(licensingProduct);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="pt-16">
        <section className="relative overflow-hidden pb-8 pt-8 sm:pb-10 sm:pt-12">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute left-0 right-0 top-1/3 h-px bg-border" />
            <div className="absolute left-0 right-0 top-2/3 h-px bg-border" />
          </div>

          <div className="container relative z-10 mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-5xl"
            >
              <span className="font-mono text-xs uppercase tracking-widest text-primary">
                For Vendors
              </span>
              <h1 className="mt-4 text-hero-md lg:text-hero">
                REST API-Ready
                <br />
                <span className="text-muted-foreground">Reference Dosimetry</span>
              </h1>
              <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
                Run NCICT, NCINM, and NCIRF calculations directly with adjustable,
                de-identified test inputs. No account or API key is required for the
                public sandbox; production or commercial integration requires an
                appropriate NCI licensing agreement.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#api-sandbox"
                  className="btn-precision"
                  data-analytics-location="vendor_hero"
                  data-analytics-tool={analyticsTool}
                  data-analytics-audience="vendor"
                  data-analytics-action="open_live_demo"
                >
                  Try Live API Sandbox
                </a>
                <Link
                  to={requestedTool && requestedTool.id !== "phantom"
                    ? `/manuals/${requestedTool.id}-api`
                    : "/manuals#vendor-api-documentation"}
                  className="btn-precision-outline"
                >
                  View API Manuals
                </Link>
                <Link
                  to="/vendors#components"
                  className="btn-precision-outline"
                >
                  Compare Components
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <VendorApiSandbox initialTool={requestedToolId} />

        <section className="py-20">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-12 max-w-4xl"
            >
              <span className="font-mono text-xs uppercase tracking-widest text-primary">
                Differentiators
              </span>
              <h2 className="mt-4 text-section-md lg:text-section">
                What sets NCI Dose Tools apart
              </h2>
              <p className="mt-5 text-muted-foreground">
                The core advantage is not only one calculator. It is an
                NCI-developed CT/RF/NM dosimetry ecosystem with reference
                phantoms, REST API pathways, and public technical documentation.
              </p>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {strengths.map((strength, index) => (
                <motion.div
                  key={strength.title}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="border border-border bg-white p-6"
                >
                  <div className="mb-6 flex h-10 w-10 items-center justify-center border border-primary text-primary">
                    <strength.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-medium text-slate-900">{strength.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {strength.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="components" className="py-20">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-12 text-center"
            >
              <span className="font-mono text-xs uppercase tracking-widest text-primary">
                Supported Components
              </span>
              <h2 className="mt-4 text-section-md lg:text-section">
                Components vendors can test and review
              </h2>
              <p className="mx-auto mt-5 max-w-3xl text-muted-foreground">
                NCICT, NCINM, and NCIRF can be tested immediately in the public
                sandbox. Their REST API manuals document the complete technical
                workflow; production product integration requires NCI licensing.
                Vendors interested in GUI-oriented overviews can visit{" "}
                <Link to="/tools" className="text-primary hover:underline">
                  Our Tools
                </Link>
                .
              </p>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2">
              {tools.map((tool, index) => {
                const VendorIcon = vendorComponentIcons[tool.id] ?? Code2;
                const componentType =
                  tool.id === "phantom" ? "Reference Library" : "REST API Component";

                return (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden border border-border bg-white"
                  >
                    <div className="flex h-full flex-col xl:grid xl:grid-cols-[220px_1fr]">
                      <div className="flex min-h-[180px] w-full flex-col items-center justify-center border-b border-border bg-slate-50 p-6 text-center xl:h-full xl:border-b-0 xl:border-r">
                        <div className="flex h-16 w-16 items-center justify-center border border-primary/40 bg-white text-primary">
                          <VendorIcon className="h-8 w-8" />
                        </div>
                        <div className="mt-4 font-mono text-lg text-primary">
                          {tool.name}
                        </div>
                        <div className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                          {componentType}
                        </div>
                      </div>
                      <div className="min-w-0 p-5 sm:p-6">
                        <h3 className="break-words font-medium text-slate-900">
                          {tool.modality}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {vendorComponentSummaries[tool.id] ?? tool.suiteSummary}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                          {tool.id !== "phantom" && (
                            <Link
                              to={`/vendors?tool=${tool.id}#api-sandbox`}
                              className="inline-flex items-center gap-2 font-mono text-sm text-primary hover:underline"
                              data-analytics-event="vendor_sandbox_open"
                              data-analytics-location="vendor_component"
                              data-analytics-tool={tool.id}
                              data-analytics-audience="vendor"
                              data-analytics-action="open_live_demo"
                            >
                              Try {tool.name} in sandbox
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          <Link
                            to={apiManualLinks[tool.id] ?? tool.manualHref}
                            className="inline-flex items-center gap-2 font-mono text-sm text-primary hover:underline"
                            data-analytics-event="documentation_click"
                            data-analytics-location="vendor_component"
                            data-analytics-tool={tool.id}
                            data-analytics-audience="vendor"
                            data-analytics-action={apiManualLinks[tool.id] ? "read_api_manual" : "read_software_manual"}
                          >
                            {apiManualLinks[tool.id]
                              ? "View REST API technical manual"
                              : "View user manual"}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                          {tool.id === "phantom" && (
                            <a
                              href={createLicensingMailto(licensingProductForTool(tool))}
                              className="inline-flex items-center gap-2 font-mono text-sm text-primary hover:underline"
                              data-analytics-location="vendor_component"
                              data-analytics-tool={tool.id}
                              data-analytics-audience="vendor"
                              data-analytics-action="email_licensing"
                            >
                              Discuss PHANTOM licensing
                              <ArrowRight className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col gap-6 border border-primary bg-primary/5 p-7 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <h3 className="text-xl font-light text-slate-900">
                  Ready for production integration?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  If sandbox testing confirms the technical fit, review the commercial
                  pathway for deployment scale, credentials, and licensing.
                </p>
              </div>
              <a
                href="#commercial-access"
                className="btn-precision inline-flex flex-none items-center justify-center gap-2"
                data-analytics-location="vendor_components_footer"
                data-analytics-tool={analyticsTool}
                data-analytics-audience="vendor"
                data-analytics-action="view_licensing_path"
              >
                Review Commercial Access <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section id="commercial-access" className="scroll-mt-24 border-y border-border bg-white py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="mb-12 text-center"
              >
                <span className="font-mono text-xs uppercase tracking-widest text-primary">
                  Licensing and Next Steps
                </span>
                <h2 className="mt-4 text-section-md lg:text-section">
                  Plan production or commercial integration
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
                  {requestedTool
                    ? `Tell us how ${requestedTool.name} would fit your product workflow.`
                    : "Tell us which dose components fit your production workflow."}
                  {" "}The prepared email prompts help the NCI Technology Transfer Center
                  understand your organization, scale, deployment environment, timeline,
                  and proposed use.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="border border-border bg-white p-8"
              >
                <div className="space-y-6">
                  {[
                    "Test a de-identified single case in the public live sandbox—no account or API key is required.",
                    "Use the REST API manual to confirm the complete input, response, and integration structure.",
                    "When you are ready for production or commercial use, contact the NCI Technology Transfer Center about licensing and deployment scale.",
                  ].map((step, index) => (
                    <div key={step} className="flex items-start gap-4">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-primary font-mono text-sm text-primary">
                        {index + 1}
                      </span>
                      <p className="pt-1 text-slate-700">{step}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-10 grid gap-5 border-t border-border pt-8 md:grid-cols-2">
                  <div className="border border-border p-6">
                    <h3 className="flex items-center gap-3 font-medium text-slate-900">
                      <Building2 className="h-5 w-5 text-primary" />
                      Planning production integration
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      Contact Dr. Kevin Chang at the NCI Technology Transfer Center to discuss licensing, deployment scale, or commercial integration.
                    </p>
                    <a
                      href={licensingHref}
                      className="mt-5 inline-flex items-center gap-2 font-mono text-sm text-primary hover:underline"
                      data-analytics-location="vendor_commercial_access"
                      data-analytics-tool={analyticsTool}
                      data-analytics-audience="vendor"
                      data-analytics-action="email_licensing"
                    >
                      Discuss {requestedTool?.name ?? "API"} commercial licensing
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div className="flex flex-col border border-primary bg-primary/5 p-6">
                    <h3 className="flex items-center gap-3 font-medium text-slate-900">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      Approved commercial user
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      If your commercial access has already been approved and you received a User Portal welcome email, sign in with the email linked to that approved account.
                    </p>
                    <a
                      href={portalLinks.userPortal}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open User Portal (opens in a new tab)"
                      className="btn-precision mt-6 inline-flex items-center justify-center gap-2 md:mt-auto"
                      data-analytics-event="portal_login_click"
                      data-analytics-location="vendor_commercial_access"
                      data-analytics-tool={analyticsTool}
                      data-analytics-audience="approved_user"
                      data-analytics-action="open_portal"
                    >
                      Open User Portal <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default Engine;
