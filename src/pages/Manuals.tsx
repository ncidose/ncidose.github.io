import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Code2,
  ExternalLink,
  FileText,
  History,
  Printer,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  getManual,
  getManualBody,
  getManualHeadings,
  getManualVersion,
  manuals,
  type ManualCategory,
  type ManualDefinition,
} from "@/data/manuals";
import { getReleaseHistory, releaseHistories } from "@/data/releases";
import { createLicensingMailto } from "@/lib/licensing";

const categoryLabels: Record<ManualCategory, string> = {
  software: "Research Software",
  api: "Vendor APIs",
};

const categoryDescriptions: Record<ManualCategory, string> = {
  software:
    "Public reference manuals for the approved NCI Dose Tools software and computational phantom libraries.",
  api: "Technical documentation for vendors evaluating licensed REST API integration.",
};

const analyticsToolForManual = (manual: ManualDefinition) =>
  manual.id.replace(/-api$/, "");

const ManualCard = ({ manual }: { manual: ManualDefinition }) => {
  const version = getManualVersion(manual.markdown);
  const Icon = manual.category === "api" ? Code2 : FileText;
  const isApi = manual.category === "api";
  const analyticsTool = analyticsToolForManual(manual);

  return (
    <article
      className="group flex h-full flex-col overflow-hidden border border-border bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg"
    >
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-11 w-11 items-center justify-center border border-primary/30 bg-primary/5 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          {version && (
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {version}
            </span>
          )}
        </div>
        <div className="mt-6 font-mono text-xs uppercase tracking-widest text-primary">
          {manual.eyebrow}
        </div>
        <h3 className="mt-2 text-xl font-light text-slate-900">
          <Link
            to={`/manuals/${manual.id}`}
            className="transition-colors hover:text-primary"
            data-analytics-event="documentation_click"
            data-analytics-location="manual_card_title"
            data-analytics-tool={analyticsTool}
            data-analytics-audience={isApi ? "vendor" : "research"}
            data-analytics-action={isApi ? "read_api_manual" : "read_software_manual"}
          >
            {manual.title}
          </Link>
        </h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {manual.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            to={`/manuals/${manual.id}`}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary"
            data-analytics-event="documentation_click"
            data-analytics-location="manual_card"
            data-analytics-tool={analyticsTool}
            data-analytics-audience={isApi ? "vendor" : "research"}
            data-analytics-action={isApi ? "read_api_manual" : "read_software_manual"}
          >
            Read manual
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          {isApi && (
            <a
              href={createLicensingMailto(manual.product)}
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-slate-700 hover:text-primary"
              data-analytics-location="api_manual_card"
              data-analytics-tool={analyticsTool}
              data-analytics-audience="vendor"
              data-analytics-action="email_licensing"
            >
              Evaluate {manual.product}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

const ManualsIndex = () => {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredManuals = useMemo(
    () =>
      manuals.filter((manual) =>
        `${manual.title} ${manual.product} ${manual.eyebrow} ${manual.description} ${manual.markdown}`
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [normalizedQuery],
  );
  const filteredReleaseHistories = useMemo(
    () =>
      releaseHistories.filter((history) =>
        `${history.product} ${history.title} ${history.modality} ${history.description} ${history.markdown}`
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [normalizedQuery],
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="border-b border-border bg-slate-50 py-20 lg:py-28">
          <div className="container mx-auto px-6">
            <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-end">
              <div className="max-w-4xl">
                <div className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
                  Documentation Library
                </div>
                <h1 className="mt-5 text-5xl font-light tracking-tight text-slate-950 md:text-6xl lg:text-7xl">
                  Manuals &amp; API Documentation
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  Current technical guidance for NCI Dose Tools software, computational
                  phantom libraries, and licensed vendor integrations—presented in one
                  searchable public library.
                </p>
              </div>
              <label className="relative block">
                <span className="sr-only">Search manuals</span>
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search all manuals"
                  className="h-14 w-full border border-border bg-white pl-12 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </label>
            </div>

            <nav
              aria-label="Choose documentation by role"
              className="mt-10 grid gap-3 sm:grid-cols-3"
            >
              <a
                href="#research-software"
                onClick={() => setQuery("")}
                className="group border border-border bg-white p-4 transition-colors hover:border-primary"
                data-analytics-event="documentation_click"
                data-analytics-location="manuals_hero"
                data-analytics-tool="suite"
                data-analytics-audience="research"
                data-analytics-action="jump_to_software_manuals"
              >
                <span className="font-mono text-[11px] uppercase tracking-widest text-primary">
                  Researchers
                </span>
                <span className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-900">
                  Software manuals
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
              <a
                href="#vendor-api-documentation"
                onClick={() => setQuery("")}
                className="group border border-primary bg-primary/5 p-4 transition-colors hover:bg-primary/10"
                data-analytics-event="documentation_click"
                data-analytics-location="manuals_hero"
                data-analytics-tool="suite"
                data-analytics-audience="vendor"
                data-analytics-action="jump_to_api_manuals"
              >
                <span className="font-mono text-[11px] uppercase tracking-widest text-primary">
                  Vendors
                </span>
                <span className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-900">
                  REST API documentation
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
              <a
                href="#release-history"
                onClick={() => setQuery("")}
                className="group border border-border bg-white p-4 transition-colors hover:border-primary"
                data-analytics-event="documentation_click"
                data-analytics-location="manuals_hero"
                data-analytics-tool="suite"
                data-analytics-audience="all"
                data-analytics-action="jump_to_release_history"
              >
                <span className="font-mono text-[11px] uppercase tracking-widest text-primary">
                  Current users
                </span>
                <span className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-900">
                  Release history
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
            </nav>
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="container mx-auto space-y-20 px-6">
            {(["software", "api"] as ManualCategory[]).map((category) => {
              const categoryManuals = filteredManuals.filter(
                (manual) => manual.category === category,
              );
              const sectionId =
                category === "software" ? "research-software" : "vendor-api-documentation";
              if (!categoryManuals.length) return null;

              return (
                <div key={category} id={sectionId} className="scroll-mt-24">
                  <div className="mb-8 grid gap-3 border-b border-border pb-6 md:grid-cols-[260px_1fr]">
                    <h2 className="text-2xl font-light text-slate-900">
                      {categoryLabels[category]}
                    </h2>
                    <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                      {categoryDescriptions[category]}
                    </p>
                  </div>
                  {category === "api" && (
                    <div className="mb-8 grid gap-5 border-l-4 border-primary bg-primary/5 p-5 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="flex gap-4">
                        <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-primary" />
                        <div>
                          <h3 className="font-medium text-slate-900">
                            Evaluate an API for your product workflow
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-slate-700">
                            API documentation is publicly available for technical evaluation.
                            Production access requires a commercial licensing agreement and
                            vendor-specific credentials.
                          </p>
                        </div>
                      </div>
                      <a
                        href={createLicensingMailto()}
                        className="btn-precision inline-flex items-center justify-center gap-2"
                        data-analytics-location="api_manuals_section"
                        data-analytics-tool="suite"
                        data-analytics-audience="vendor"
                        data-analytics-action="email_licensing"
                      >
                        Request API Evaluation <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                  <div className="grid gap-5 md:grid-cols-2">
                    {categoryManuals.map((manual) => (
                      <ManualCard key={manual.id} manual={manual} />
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredReleaseHistories.length > 0 && (
              <div id="release-history" className="scroll-mt-24">
                <div className="mb-8 grid gap-3 border-b border-border pb-6 md:grid-cols-[260px_1fr]">
                  <h2 className="text-2xl font-light text-slate-900">Release History</h2>
                  <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    Chronological technical records for official releases, calculation-library updates, maintenance changes, and compatibility notes.
                  </p>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  {filteredReleaseHistories.map((history) => (
                    <Link
                      key={history.id}
                      to={`/versions/${history.id}`}
                      className="group relative flex min-h-[230px] flex-col overflow-hidden border border-sky-100 bg-gradient-to-br from-white to-sky-50/70 p-6 text-slate-900 shadow-sm transition-all duration-300 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-primary hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-900/10"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex h-11 w-11 items-center justify-center border border-sky-200 bg-white text-primary shadow-sm">
                          <History className="h-5 w-5" />
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                          Updated {history.latestUpdate}
                        </span>
                      </div>
                      <div className="mt-6 font-mono text-xs uppercase tracking-widest text-primary">
                        {history.modality}
                      </div>
                      <h3 className="mt-2 text-xl font-light">{history.title}</h3>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                        {history.description}
                      </p>
                      <span className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
                        View release record
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {!filteredManuals.length && !filteredReleaseHistories.length && (
              <div className="border border-border bg-slate-50 py-16 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-light">No matching manuals</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a product name, feature, input, or calculation term.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

const ManualNavigation = ({ currentId }: { currentId: string }) => (
  <nav aria-label="Manuals" className="space-y-7">
    {(["software", "api"] as ManualCategory[]).map((category) => (
      <div key={category}>
        <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {categoryLabels[category]}
        </div>
        <div className="space-y-1">
          {manuals
            .filter((manual) => manual.category === category)
            .map((manual) => (
              <Link
                key={manual.id}
                to={`/manuals/${manual.id}`}
                aria-current={manual.id === currentId ? "page" : undefined}
                className={`block border-l-2 py-2 pl-3 text-sm transition-colors ${
                  manual.id === currentId
                    ? "border-primary bg-primary/5 font-medium text-primary"
                    : "border-transparent text-muted-foreground hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {manual.title}
              </Link>
            ))}
        </div>
      </div>
    ))}
  </nav>
);

const ManualReader = ({ manual }: { manual: ManualDefinition }) => {
  const headings = getManualHeadings(manual.markdown);
  const version = getManualVersion(manual.markdown);
  const body = getManualBody(manual.markdown);
  const currentIndex = manuals.findIndex((candidate) => candidate.id === manual.id);
  const previous = manuals[currentIndex - 1];
  const next = manuals[currentIndex + 1];
  const analyticsTool = analyticsToolForManual(manual);
  const licensingHref = createLicensingMailto(manual.product);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main
        className="manual-reader pt-16"
        onContextMenu={(event) => event.stopPropagation()}
        onDragStart={(event) => event.stopPropagation()}
      >
        <div className="manual-no-print border-b border-border bg-slate-50">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link to="/manuals" className="hover:text-primary">Manuals</Link>
              <span>/</span>
              <span className="text-slate-900">{manual.title}</span>
            </div>
            <div className="flex gap-3">
              {getReleaseHistory(manual.id) && (
                <Link to={`/versions/${manual.id}`} className="btn-precision-outline inline-flex items-center gap-2 text-sm">
                  <History className="h-4 w-4" /> Release history
                </Link>
              )}
              <Link to="/manuals" className="btn-precision-outline inline-flex items-center gap-2 text-sm">
                <ArrowLeft className="h-4 w-4" /> All manuals
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-precision-outline inline-flex items-center gap-2 text-sm"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-10 lg:py-14">
          <div className="manual-mobile-nav manual-no-print mb-8 lg:hidden">
            <details className="border border-border bg-slate-50 p-4">
              <summary className="cursor-pointer font-medium text-slate-900">Browse manuals</summary>
              <div className="mt-5"><ManualNavigation currentId={manual.id} /></div>
            </details>
          </div>

          <div className="grid gap-12 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,760px)_220px] xl:justify-between">
            <aside className="manual-no-print hidden lg:block">
              <div className="sticky top-24"><ManualNavigation currentId={manual.id} /></div>
            </aside>

            <article className="min-w-0">
              <header className="mb-10 border-b border-border pb-8">
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                  {categoryLabels[manual.category]} · {manual.eyebrow}
                </div>
                <h1 className="mt-4 text-4xl font-light tracking-tight text-slate-950 md:text-5xl">
                  {manual.title}
                </h1>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                  {manual.description}
                </p>
                {version && (
                  <div className="mt-5 inline-flex border border-primary/25 bg-primary/5 px-3 py-1.5 font-mono text-xs text-primary">
                    Documented release {version}
                  </div>
                )}
              </header>

              {manual.category === "api" && (
                <div className="mb-9 border-l-4 border-primary bg-primary/5 p-5">
                  <div className="text-sm leading-relaxed text-slate-700">
                    <strong className="font-medium text-slate-900">Vendor access:</strong>{" "}
                    This public manual supports technical evaluation. Production API credentials
                    are issued only through the commercial licensing process. Contact Dr. Kevin
                    Chang at the NCI Technology Transfer Center to discuss access and licensing.
                  </div>
                  <a
                    href={licensingHref}
                    className="btn-precision mt-5 inline-flex items-center gap-2"
                    data-analytics-location="api_manual_reader_top"
                    data-analytics-tool={analyticsTool}
                    data-analytics-audience="vendor"
                    data-analytics-action="email_licensing"
                  >
                    Request {manual.product} Evaluation
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              )}

              <div className="manual-article">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug]}
                  components={{
                    a: ({ href, children, ...props }) => {
                      const external = Boolean(href?.startsWith("http"));
                      return (
                        <a
                          href={href}
                          {...props}
                          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        >
                          {children}
                          {external && <ExternalLink className="ml-1 inline h-3 w-3" />}
                        </a>
                      );
                    },
                    img: ({ src, alt, ...props }) => {
                      const imageSrc = src?.startsWith("images/")
                        ? `/manuals/${src}`
                        : src;
                      return <img src={imageSrc} alt={alt ?? ""} loading="lazy" {...props} />;
                    },
                    table: ({ children, ...props }) => (
                      <div className="manual-table-wrap">
                        <table {...props}>{children}</table>
                      </div>
                    ),
                  }}
                >
                  {body}
                </ReactMarkdown>
              </div>

              {manual.category === "api" && (
                <section className="manual-no-print mt-12 border border-primary bg-primary/5 p-6">
                  <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
                    Next step for vendors
                  </div>
                  <h2 className="mt-3 text-2xl font-light text-slate-900">
                    Evaluate {manual.product} in your deployment environment
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">
                    Share your organization, expected request volume, deployment
                    environment, evaluation timeline, and proposed use with the NCI
                    Technology Transfer Center.
                  </p>
                  <a
                    href={licensingHref}
                    className="btn-precision mt-5 inline-flex items-center gap-2"
                    data-analytics-location="api_manual_reader_bottom"
                    data-analytics-tool={analyticsTool}
                    data-analytics-audience="vendor"
                    data-analytics-action="email_licensing"
                  >
                    Request {manual.product} Evaluation
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </section>
              )}

              <nav className="manual-no-print mt-14 grid gap-4 border-t border-border pt-8 sm:grid-cols-2" aria-label="Adjacent manuals">
                {previous ? (
                  <Link to={`/manuals/${previous.id}`} className="group border border-border p-4 hover:border-primary/50">
                    <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      <ArrowLeft className="h-3.5 w-3.5" /> Previous
                    </span>
                    <span className="mt-2 block text-sm text-slate-900 group-hover:text-primary">{previous.title}</span>
                  </Link>
                ) : <span />}
                {next && (
                  <Link to={`/manuals/${next.id}`} className="group border border-border p-4 text-right hover:border-primary/50">
                    <span className="flex items-center justify-end gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      Next <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    <span className="mt-2 block text-sm text-slate-900 group-hover:text-primary">{next.title}</span>
                  </Link>
                )}
              </nav>
            </article>

            <aside className="manual-no-print hidden xl:block">
              <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto border-l border-border pl-5">
                <div className="mb-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">On this page</div>
                <nav className="space-y-2.5">
                  {headings.map((heading, index) => (
                    <button
                      type="button"
                      key={`${heading.id}-${index}`}
                      onClick={() =>
                        document.getElementById(heading.id)?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                      }
                      className={`block w-full text-left text-xs leading-relaxed text-muted-foreground hover:text-primary ${heading.depth === 3 ? "pl-3" : ""}`}
                    >
                      {heading.label}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <div className="manual-no-print"><Footer /></div>
    </div>
  );
};

const Manuals = () => {
  const { manualId } = useParams();
  if (!manualId) return <ManualsIndex />;
  const manual = getManual(manualId);
  if (!manual) return <Navigate to="/manuals" replace />;
  return <ManualReader manual={manual} />;
};

export default Manuals;
