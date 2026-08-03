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

const categoryLabels: Record<ManualCategory, string> = {
  software: "Research Software",
  api: "Vendor APIs",
};

const categoryDescriptions: Record<ManualCategory, string> = {
  software:
    "Public reference manuals for the approved NCI Dose Tools software and computational phantom libraries.",
  api: "Technical documentation for vendors evaluating licensed REST API integration.",
};

const ManualCard = ({ manual }: { manual: ManualDefinition }) => {
  const version = getManualVersion(manual.markdown);
  const Icon = manual.category === "api" ? Code2 : FileText;

  return (
    <Link
      to={`/manuals/${manual.id}`}
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
        <h3 className="mt-2 text-xl font-light text-slate-900">{manual.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {manual.description}
        </p>
        <span className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
          Read manual
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
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
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="container mx-auto space-y-20 px-6">
            {(["software", "api"] as ManualCategory[]).map((category) => {
              const categoryManuals = filteredManuals.filter(
                (manual) => manual.category === category,
              );
              if (!categoryManuals.length) return null;

              return (
                <div key={category}>
                  <div className="mb-8 grid gap-3 border-b border-border pb-6 md:grid-cols-[260px_1fr]">
                    <h2 className="text-2xl font-light text-slate-900">
                      {categoryLabels[category]}
                    </h2>
                    <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                      {categoryDescriptions[category]}
                    </p>
                  </div>
                  {category === "api" && (
                    <div className="mb-8 flex gap-4 border-l-4 border-primary bg-primary/5 p-5">
                      <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-primary" />
                      <p className="text-sm leading-relaxed text-slate-700">
                        API documentation is publicly available for technical evaluation.
                        Production access requires a commercial licensing agreement and
                        vendor-specific credentials.
                      </p>
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

            {!filteredManuals.length && (
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
                <div className="mb-9 border-l-4 border-primary bg-primary/5 p-5 text-sm leading-relaxed text-slate-700">
                  <strong className="font-medium text-slate-900">Vendor access:</strong>{" "}
                  This public manual supports technical evaluation. Production API credentials
                  are issued only through the commercial licensing process. Contact{" "}
                  <a href="mailto:changke@mail.nih.gov" className="text-primary hover:underline">
                    Dr. Kevin Chang at the NCI Technology Transfer Center
                  </a>{" "}
                  to discuss access and licensing.
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
