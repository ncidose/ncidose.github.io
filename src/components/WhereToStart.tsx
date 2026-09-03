import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Building2, FlaskConical, ArrowRight, LogIn } from "lucide-react";
import { portalLinks } from "@/data/nciDoseTools";

const startingPoints = [
  {
    icon: FlaskConical,
    title: "Research Use",
    description: "Eligible non-commercial researchers can prepare the Software Transfer Agreement required before approved access.",
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
    title: "Vendor / API Integration",
    description: "Product teams can review REST API-ready components and begin the NCI evaluation and commercial licensing process.",
    link: "/vendors#commercial-access",
    linkText: "Evaluate REST APIs",
    external: false,
    color: "bg-primary",
    analyticsEvent: "vendor_evaluation_start",
    analyticsAudience: "vendor",
    analyticsAction: "evaluate_rest_api",
  },
  {
    icon: LogIn,
    title: "Approved User Portal",
    description: "Existing users with approved research or commercial access can sign in for downloads, announcements, and account support.",
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
    <section id="where-to-start" className="py-16 sm:py-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 sm:mb-12"
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
        <div className="space-y-4">
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
  <div className="flex items-center bg-white dark:bg-slate-50 border border-border  overflow-hidden transition-all duration-300 group-hover:border-primary/50">
    {/* Left accent with number */}
    <div className={`${point.color} w-16 h-full min-h-[100px] flex items-center justify-center shrink-0`}>
      <span className="font-mono text-white text-2xl font-light">
        <point.icon className="w-8 h-8 text-white" />
        {/* {String(index + 1).padStart(2, '0')} */}
      </span>
    </div>

    {/* Content */}
    <div className="flex flex-1 flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
      <div className="flex items-center gap-5">
        {/* <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
          <point.icon className="w-5 h-5 text-slate-600" />
        </div> */}
        <div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">{point.title}</h3>
          <p className="text-sm text-slate-500">{point.description}</p>
        </div>
      </div>
      
      {/* Arrow */}
      <div className="flex w-full shrink-0 items-center justify-between gap-2 text-primary sm:w-auto sm:justify-start">
        <span className="font-mono text-xs sm:text-sm">
          {point.linkText}
        </span>
        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
      </div>
    </div>
  </div>
);
