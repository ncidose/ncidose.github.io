import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight, HelpCircle, Loader2, Paperclip, Pin, Search, Send } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { portalLinks } from "@/data/portalLinks";
import { normalizePublicQuestion, publicQuestionsApi, questionRequestTypeLabels, questionRequestTypes, questionTools, type PublicQuestion, type QuestionRequestType } from "@/lib/questions";
import { cn } from "@/lib/utils";

const displayDate = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value))
  : "";

const Markdown = ({ children }: { children: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      a: ({ children: label, ...props }) => <a {...props} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">{label}</a>,
      img: ({ alt, ...props }) => <img {...props} alt={alt || "Q&A attachment"} className="my-6 max-h-[560px] max-w-full border border-border object-contain" />,
    }}
  >
    {children}
  </ReactMarkdown>
);

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
        if (!response.ok) throw new Error("Q&A could not be loaded.");
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
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return questions.filter((question) =>
      (tool === "All" || question.tool === tool)
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
            <div className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Technical knowledge base</div>
            <div className="mt-5 grid gap-10 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <h1 className="text-5xl font-light tracking-tight text-slate-950 md:text-6xl lg:text-7xl">Questions &amp; Answers</h1>
                <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">Practical guidance from the NCI Dose Tools community, curated by the NCI Dose Team. No GitHub account or portal sign-in is required to read published answers.</p>
              </div>
              <a href={`${portalLinks.userPortal}/#/portal/questions`} className="group flex items-center justify-between border border-primary bg-white px-5 py-4 text-sm text-slate-800 shadow-sm transition-colors hover:bg-primary hover:text-white">
                <span className="flex items-center gap-3"><Send className="h-4 w-4" /> Ask through the User Portal</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-12 lg:py-16">
          {selected ? (
            <div className="mx-auto max-w-4xl">
              <Link to="/questions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> All questions</Link>
              <article className="mt-8 border border-border bg-white p-6 shadow-sm sm:p-10">
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-wider text-primary">{selected.pinned && <span className="inline-flex items-center gap-1"><Pin className="h-3 w-3" /> Pinned</span>}<span>{questionRequestTypeLabels[selected.requestType]}</span>{selected.requestType !== "feature_request" && <><span className="text-slate-300">/</span><span>{selected.tool}</span></>}<span className="text-slate-300">/</span><span className="text-muted-foreground">{displayDate(selected.publishedAt || selected.createdAt)}</span></div>
                <h2 className="mt-5 text-3xl font-light leading-tight text-slate-950 sm:text-4xl">{selected.title}</h2>
                <div className="prose prose-slate mt-8 max-w-none text-sm leading-relaxed"><Markdown>{selected.body}</Markdown></div>
                {selected.attachments.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{selected.attachments.map((attachment) => <a key={attachment.id} href={`https://portal.ncidosetools.com/api/public/attachments/${attachment.id}`} className="inline-flex items-center gap-2 border border-border bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:border-primary hover:text-primary"><Paperclip className="h-3.5 w-3.5" /> {attachment.fileName} <span className="text-muted-foreground">({Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB)</span></a>)}</div>}
                <div className="mt-10 space-y-6 border-t border-border pt-8">
                  {selected.answers.map((answer) => (
                    <section key={answer.id} className={cn("p-6", answer.responseType === "team" ? "border-l-4 border-primary bg-sky-50/70" : "border border-border bg-slate-50")}>
                      <div className="font-mono text-xs uppercase tracking-widest text-primary">{answer.responseType === "team" ? "NCI Dose Team" : "Community response"}</div>
                      <div className="prose prose-slate mt-4 max-w-none text-sm leading-relaxed"><Markdown>{answer.body}</Markdown></div>
                      {answer.attachments.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{answer.attachments.map((attachment) => <a key={attachment.id} href={`https://portal.ncidosetools.com/api/public/attachments/${attachment.id}`} className="inline-flex items-center gap-2 border border-sky-200 bg-white px-3 py-2 text-xs text-slate-700 hover:border-primary hover:text-primary"><Paperclip className="h-3.5 w-3.5" /> {attachment.fileName}</a>)}</div>}
                    </section>
                  ))}
                </div>
              </article>
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <label className="relative block"><span className="sr-only">Search questions</span><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions and answers" className="h-14 w-full border border-border bg-white pl-12 pr-4 text-sm outline-none focus:border-primary" /></label>
                <div className="flex flex-wrap border border-border bg-slate-50 p-1">{questionTools.map((item) => <button key={item} type="button" onClick={() => setTool(item)} className={cn("px-3 py-2 text-xs transition-colors", tool === item ? "bg-primary text-white" : "text-slate-600 hover:bg-white hover:text-primary")}>{item}</button>)}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">{(["all", ...questionRequestTypes] as const).map((item) => <button key={item} type="button" onClick={() => setRequestType(item)} className={cn("border px-3 py-2 text-xs transition-colors", requestType === item ? "border-primary bg-sky-50 text-primary" : "border-border text-slate-600 hover:border-sky-300")}>{item === "all" ? "All types" : questionRequestTypeLabels[item]}</button>)}</div>
              {loading ? <div className="flex items-center justify-center gap-3 py-24 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading technical Q&amp;A…</div>
                : failed ? <div className="mt-10 border border-red-100 bg-red-50 p-8 text-center text-sm text-red-800">The Q&amp;A service is temporarily unavailable. Please try again shortly.</div>
                  : filtered.length === 0 ? <div className="mt-10 border border-border bg-slate-50 p-12 text-center"><HelpCircle className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-4 text-sm text-muted-foreground">No matching published questions.</p></div>
                    : <div className="mt-8 divide-y divide-border border-y border-border">{filtered.map((question) => <Link key={question.id} to={`/questions/${question.id}`} className={cn("group grid gap-4 py-6 transition-colors hover:bg-sky-50/50 sm:grid-cols-[150px_1fr_auto] sm:items-center sm:px-4", question.pinned && "bg-sky-50/60")}><div className="space-y-2 font-mono text-xs uppercase tracking-wider text-primary">{question.pinned && <div className="inline-flex items-center gap-1"><Pin className="h-3 w-3" /> Pinned</div>}<div>{questionRequestTypeLabels[question.requestType]}</div>{question.requestType !== "feature_request" && <div className="text-[10px] text-muted-foreground">{question.tool}</div>}</div><div><h2 className="text-lg font-light text-slate-900 group-hover:text-primary">{question.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{question.body.replace(/[#*_`>]/g, "")}</p></div><div className="flex items-center gap-3 text-xs text-muted-foreground"><span>{displayDate(question.publishedAt || question.createdAt)}</span><ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" /></div></Link>)}</div>}
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Questions;
