import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PhantomLibraryVisual } from "@/components/PhantomLibraryVisual";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type DoseTool, tools } from "@/data/nciDoseTools";

type LiteratureArticle = {
  authors: string[];
  nciTeamAuthored?: boolean;
};

type LiteratureTool = {
  id: string;
  counts: {
    displayedArticles: number;
  };
  years: Array<{
    articles: LiteratureArticle[];
  }>;
};

type LiteratureData = {
  tools: LiteratureTool[];
};

type PublicationSummary = {
  total: number;
  nciTeam: number;
};

const isNciTeamArticle = (article: LiteratureArticle) =>
  article.nciTeamAuthored === true || article.authors.includes("Lee C");

const buildPublicationSummaries = (data: LiteratureData) =>
  data.tools.reduce<Record<string, PublicationSummary>>((summaries, tool) => {
    summaries[tool.id] = {
      total: tool.counts.displayedArticles,
      nciTeam: tool.years.reduce(
        (sum, year) => sum + year.articles.filter(isNciTeamArticle).length,
        0,
      ),
    };
    return summaries;
  }, {});

const ToolContent = ({
  publicationSummary,
  tool,
}: {
  publicationSummary?: PublicationSummary;
  tool: DoseTool;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className="space-y-8"
  >
    <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
      <div className="space-y-6">
        <div className="border-l-4 border-primary pl-6">
          <h2 className="text-2xl font-light text-foreground lg:text-3xl">
            {tool.name}
          </h2>
          <p className="mt-2 text-lg font-medium text-primary">
            {tool.fullName}
          </p>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="border border-border bg-white p-4">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Modality
            </div>
            <div className="mt-2 text-slate-800">{tool.modality}</div>
          </div>
          <div className="border border-border bg-white p-4">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Method
            </div>
            <div className="mt-2 text-slate-800">{tool.method}</div>
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed">{tool.intro}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to={tool.manualHref}
            className="btn-precision inline-flex items-center justify-center text-center"
            data-analytics-event="documentation_click"
            data-analytics-location="product_primary"
            data-analytics-tool={tool.id}
            data-analytics-audience="all"
            data-analytics-action="read_software_manual"
          >
            Read {tool.name} Manual
          </Link>
          <Link
            to="/portal/request-access/"
            className="btn-precision-outline inline-flex items-center justify-center text-center"
            data-analytics-event="research_access_start"
            data-analytics-location="product_primary"
            data-analytics-tool={tool.id}
            data-analytics-audience="research"
            data-analytics-action="start_sta"
          >
            Request Research Access
          </Link>
          <Link
            to={`/vendors?tool=${tool.id}#commercial-access`}
            className="btn-precision-outline inline-flex items-center justify-center text-center sm:col-span-2"
            data-analytics-event="vendor_evaluation_start"
            data-analytics-location="product_primary"
            data-analytics-tool={tool.id}
            data-analytics-audience="vendor"
            data-analytics-action="view_licensing_path"
          >
            {tool.id === "phantom"
              ? "Discuss PHANTOM Licensing"
              : `Evaluate ${tool.name} REST API`}
          </Link>
        </div>
        <p className="border-l-2 border-primary/30 pl-4 text-xs leading-relaxed text-muted-foreground">
          Approved non-commercial research access and licensed vendor integration
          follow separate review pathways.
        </p>
        <div className="border border-border bg-white p-5">
          <div className="font-mono text-xs uppercase tracking-widest text-primary">
            Key advantages
          </div>
          <ul className="mt-4 space-y-3">
            {tool.advantages.map((advantage) => (
              <li key={advantage} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 bg-primary" />
                <span className="text-sm leading-relaxed text-slate-700">
                  {advantage}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 border border-border bg-white p-5">
          <div className="font-mono text-xs uppercase tracking-widest text-primary">
            Core workflow
          </div>
          <div className="space-y-3">
            {tool.details.map((detail) => (
              <p key={detail} className="text-sm leading-relaxed text-slate-700">
                {detail}
              </p>
            ))}
          </div>
        </div>
        <div className="border border-primary/20 bg-primary/5 p-5">
          <div className="font-mono text-xs uppercase tracking-widest text-primary">
            {tool.id === "phantom" ? "Library role" : "Typical outputs"}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            {tool.output}
          </p>
        </div>
      </div>

      {tool.id === "phantom" ? (
        <PhantomLibraryVisual />
      ) : tool.image ? (
        <figure className="overflow-hidden border border-border bg-white shadow-xl">
          <div className="border-b border-border bg-slate-50 px-4 py-3">
            <figcaption className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {tool.name} GUI
            </figcaption>
          </div>
          <img
            src={tool.image}
            alt={tool.imageAlt}
            className="w-full object-cover object-left-top"
            loading="lazy"
          />
        </figure>
      ) : null}
    </div>

    <div className="border border-border bg-slate-50 p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h3 className="font-mono text-sm uppercase tracking-widest text-primary">
            Peer-reviewed foundation
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {publicationSummary
              ? `${tool.name} is represented in ${publicationSummary.total} registry papers, including ${publicationSummary.nciTeam} publications by the NCI Dose Team.`
              : "PHANTOM provides the anatomical basis used across NCI Dose Tools methods and validation literature."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to={publicationSummary ? `/literature/${tool.id}` : "/literature"}
            className="border border-border bg-white px-4 py-2 font-mono text-xs uppercase tracking-wider text-primary transition-colors hover:border-primary/50"
          >
            Literature registry
          </Link>
          {publicationSummary && (
            <Link
              to={`/literature/${tool.id}?team=lee-c`}
              className="border border-primary bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90"
            >
              NCI team papers
            </Link>
          )}
        </div>
      </div>
    </div>

    <div className="grid gap-3 border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
      <Link
        to={`/vendors?tool=${tool.id}#commercial-access`}
        className="group border border-slate-200 p-4 transition-colors hover:border-primary"
        data-analytics-event="vendor_evaluation_start"
        data-analytics-location="product_resources"
        data-analytics-tool={tool.id}
        data-analytics-audience="vendor"
        data-analytics-action="view_licensing_path"
      >
        <div className="font-mono text-xs uppercase tracking-widest text-primary">
          Vendor integration
        </div>
        <p className="mt-2 text-sm text-muted-foreground group-hover:text-slate-700">
          Evaluate REST API-ready components.
        </p>
      </Link>
      <Link
        to="/researchers"
        className="group border border-slate-200 p-4 transition-colors hover:border-primary"
      >
        <div className="font-mono text-xs uppercase tracking-widest text-primary">
          For researchers
        </div>
        <p className="mt-2 text-sm text-muted-foreground group-hover:text-slate-700">
          Review research applications and methods.
        </p>
      </Link>
      <Link
        to={tool.manualHref}
        className="group border border-slate-200 p-4 transition-colors hover:border-primary"
        data-analytics-event="documentation_click"
        data-analytics-location="product_resources"
        data-analytics-tool={tool.id}
        data-analytics-audience="all"
        data-analytics-action="read_software_manual"
      >
        <div className="font-mono text-xs uppercase tracking-widest text-primary">
          User manual
        </div>
        <p className="mt-2 text-sm text-muted-foreground group-hover:text-slate-700">
          Read the current {tool.name} manual on this site.
        </p>
      </Link>
      {tool.versionHistoryHref.startsWith("http") ? (
        <a
          href={tool.versionHistoryHref}
          target="_blank"
          rel="noreferrer"
          className="group border border-slate-200 p-4 transition-colors hover:border-primary"
        >
          <div className="font-mono text-xs uppercase tracking-widest text-primary">
            Version history
          </div>
          <p className="mt-2 text-sm text-muted-foreground group-hover:text-slate-700">
            Review {tool.name} releases and files.
          </p>
        </a>
      ) : (
        <Link
          to={tool.versionHistoryHref}
          className="group border border-slate-200 p-4 transition-colors hover:border-primary"
        >
          <div className="font-mono text-xs uppercase tracking-widest text-primary">
            Version history
          </div>
          <p className="mt-2 text-sm text-muted-foreground group-hover:text-slate-700">
            Review {tool.name} releases and files.
          </p>
        </Link>
      )}
      <Link
        to="/resources"
        className="group border border-slate-200 p-4 transition-colors hover:border-primary"
      >
        <div className="font-mono text-xs uppercase tracking-widest text-primary">
          Links & Resources
        </div>
        <p className="mt-2 text-sm text-muted-foreground group-hover:text-slate-700">
          Open official pages, technical docs, and approved-user links.
        </p>
      </Link>
    </div>
  </motion.div>
);

const Protocols = () => {
  const { hash } = useLocation();
  const { toolId } = useParams();
  const navigate = useNavigate();
  const initialToolId = toolId || hash.replace("#", "");
  const [activeTab, setActiveTab] = useState(
    tools.some((tool) => tool.id === initialToolId) ? initialToolId : "ncict",
  );
  const selectedTool = tools.find((tool) => tool.id === activeTab) ?? tools[0];
  const hasRequestedTool = Boolean(
    initialToolId && tools.some((tool) => tool.id === initialToolId),
  );
  const [publicationSummaries, setPublicationSummaries] =
    useState<Record<string, PublicationSummary> | null>(null);

  useEffect(() => {
    const legacyToolId = hash.replace("#", "");
    const requestedToolId = toolId || legacyToolId;
    if (requestedToolId && tools.some((tool) => tool.id === requestedToolId)) {
      setActiveTab(requestedToolId);
      if (!toolId && legacyToolId) {
        navigate(`/tools/${legacyToolId}`, { replace: true });
      }
    }
  }, [hash, navigate, toolId]);

  useEffect(() => {
    let cancelled = false;

    fetch("/literature.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`literature.json returned ${response.status}`);
        }
        return response.json() as Promise<LiteratureData>;
      })
      .then((payload) => {
        if (!cancelled) {
          setPublicationSummaries(buildPublicationSummaries(payload));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPublicationSummaries(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/tools/${value}#tool-summary`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="pt-24">
        <section className="py-24">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-5xl"
            >
              <span className="font-mono text-xs uppercase tracking-widest text-primary">
                {hasRequestedTool ? selectedTool.modality : "Our Tools"}
              </span>
              <h1 className="mt-4 text-hero-md lg:text-hero">
                {hasRequestedTool ? selectedTool.name : "NCI Dose Tools Suite"}
              </h1>
              <p className="mt-6 max-w-3xl text-muted-foreground leading-relaxed">
                {hasRequestedTool
                  ? selectedTool.suiteSummary
                  : "The suite covers CT, nuclear medicine, and radiography/fluoroscopy dose estimation, with a shared anatomical foundation built from computational human phantom libraries."}
              </p>
              <p className="mt-4 max-w-3xl text-muted-foreground leading-relaxed">
                {hasRequestedTool
                  ? `Review ${selectedTool.name} use cases and choose the research or vendor pathway below. Continue to the `
                  : "Compare the tools below, then continue to the "}
                <Link to="/manuals" className="text-primary hover:underline">
                  public manual library
                </Link>{" "}
                for detailed workflows, screenshots, and technical guidance. Release
                histories and curated technical Q&amp;A are also available on this site.
              </p>
            </motion.div>
          </div>
        </section>

        <section id="tool-summary" className="scroll-mt-24 py-10 lg:py-16">
          <div className="container mx-auto px-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <TabsList className="flex h-auto flex-wrap gap-2 bg-transparent p-0 pb-10">
                  {tools.map((tool) => (
                    <TabsTrigger
                      key={tool.id}
                      value={tool.id}
                      className="rounded-none border border-border px-4 py-2 font-mono text-sm text-muted-foreground transition-all duration-300 hover:border-primary hover:text-primary data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {tool.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </motion.div>

              <div className="mt-12">
                {tools.map((tool) => (
                  <TabsContent key={tool.id} value={tool.id} className="mt-0">
                    <ToolContent
                      publicationSummary={publicationSummaries?.[tool.id]}
                      tool={tool}
                    />
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </section>

        <section className="bg-slate-50 py-16">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8 max-w-4xl"
            >
              <span className="font-mono text-xs uppercase tracking-widest text-primary">
                Compare tools
              </span>
              <h2 className="mt-4 text-2xl font-light text-slate-800 lg:text-3xl">
                Compare the full suite
              </h2>
              <p className="mt-3 text-muted-foreground">
                Compare the best-fit use, primary inputs, and calculation basis for each tool.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border border-slate-200 bg-white"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left font-mono text-sm uppercase tracking-wider text-slate-600">
                        Tool
                      </th>
                      <th className="px-6 py-4 text-left font-mono text-sm uppercase tracking-wider text-slate-600">
                        Best for
                      </th>
                      <th className="px-6 py-4 text-left font-mono text-sm uppercase tracking-wider text-slate-600">
                        Primary inputs
                      </th>
                      <th className="px-6 py-4 text-left font-mono text-sm uppercase tracking-wider text-slate-600">
                        Calculation basis
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tools.map((tool) => (
                      <tr key={tool.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-5 font-mono font-medium text-primary">
                          <Link to={`/tools/${tool.id}`} className="hover:underline">
                            {tool.name}
                          </Link>
                        </td>
                        <td className="max-w-md px-6 py-5 text-sm leading-relaxed text-slate-700">
                          {tool.comparison.bestFor}
                        </td>
                        <td className="max-w-lg px-6 py-5 text-sm leading-relaxed text-slate-600">
                          {tool.comparison.primaryInputs}
                        </td>
                        <td className="max-w-sm px-6 py-5 text-sm leading-relaxed text-slate-600">
                          {tool.comparison.calculationBasis}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default Protocols;
