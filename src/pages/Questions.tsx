import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight, HelpCircle, Loader2, Paperclip, Pin, Search, Send } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { portalLinks } from "@/data/portalLinks";
import { buildAnswerThreads, normalizePublicQuestion, publicQuestionsApi, questionAnswerLabel, questionAuthorLabel, questionRequestTypeLabels, questionRequestTypes, questionTools, type PublicQuestion, type QuestionAnswerThread, type QuestionRequestType, type QuestionTool } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { applyPageSeo } from "@/lib/seo";

const displayDate = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value))
  : "";

const plainText = (value: string) => value
  .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/[#*_`>~]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const schemaDate = (value: string | null) => value && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
  ? `${value.replace(" ", "T")}Z`
  : value;

const Markdown = ({ children }: { children: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      a: ({ children: label, ...props }) => <a {...props} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">{label}</a>,
      img: ({ alt, ...props }) => <img {...props} alt={alt || "Discussion attachment"} className="my-6 max-h-[560px] max-w-full border border-border object-contain" />,
    }}
  >
    {children}
  </ReactMarkdown>
);

const PublicReply = ({ answer, depth = 0 }: { answer: QuestionAnswerThread; depth?: number }) => (
  <div className={cn(depth > 0 && "ml-4 border-l border-slate-200 pl-4 sm:ml-8 sm:pl-6")}>
    <section className={cn("p-6", answer.responseType === "team" ? "border-l-4 border-primary bg-sky-50/70" : "border border-border bg-slate-50")}>
      {depth > 0 && <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-slate-400">Reply in this conversation</div>}
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs uppercase tracking-widest"><span className="normal-case text-primary">{questionAnswerLabel(answer)}</span><span className="text-slate-400">{displayDate(answer.createdAt)}</span></div>
      <div className="prose prose-slate mt-4 max-w-none text-sm leading-relaxed"><Markdown>{answer.body}</Markdown></div>
      {answer.attachments.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{answer.attachments.map((attachment) => <a key={attachment.id} href={`https://portal.ncidosetools.com/api/public/attachments/${attachment.id}`} className="inline-flex items-center gap-2 border border-sky-200 bg-white px-3 py-2 text-xs text-slate-700 hover:border-primary hover:text-primary"><Paperclip className="h-3.5 w-3.5" /> {attachment.fileName}</a>)}</div>}
    </section>
    {answer.children.length > 0 && <div className="mt-4 space-y-4">{answer.children.map((child) => <PublicReply key={child.id} answer={child} depth={depth + 1} />)}</div>}
  </div>
);

const discussionToolIds: Partial<Record<QuestionTool, string>> = {
  NCICT: "ncict",
  NCIRF: "ncirf",
  NCINM: "ncinm",
  PHANTOM: "phantom",
};

const DiscussionResources = ({ tool }: { tool: QuestionTool }) => {
  const toolId = discussionToolIds[tool];

  return (
    <aside aria-label="Related technical resources" className="mt-8 border-l-4 border-primary bg-primary/5 p-5">
      <div className="font-mono text-xs uppercase tracking-widest text-primary">
        Continue with related resources
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        Use the maintained product and documentation pages for current workflows,
        access guidance, and vendor integration details.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to={toolId ? `/tools/${toolId}` : "/tools"}
          className="btn-precision-outline inline-flex items-center gap-2 text-sm"
        >
          {toolId ? `${tool} overview` : "Explore the tools"}
        </Link>
        <Link
          to={toolId ? `/manuals/${toolId}` : "/manuals"}
          className="btn-precision-outline inline-flex items-center gap-2 text-sm"
          data-analytics-event="documentation_click"
          data-analytics-location="discussion_context"
          data-analytics-tool={toolId ?? "suite"}
          data-analytics-audience="all"
          data-analytics-action="read_software_manual"
        >
          {toolId ? `Read ${tool} manual` : "Browse manuals"}
        </Link>
        {toolId && toolId !== "phantom" && (
          <Link
            to={`/manuals/${toolId}-api`}
            className="btn-precision-outline inline-flex items-center gap-2 text-sm"
            data-analytics-event="documentation_click"
            data-analytics-location="discussion_context"
            data-analytics-tool={toolId}
            data-analytics-audience="vendor"
            data-analytics-action="read_api_manual"
          >
            Read {tool} API manual
          </Link>
        )}
        <Link
          to={toolId ? `/vendors?tool=${toolId}#commercial-access` : "/vendors#commercial-access"}
          className="btn-precision-outline inline-flex items-center gap-2 text-sm"
          data-analytics-event="vendor_evaluation_start"
          data-analytics-location="discussion_context"
          data-analytics-tool={toolId ?? "suite"}
          data-analytics-audience="vendor"
          data-analytics-action="view_licensing_path"
        >
          Vendor integration
        </Link>
      </div>
    </aside>
  );
};

const Questions = () => {
  const { questionId } = useParams();
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [tool, setTool] = useState<(typeof questionTools)[number]>("All");
  const [requestType, setRequestType] = useState<"all" | QuestionRequestType>("all");

  useEffect(() => {
    const controller = new AbortController();
    fetch(publicQuestionsApi, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Discussions could not be loaded.");
        const body = await response.json();
        setQuestions((body.questions || []).map(normalizePublicQuestion));
      })
      .catch((error) => {
        if (error.name !== "AbortError") setFailed(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const selected = questionId ? questions.find((question) => question.id === questionId) : undefined;

  useEffect(() => {
    if (!selected) return;
    const description = plainText(selected.body).slice(0, 220);
    applyPageSeo({
      pathname: `/discussions/${selected.id}`,
      title: `${selected.title} | NCI Dose Tools Discussions`,
      heading: selected.title,
      description,
      schemaType: "DiscussionForumPosting",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "DiscussionForumPosting",
        headline: selected.title,
        articleBody: plainText(selected.body),
        datePublished: schemaDate(selected.publishedAt || selected.createdAt),
        dateModified: schemaDate(selected.updatedAt),
        url: `https://ncidose.github.io/discussions/${selected.id}/`,
        author: {
          "@type": selected.authorType === "team" ? "Organization" : "Person",
          name: questionAuthorLabel(selected),
        },
        publisher: {
          "@type": "Organization",
          name: "National Cancer Institute",
          url: "https://www.cancer.gov/",
        },
        commentCount: selected.answers.length,
        comment: selected.answers.map((answer) => ({
          "@type": "Comment",
          text: plainText(answer.body),
          dateCreated: schemaDate(answer.createdAt),
          author: {
            "@type": answer.responseType === "team" ? "Organization" : "Person",
            name: questionAnswerLabel(answer),
          },
        })),
      },
    });
  }, [selected]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return questions.filter((question) =>
      (requestType === "feature_request" || tool === "All" || question.tool === tool)
      && (requestType === "all" || question.requestType === requestType)
      && (!normalized || `${question.title} ${question.body} ${question.answers.map((answer) => answer.body).join(" ")}`.toLowerCase().includes(normalized)),
    );
  }, [questions, query, requestType, tool]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-16">
        <section className="border-b border-sky-100 bg-gradient-to-br from-white via-sky-50 to-blue-50">
          <div className="container mx-auto px-6 py-16 lg:py-24">
            <div className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Community knowledge &amp; support</div>
            <div className="mt-5 grid gap-10 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <h1 className="text-5xl font-light tracking-tight text-slate-950 md:text-6xl lg:text-7xl">Discussions</h1>
                <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">Technical questions, bug reports, feature requests, and community replies. Anyone may read; approved portal users may post and reply.</p>
              </div>
              <a
                href={`${portalLinks.userPortal}/#/portal/questions`}
                className="group flex items-center justify-between border border-primary bg-white px-5 py-4 text-sm text-slate-800 shadow-sm transition-colors hover:bg-primary hover:text-white"
                data-analytics-event="portal_login_click"
                data-analytics-location="discussion_hero"
                data-analytics-tool="suite"
                data-analytics-audience="approved_user"
                data-analytics-action="join_discussion"
              >
                <span className="flex items-center gap-3"><Send className="h-4 w-4" /> Join the discussion</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-12 lg:py-16">
          {selected ? (
            <div className="mx-auto max-w-4xl">
              <Link to="/discussions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> All discussions</Link>
              <article className="mt-8 border border-border bg-white p-6 shadow-sm sm:p-10">
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-wider text-primary">{selected.pinned && <span className="inline-flex items-center gap-1"><Pin className="h-3 w-3" /> Pinned</span>}<span>{questionRequestTypeLabels[selected.requestType]}</span>{selected.requestType !== "feature_request" && <><span className="text-slate-300">/</span><span>{selected.tool}</span></>}<span className="text-slate-300">/</span><span className="text-muted-foreground">{displayDate(selected.publishedAt || selected.createdAt)}</span><span className="text-slate-300">/</span><span className="normal-case">{questionAuthorLabel(selected)}</span></div>
                <h2 className="mt-5 text-3xl font-light leading-tight text-slate-950 sm:text-4xl">{selected.title}</h2>
                <div className="prose prose-slate mt-8 max-w-none text-sm leading-relaxed"><Markdown>{selected.body}</Markdown></div>
                <DiscussionResources tool={selected.tool} />
                {selected.attachments.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{selected.attachments.map((attachment) => <a key={attachment.id} href={`https://portal.ncidosetools.com/api/public/attachments/${attachment.id}`} className="inline-flex items-center gap-2 border border-border bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:border-primary hover:text-primary"><Paperclip className="h-3.5 w-3.5" /> {attachment.fileName} <span className="text-muted-foreground">({Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB)</span></a>)}</div>}
                <div className="mt-10 space-y-6 border-t border-border pt-8">
                  {buildAnswerThreads(selected.answers).map((answer) => <PublicReply key={answer.id} answer={answer} />)}
                </div>
                <a
                  href={`${portalLinks.userPortal}/#/portal/questions?discussion=${selected.id}`}
                  className="mt-8 inline-flex items-center gap-2 border border-primary px-4 py-3 text-sm text-primary hover:bg-primary hover:text-white"
                  data-analytics-event="portal_login_click"
                  data-analytics-location="discussion_reply"
                  data-analytics-tool={discussionToolIds[selected.tool] ?? "suite"}
                  data-analytics-audience="approved_user"
                  data-analytics-action="reply_to_discussion"
                ><Send className="h-4 w-4" /> Reply as an approved user</a>
              </article>
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <label className="relative block"><span className="sr-only">Search discussions</span><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search discussions and replies" className="h-14 w-full border border-border bg-white pl-12 pr-4 text-sm outline-none focus:border-primary" /></label>
                <div className="flex flex-wrap border border-border bg-slate-50 p-1">{questionTools.map((item) => <button key={item} type="button" onClick={() => setTool(item)} className={cn("px-3 py-2 text-xs transition-colors", tool === item ? "bg-primary text-white" : "text-slate-600 hover:bg-white hover:text-primary")}>{item}</button>)}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">{(["all", ...questionRequestTypes] as const).map((item) => <button key={item} type="button" onClick={() => setRequestType(item)} className={cn("border px-3 py-2 text-xs transition-colors", requestType === item ? "border-primary bg-sky-50 text-primary" : "border-border text-slate-600 hover:border-sky-300")}>{item === "all" ? "All types" : questionRequestTypeLabels[item]}</button>)}</div>
              {loading ? <div className="flex items-center justify-center gap-3 py-24 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading discussions…</div>
                : failed ? <div className="mt-10 border border-red-100 bg-red-50 p-8 text-center text-sm text-red-800">The discussion service is temporarily unavailable. Please try again shortly.</div>
                  : filtered.length === 0 ? <div className="mt-10 border border-border bg-slate-50 p-12 text-center"><HelpCircle className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-4 text-sm text-muted-foreground">No matching public discussions.</p></div>
                    : <div className="mt-8 divide-y divide-border border-y border-border">{filtered.map((question) => <Link key={question.id} to={`/discussions/${question.id}`} className={cn("group grid gap-4 py-6 transition-colors hover:bg-sky-50/50 sm:grid-cols-[150px_1fr_auto] sm:items-center sm:px-4", question.pinned && "bg-sky-50/60")}><div className="space-y-2 font-mono text-xs uppercase tracking-wider text-primary">{question.pinned && <div className="inline-flex items-center gap-1"><Pin className="h-3 w-3" /> Pinned</div>}<div>{questionRequestTypeLabels[question.requestType]}</div>{question.requestType !== "feature_request" && <div className="text-[10px] text-muted-foreground">{question.tool}</div>}</div><div><h2 className="text-lg font-light text-slate-900 group-hover:text-primary">{question.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{question.body.replace(/[#*_`>]/g, "")}</p><div className="mt-2 text-xs text-slate-400">{question.answers.length} {question.answers.length === 1 ? "reply" : "replies"}</div></div><div className="flex items-center gap-3 text-xs text-muted-foreground"><span>{displayDate(question.publishedAt || question.createdAt)}</span><ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" /></div></Link>)}</div>}
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Questions;
