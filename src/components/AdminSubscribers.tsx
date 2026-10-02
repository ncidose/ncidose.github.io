import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Subscriber = {
  id: string;
  email: string;
  status: "pending" | "active" | "unsubscribed";
  source: "homepage" | "sta" | "vendor";
  created_at: string;
  confirmed_at: string | null;
};
type Directory = {
  subscribers: Subscriber[];
  total: number;
  page: number;
  counts: Partial<Record<Subscriber["status"], number>>;
  mail: { kind: string; status: string; total: number }[];
  recentMail?: { id: string; email: string; title: string; kind: string; status: string; error_message: string | null }[];
};
const sourceLabels = { homepage: "Homepage", sta: "STA form", vendor: "Vendor licensing" };
const dateLabel = (value: string) => new Date(`${value.replace(" ", "T")}Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

export const AdminSubscribers = ({ demoMode }: { demoMode: boolean }) => {
  const [data, setData] = useState<Directory | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError("");
    if (demoMode) {
      setData({ subscribers: [], total: 0, page: 1, counts: {}, mail: [] });
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams({ q: query, status, page: String(page) });
      const response = await fetch(`/api/admin/subscribers?${params}`, { credentials: "include", signal });
      if (!response.ok) throw new Error("Unable to load subscribers. Please try again.");
      const next = await response.json();
      if (!signal.aborted) setData(next);
    } catch (error) {
      if (!signal.aborted) setError(error instanceof Error ? error.message : "Unable to load subscribers.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [demoMode, query, status, page]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load, refresh]);

  const unsubscribe = async (subscriber: Subscriber) => {
    if (!window.confirm(`Unsubscribe ${subscriber.email} from scientific updates? They can subscribe again by confirming their email.`)) return;
    setBusy(subscriber.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/subscribers/${subscriber.id}`, {
        method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "unsubscribed" }),
      });
      if (!response.ok) throw new Error("Unable to unsubscribe this address. Please try again.");
      setRefresh((value) => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to unsubscribe this address.");
    } finally { setBusy(null); }
  };

  const failed = data?.mail.filter((entry) => entry.status === "failed").reduce((sum, entry) => sum + entry.total, 0) || 0;
  const queued = data?.mail.filter((entry) => ["queued", "sending"].includes(entry.status)).reduce((sum, entry) => sum + entry.total, 0) || 0;
  return (
    <section className="border border-border bg-white p-6 sm:p-8" aria-labelledby="subscribers-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="font-mono text-xs uppercase tracking-widest text-primary">Public email subscriptions</div><h2 id="subscribers-heading" className="mt-2 text-xl font-medium">Scientific Update Subscribers</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Manage people who signed up for scientific updates. Their subscriptions are separate from STA approvals, commercial licenses, and portal access.</p></div>
        <Button variant="outline" disabled={loading} onClick={() => setRefresh((value) => value + 1)} className="rounded-none"><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {([['active', 'Confirmed subscribers'], ['pending', 'Awaiting confirmation'], ['unsubscribed', 'Unsubscribed']] as const).map(([key, label]) => <div key={key} className="border border-border p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-2 text-2xl font-light">{data?.counts[key] || 0}</div></div>)}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-4 w-4" /> {queued} emails queued · {failed} failed. Confirmation, welcome, and scientific emails are tracked separately from portal announcements.</p>
      {failed > 0 && <p role="status" className="mt-3 text-sm text-amber-800">Some messages could not be sent after retries. Review subscriber mail delivery records before resending.</p>}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Input aria-label="Search subscriber email" placeholder="Search email addresses" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="rounded-none sm:max-w-sm" />
        <select aria-label="Filter subscription status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-10 border border-input bg-white px-3 text-sm"><option value="">All statuses</option><option value="active">Confirmed</option><option value="pending">Pending confirmation</option><option value="unsubscribed">Unsubscribed</option></select>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {loading ? <p role="status" className="mt-6 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading subscribers…</p> : data && <>
        <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="p-3">Email</th><th className="p-3">Status</th><th className="p-3">Signed up from</th><th className="p-3">Registered</th><th className="p-3">Action</th></tr></thead><tbody>{data.subscribers.map((subscriber) => <tr key={subscriber.id} className="border-b border-border"><td className="break-all p-3">{subscriber.email}</td><td className="p-3">{subscriber.status === "active" ? "Confirmed" : subscriber.status === "pending" ? "Pending confirmation" : "Unsubscribed"}</td><td className="whitespace-nowrap p-3">{sourceLabels[subscriber.source]}</td><td className="whitespace-nowrap p-3">{dateLabel(subscriber.created_at)}</td><td className="p-3">{subscriber.status !== "unsubscribed" && <Button variant="outline" disabled={busy !== null} onClick={() => void unsubscribe(subscriber)} className="rounded-none">{busy === subscriber.id && <Loader2 className="h-4 w-4 animate-spin" />} Unsubscribe</Button>}</td></tr>)}</tbody></table></div>
        {data.total === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No subscribers match this view.</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{data.total} subscribers · Page {page} of {Math.max(1, Math.ceil(data.total / 50))}</span><div className="flex gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="outline" disabled={page * 50 >= data.total} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
        <details className="mt-6 border-t border-border pt-4"><summary className="cursor-pointer text-sm font-medium">Recent subscriber emails</summary><div className="mt-3 divide-y divide-border">{data.recentMail?.length ? data.recentMail.map((mail) => <div key={mail.id} className="py-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{mail.title}</span><span className="text-xs uppercase text-muted-foreground">{mail.kind} · {mail.status === "sent" ? "accepted by email provider" : mail.status}</span></div><p className="mt-1 break-all text-xs text-muted-foreground">{mail.email}</p>{mail.error_message && <p className="mt-1 text-xs text-destructive">{mail.error_message}</p>}</div>) : <p className="py-3 text-sm text-muted-foreground">No subscriber emails yet.</p>}</div></details>
      </>}
    </section>
  );
};
