import { Link, Navigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  ShieldCheck,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { portalLinks } from "@/data/portalLinks";
import {
  getReleaseHistory,
  getReleaseHistoryBody,
  releaseHistories,
  type ReleaseHistoryDefinition,
} from "@/data/releases";
import { headingSlug } from "@/data/manuals";

const ReleaseHistoryPage = ({ history }: { history: ReleaseHistoryDefinition }) => {
  const body = getReleaseHistoryBody(history.markdown);
  const years = Array.from(body.matchAll(/^##\s+(\d{4})$/gm)).map((match) => match[1]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-16">
        <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950 text-white">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(56,189,248,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="container relative mx-auto px-6 py-16 lg:py-24">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Link to="/manuals" className="transition-colors hover:text-sky-300">Documentation</Link>
              <span>/</span>
              <span className="text-slate-200">Release history</span>
              <span>/</span>
              <span className="text-white">{history.product}</span>
            </div>

            <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-sky-300">
                  <History className="h-4 w-4" /> {history.modality}
                </div>
                <h1 className="mt-6 text-5xl font-light tracking-tight md:text-6xl lg:text-7xl">
                  {history.title}
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
                  {history.description}
                </p>
              </div>

              <div className="border border-white/15 bg-white/[0.06] p-6 backdrop-blur-sm">
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-sky-300">Current record</div>
                <dl className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <dt className="flex items-center gap-2 text-slate-400"><Clock3 className="h-4 w-4" /> Latest update</dt>
                    <dd className="text-right text-white">{history.latestUpdate}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <dt className="flex items-center gap-2 text-slate-400"><CheckCircle2 className="h-4 w-4" /> Official release</dt>
                    <dd className="font-mono text-right text-white">{history.latestOfficialRelease}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-slate-400"><CalendarDays className="h-4 w-4" /> Record begins</dt>
                    <dd className="text-right text-white">{history.firstReleaseYear}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-slate-50">
          <div className="container mx-auto grid gap-px bg-border px-6 sm:grid-cols-3">
            <Link to={`/manuals/${history.id}`} className="group flex items-center justify-between bg-slate-50 px-5 py-5 text-sm text-slate-700 transition-colors hover:bg-white hover:text-primary">
              <span className="flex items-center gap-3"><FileText className="h-4 w-4 text-primary" /> Read the current manual</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to={`/tools#${history.id}`} className="group flex items-center justify-between bg-slate-50 px-5 py-5 text-sm text-slate-700 transition-colors hover:bg-white hover:text-primary">
              <span className="flex items-center gap-3"><History className="h-4 w-4 text-primary" /> View {history.product} overview</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href={portalLinks.userPortal} className="group flex items-center justify-between bg-slate-50 px-5 py-5 text-sm text-slate-700 transition-colors hover:bg-white hover:text-primary">
              <span className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-primary" /> Download approved releases</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </section>

        <div className="container mx-auto px-6 py-12 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[190px_minmax(0,800px)] xl:grid-cols-[190px_minmax(0,800px)_180px] xl:justify-between">
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Release histories</div>
                <nav className="mt-4 space-y-1" aria-label="Release histories">
                  {releaseHistories.map((item) => (
                    <Link
                      key={item.id}
                      to={`/versions/${item.id}`}
                      aria-current={item.id === history.id ? "page" : undefined}
                      className={`block border-l-2 py-2.5 pl-3 text-sm transition-colors ${item.id === history.id ? "border-primary bg-primary/5 font-medium text-primary" : "border-transparent text-muted-foreground hover:border-slate-300 hover:text-slate-900"}`}
                    >
                      {item.product}
                    </Link>
                  ))}
                </nav>
                <p className="mt-6 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
                  Release records document software changes. Current software packages remain available only through the approved User Portal.
                </p>
              </div>
            </aside>

            <article className="release-history-article min-w-0">
              <div className="mb-12 flex items-start gap-4 border-l-4 border-primary bg-primary/5 p-5 text-sm leading-relaxed text-slate-700">
                <History className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p>
                  This record includes official releases and interim maintenance updates. It documents changes but does not provide unrestricted software downloads.
                </p>
              </div>

              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSlug]}
                components={{
                  h2: ({ children, ...props }) => (
                    <h2 {...props} className="release-year">{children}</h2>
                  ),
                  h3: ({ children, ...props }) => {
                    const label = String(children);
                    const official = label.includes("Official Release");
                    return (
                      <h3 {...props} className="release-entry-title">
                        <span>{children}</span>
                        {official && <span className="release-badge">Official release</span>}
                      </h3>
                    );
                  },
                  h4: ({ children, ...props }) => <h4 {...props} className="release-subheading">{children}</h4>,
                }}
              >
                {body}
              </ReactMarkdown>

              <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
                <Link to="/manuals" className="btn-precision-outline inline-flex items-center gap-2 text-sm">
                  <ArrowLeft className="h-4 w-4" /> Documentation library
                </Link>
                <a href={portalLinks.userPortal} className="btn-precision inline-flex items-center gap-2 text-sm">
                  Open User Portal <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </article>

            <aside className="hidden xl:block">
              <div className="sticky top-24 border-l border-border pl-5">
                <div className="mb-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">On this record</div>
                <nav className="space-y-2">
                  {years.map((year) => (
                    <button
                      type="button"
                      key={year}
                      onClick={() => document.getElementById(headingSlug(year))?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="block w-full text-left font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      {year}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Versions = () => {
  const { toolId } = useParams();
  const history = getReleaseHistory(toolId);
  if (!history) return <Navigate to="/manuals" replace />;
  return <ReleaseHistoryPage history={history} />;
};

export default Versions;
