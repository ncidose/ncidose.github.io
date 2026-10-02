import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Building2, FlaskConical, ArrowRight, LogIn } from "lucide-react";
import { portalLinks } from "@/data/nciDoseTools";

const startingPoints = [
  {
    icon: FlaskConical,
    title: "For Researchers",
    description: "Prepare an STA for non-commercial research access.",
    link: "/portal/request-access/",
    linkText: "Request Research Access",
    external: false,
    color: "bg-primary",
    analyticsEvent: "research_access_start",
    analyticsAudience: "researcher",
    analyticsAction: "request_research_access",
  },
  {
    icon: Building2,
    title: "For Vendors",
    description: "Explore the APIs and discuss commercial licensing.",
    link: "/vendors",
    linkText: "APIs & Commercial Licensing",
    external: false,
    color: "bg-primary",
    analyticsEvent: "vendor_sandbox_open",
    analyticsAudience: "vendor",
    analyticsAction: "open_live_demo",
  },
  {
    icon: LogIn,
    title: "Approved User Portal",
    description: "Sign in for downloads and account support.",
    link: portalLinks.userPortal,
    linkText: "Open Portal",
    external: true,
    color: "bg-primary",
    analyticsEvent: "portal_login_click",
    analyticsAudience: "approved_user",
    analyticsAction: "open_user_portal",
  },
];

export const WhereToStart = () => {
  return (
    <section id="where-to-start" className="pb-8 pt-2 sm:pb-10">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="sr-only"
        >
          <span className="text-xs font-mono text-primary uppercase tracking-widest">
            Getting Started
          </span>
          <h2 className="mt-4 text-section-md lg:text-section">
            Where to Start
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl">
            Choose your path based on your role and objectives.
          </p>
        </motion.div>

        {/* Horizontal cards layout */}
        <div className="grid gap-3 md:grid-cols-3">
          {startingPoints.map((point, index) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {point.external ? (
                <a
                  href={point.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${point.title}: ${point.linkText} (opens in a new tab)`}
                  className="group block"
                  data-analytics-event={point.analyticsEvent}
                  data-analytics-location="homepage_pathway"
                  data-analytics-tool="suite"
                  data-analytics-audience={point.analyticsAudience}
                  data-analytics-action={point.analyticsAction}
                >
                  <CardContent point={point} />
                </a>
              ) : (
                <Link
                  to={point.link}
                  className="group block"
                  data-analytics-event={point.analyticsEvent}
                  data-analytics-location="homepage_pathway"
                  data-analytics-tool="suite"
                  data-analytics-audience={point.analyticsAudience}
                  data-analytics-action={point.analyticsAction}
                >
                  <CardContent point={point} />
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CardContent = ({ point }: { point: typeof startingPoints[0] }) => (
  <div className="flex h-full items-start gap-3 border border-border bg-white p-4 transition-colors group-hover:border-primary sm:p-5">
    <point.icon className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <h3 className="text-lg font-medium text-slate-900">{point.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{point.description}</p>
      <div className="mt-3 flex items-center gap-2 text-sm font-medium text-primary">
        {point.linkText}<ArrowRight className="h-4 w-4 shrink-0" />
      </div>
    </div>
  </div>
);
