import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getLatestUpdates } from "@/data/latestUpdates.js";
import { releaseHistories } from "@/data/releases";

const updates = getLatestUpdates(releaseHistories);

export const LatestUpdates = () => (
  <section id="latest-updates" aria-labelledby="latest-updates-heading" className="pb-8 pt-2 sm:pb-10">
    <div className="container mx-auto px-6">
      <div className="border-y border-primary/20 bg-primary/[0.03] px-5 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <h2 id="latest-updates-heading" className="text-xl font-medium sm:text-2xl">Latest updates</h2>
            <p className="mt-1 text-sm text-muted-foreground">Recent changes across NCI Dose Tools.</p>
          </div>
          <Link
            to="/manuals#release-history"
            className="text-sm text-sky-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            data-analytics-event="documentation_click"
            data-analytics-location="homepage_updates"
            data-analytics-tool="suite"
            data-analytics-audience="general"
            data-analytics-action="open_release_histories"
          >
            All version histories
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {updates.map((update) => (
            <li key={update.id} className="min-w-0">
              <Link
                to={update.href}
                className="group flex h-full flex-col border border-border bg-background p-4 transition-colors hover:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                data-analytics-event="documentation_click"
                data-analytics-location="homepage_updates"
                data-analytics-tool={update.id}
                data-analytics-audience="general"
                data-analytics-action="open_release_history"
              >
                <time dateTime={update.isoDate} className="text-xs font-mono text-sky-700">{update.date}</time>
                <h3 className="mt-2 text-lg font-medium">{update.product}</h3>
                <p className="mb-4 mt-2 text-sm leading-relaxed text-muted-foreground">{update.summary}</p>
                <span className="mt-auto flex items-center gap-1 text-sm text-sky-700">
                  View changes <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
