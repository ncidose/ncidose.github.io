import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { portalLinks, publicationSearches } from "@/data/nciDoseTools";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ExternalLink,
  FileText,
  Globe2,
  LockKeyhole,
  MessageSquare,
} from "lucide-react";

const portalCards = [
  {
    icon: BookOpen,
    eyebrow: "Public Documentation",
    title: "Manuals & API Documentation",
    description:
      "Search current NCICT, NCINM, NCIRF, PHANTOM, and vendor REST API manuals in one public documentation library.",
    href: "/manuals",
    linkText: "Browse manuals",
    external: false,
  },
  {
    icon: BadgeCheck,
    eyebrow: "Official NCI Website",
    title: "DCEG Radiation Dosimetry Tools",
    description:
      "The authoritative NCI website for institutional context and information about NCI radiation dosimetry tools.",
    href: portalLinks.officialNci,
    linkText: "Open official NCI website",
    external: true,
  },
  {
    icon: MessageSquare,
    eyebrow: "Public Knowledge Base",
    title: "Community Discussions",
    description:
      "Read technical questions, bug reports, feature requests, and NCI Dose Team responses. Approved users can participate through the User Portal.",
    href: "/discussions",
    linkText: "Browse discussions",
    external: false,
  },
  {
    icon: LockKeyhole,
    eyebrow: "Approved Users",
    title: "NCI Dose Tools User Portal",
    description:
      "The secure portal for approved-user downloads, announcements, account management, and discussion participation.",
    href: portalLinks.userPortal,
    linkText: "Open User Portal",
    external: true,
  },
];

const userPaths = [
  {
    title: "First-time visitor",
    text: "Start here for plain-language tool summaries, modality coverage, and access options.",
    href: "/tools",
    linkText: "View tool summaries",
    external: false,
  },
  {
    title: "Research user",
    text: "Prepare the Software Transfer Agreement required before approved non-commercial research access.",
    href: "/portal/request-access/",
    linkText: "Request research access",
    external: false,
  },
  {
    title: "Commercial vendor",
    text: "Commercial use, product integration, or vendor evaluation requires review through the NCI Technology Transfer Center and an appropriate licensing agreement.",
    href: "/vendors",
    linkText: "Vendor integration path",
    external: false,
  },
  {
    title: "Technical implementer",
    text: "Read public user and REST API manuals, release histories, and technical discussions directly on this site.",
    href: "/manuals",
    linkText: "Browse technical manuals",
    external: false,
  },
];

const PortalCardContent = ({ portal }: { portal: (typeof portalCards)[number] }) => (
  <>
    <div>
      <div className="mb-6 flex h-10 w-10 items-center justify-center border border-primary text-primary">
        <portal.icon className="h-5 w-5" />
      </div>
      <div className="font-mono text-xs uppercase tracking-widest text-primary">
        {portal.eyebrow}
      </div>
      <h2 className="mt-3 text-xl font-medium text-slate-900">{portal.title}</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {portal.description}
      </p>
    </div>
    <div className="mt-8 flex items-center gap-2 font-mono text-sm text-primary">
      {portal.linkText}
      {portal.external ? (
        <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      ) : (
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      )}
    </div>
  </>
);

const Research = () => {
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
                Links & Resources
              </span>
              <h1 className="mt-4 text-hero-md lg:text-hero">
                Public Technical Site,
                <span className="block text-muted-foreground">Official Website, Approved Access</span>
              </h1>
              <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
                The official NCI website, this public technical site, and the secure
                User Portal each serve a distinct purpose. This site is the central
                public location for technical documentation and user support, while the
                official NCI website remains the authoritative institutional source.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="grid gap-4 lg:grid-cols-4">
              {portalCards.map((portal, index) => (
                <motion.div
                  key={portal.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  {portal.external ? (
                    <a
                      href={portal.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={portal.href === portalLinks.userPortal ? `${portal.title} (opens in a new tab)` : undefined}
                      className="group flex min-h-[320px] flex-col justify-between border border-border bg-white p-6 transition-colors hover:border-primary"
                      data-analytics-event={portal.href === portalLinks.userPortal ? "portal_login_click" : undefined}
                      data-analytics-location={portal.href === portalLinks.userPortal ? "resources_card" : undefined}
                      data-analytics-tool={portal.href === portalLinks.userPortal ? "suite" : undefined}
                      data-analytics-audience={portal.href === portalLinks.userPortal ? "approved_user" : undefined}
                      data-analytics-action={portal.href === portalLinks.userPortal ? "open_user_portal" : undefined}
                    >
                      <PortalCardContent portal={portal} />
                    </a>
                  ) : (
                    <Link
                      to={portal.href}
                      className="group flex min-h-[320px] flex-col justify-between border border-border bg-white p-6 transition-colors hover:border-primary"
                      data-analytics-event={portal.href === "/manuals" ? "documentation_click" : undefined}
                      data-analytics-location={portal.href === "/manuals" ? "resources_card" : undefined}
                      data-analytics-tool={portal.href === "/manuals" ? "suite" : undefined}
                      data-analytics-audience={portal.href === "/manuals" ? "general" : undefined}
                      data-analytics-action={portal.href === "/manuals" ? "browse_manuals" : undefined}
                    >
                      <PortalCardContent portal={portal} />
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-10 max-w-3xl"
            >
              <span className="font-mono text-xs uppercase tracking-widest text-primary">
                Literature Registry
              </span>
              <h2 className="mt-4 text-section-md lg:text-section">
                Year-by-year publication pages
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">
                Generated literature pages summarize PubMed and PubMed Central
                results separately for each NCI Dose Tool, using modality-specific
                search terms to keep the lists focused.
              </p>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {publicationSearches.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    to={`/literature/${item.id}`}
                    className="group block h-full border border-border bg-white p-6 transition-colors hover:border-primary"
                  >
                    <div className="font-mono text-xs uppercase tracking-widest text-primary">
                      {item.tool}
                    </div>
                    <h3 className="mt-3 text-xl font-medium text-slate-900">
                      {item.modality}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      {item.summary}
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 font-mono text-sm text-primary">
                      Open literature page
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-20">
          <div className="container mx-auto px-6">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="font-mono text-xs uppercase tracking-widest text-primary">
                  How the sites work together
                </span>
                <h2 className="mt-4 text-section-md lg:text-section">
                  A clear path from information to access
                </h2>
                <p className="mt-5 text-muted-foreground leading-relaxed">
                  Use this public technical site to learn about the tools, read current
                  manuals and release histories, review literature, and search community
                  discussions. Use the official NCI website for institutional information
                  and the secure User Portal for approved downloads and participation.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="grid gap-3"
              >
                {[
                  "Tool summaries, manuals, API documentation, release histories, literature, and public discussions are available directly on this site.",
                  "The official NCI website remains the authoritative institutional source for NCI context and access policy.",
                  "Approved users use the secure User Portal for software downloads, announcements, account management, and posting or replying to discussions.",
                  "Anyone can read the public documentation and community discussions without signing in.",
                ].map((item) => (
                  <div key={item} className="flex gap-4 border border-border bg-white p-4">
                    <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <p className="text-sm leading-relaxed text-slate-700">{item}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-12"
            >
              <span className="font-mono text-xs uppercase tracking-widest text-primary">
                Navigation
              </span>
              <h2 className="mt-4 text-section-md lg:text-section">
                Where each visitor should go
              </h2>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2">
              {userPaths.map((path, index) => (
                <motion.div
                  key={path.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  {path.external ? (
                    <a
                      href={path.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block h-full border border-border bg-white p-6 transition-colors hover:border-primary"
                    >
                      <VisitorPathContent path={path} index={index} />
                    </a>
                  ) : (
                    <Link
                      to={path.href}
                      className="group block h-full border border-border bg-white p-6 transition-colors hover:border-primary"
                      data-analytics-event={path.title === "Research user" ? "research_access_start" : path.title === "Commercial vendor" ? "vendor_evaluation_start" : path.title === "Technical implementer" ? "documentation_click" : undefined}
                      data-analytics-location={path.title === "First-time visitor" ? undefined : "resources_user_path"}
                      data-analytics-tool={path.title === "First-time visitor" ? undefined : "suite"}
                      data-analytics-audience={path.title === "Research user" ? "researcher" : path.title === "Commercial vendor" ? "vendor" : path.title === "Technical implementer" ? "general" : undefined}
                      data-analytics-action={path.title === "Research user" ? "request_research_access" : path.title === "Commercial vendor" ? "view_vendor_path" : path.title === "Technical implementer" ? "browse_manuals" : undefined}
                    >
                      <VisitorPathContent path={path} index={index} />
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

const VisitorPathContent = ({
  path,
  index,
}: {
  path: (typeof userPaths)[number];
  index: number;
}) => (
  <>
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center border border-primary text-primary">
        {index === 0 ? (
          <Globe2 className="h-4 w-4" />
        ) : index === 1 ? (
          <FileText className="h-4 w-4" />
        ) : index === 2 ? (
          <BadgeCheck className="h-4 w-4" />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
      </div>
      <h3 className="font-medium text-slate-900">{path.title}</h3>
    </div>
    <p className="text-sm leading-relaxed text-muted-foreground">
      {path.text}
    </p>
    <div className="mt-5 inline-flex items-center gap-2 font-mono text-sm text-primary">
      {path.linkText}
      {path.external ? (
        <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      ) : (
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      )}
    </div>
  </>
);

export default Research;
