import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { portalLinks } from "@/data/nciDoseTools";

export const Hero = () => {
  return (
    <section className="relative flex items-center justify-center overflow-hidden pb-16 pt-28 sm:pb-20 sm:pt-36">
      <div className="container mx-auto px-6 relative z-10 flex justify-center">
        <div className="max-w-4xl space-y-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-widest"
          >
            <span className="w-2 h-2 bg-primary rounded-full animate-glow-pulse" />
            Research Software &amp; Vendor API Evaluation
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-hero-md lg:text-hero leading-none"
          >
            NCI Dose Tools
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            NCI-developed organ-dose estimation tools for CT, nuclear medicine,
            and radiography/fluoroscopy research, with REST API pathways for
            approved vendor integration.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-stretch justify-center gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <Link
              to="/portal/request-access/"
              className="btn-precision inline-flex items-center justify-center text-sm"
              data-analytics-event="research_access_start"
              data-analytics-location="homepage_hero"
              data-analytics-tool="suite"
              data-analytics-audience="researcher"
              data-analytics-action="request_research_access"
            >
              Request Research Access
            </Link>
            <Link
              to="/vendors#commercial-access"
              className="btn-precision-outline inline-flex items-center justify-center text-sm"
              data-analytics-event="vendor_evaluation_start"
              data-analytics-location="homepage_hero"
              data-analytics-tool="suite"
              data-analytics-audience="vendor"
              data-analytics-action="evaluate_rest_api"
            >
              Evaluate REST APIs
            </Link>
            <a
              href={portalLinks.userPortal}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Approved User Portal (opens in a new tab)"
              className="btn-precision-outline inline-flex items-center justify-center gap-2 text-sm"
              data-analytics-event="portal_login_click"
              data-analytics-location="homepage_hero"
              data-analytics-tool="suite"
              data-analytics-audience="approved_user"
              data-analytics-action="open_user_portal"
            >
              Approved User Portal <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
