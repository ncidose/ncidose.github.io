import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { portalLinks } from "@/data/nciDoseTools";
import { ArrowRight, ExternalLink, MessageSquare } from "lucide-react";

const FeatureCard = ({ icon, title, description, delay = 0 }: { icon: React.ReactNode; title: string; description: string; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card inner-glow p-6 flex flex-col justify-between"
    >
      <div>
        <div className="w-12 h-12 border border-primary flex items-center justify-center mb-4 text-primary">
          {icon}
        </div>
        <h3 className="text-card-title text-foreground mb-4">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
};

const Researchers = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/3 left-0 right-0 h-px bg-border" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-border" />
          </div>
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-5xl items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="text-xs font-mono text-primary uppercase tracking-widest">
                  For Researchers
                </span>
                <h1 className="mt-4 text-hero-md lg:text-hero">
                  Research-Grade
                  <span className="block text-muted-foreground">Dose Estimation</span>
                </h1>
                <p className="mt-6 text-lg text-muted-foreground">
                  NCI Dose Tools help researchers estimate organ dose across
                  CT, nuclear medicine, and radiography/fluoroscopy studies using
                  anatomically realistic human models.
                </p>

                <p className="mt-6 text-lg text-muted-foreground">
                  Built for cohort studies, epidemiology, outcomes research, and
                  dosimetry method development, the tools are available at no cost
                  for non-commercial research use under approved agreements.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Why Researchers Use NCI Dose Tools */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center mb-16"
            >
              <span className="text-xs font-mono text-primary uppercase tracking-widest">
                Core Features
              </span>
              <h2 className="mt-4 text-section-md lg:text-section">
                Why researchers use NCI Dose Tools
              </h2>
              <p className="mt-6 text-muted-foreground max-w-3xl mx-auto">
                Researchers choose NCI Dose Tools because they provide:
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                title="Reference-grade dose estimation"
                description="Methods developed and maintained within NCI, grounded in ICRP reference data, and widely used in peer-reviewed research."
                delay={0}
              />
              <FeatureCard
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                title="Population-scale workflows"
                description="A built-in Batch module supports automated calculations for large cohorts, registries, and repeatable dose estimation."
                delay={0.1}
              />
              <FeatureCard
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                title="Anatomically realistic modeling"
                description="Size-dependent pediatric/adult phantom libraries and pregnancy phantoms with detailed fetus models."
                delay={0.2}
              />
              <FeatureCard
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                title="Consistency across studies"
                description="Standardized assumptions that support reproducibility, benchmarking, and uncertainty-aware interpretation."
                delay={0.3}
              />
              <FeatureCard
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>}
                title="Multi-modality coverage"
                description="CT (NCICT), radiography/fluoroscopy (NCIRF), nuclear medicine (NCINM), and shared anatomical models (PHANTOM)."
                delay={0.4}
              />
              <FeatureCard
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                title="Multiplatform availability"
                description="Runs across macOS, Windows, and Linux so research teams can use the tools in heterogeneous computing environments."
                delay={0.5}
              />
            </div>
          </div>
        </section>

        {/* Typical Research Applications */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center mb-16"
            >
              <span className="text-xs font-mono text-primary uppercase tracking-widest">
                Applications
              </span>
              <h2 className="mt-4 text-section-md lg:text-section">
                Typical research applications
              </h2>
            </motion.div>

            <div className="max-w-3xl mx-auto grid md:grid-cols-5 gap-4">
              {[
                "Epidemiologic and cohort-based dose estimation",
                "Outcomes and risk modeling",
                "Method development, validation, and benchmarking",
                "Sensitivity and uncertainty analyses",
                "Registry-based exposure assessment",
              ].map((application, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card p-4 flex flex-col items-start gap-3"
                >
                  <div className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary font-mono text-lg rounded-full mt-2 flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-foreground">{application}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Research access */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-5xl border border-border bg-white p-8 sm:p-12"
            >
              <div className="text-center">
                <span className="font-mono text-xs uppercase tracking-widest text-primary">Research access</span>
                <h2 className="mt-4 text-section-md">Free for approved non-commercial research</h2>
                <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-muted-foreground">
                  NCI Dose Tools are available at no cost for approved non-commercial research use. New users must complete the Software Transfer Agreement process before receiving User Portal access.
                </p>
              </div>

              <div className="mt-10 grid gap-6 text-left md:grid-cols-2">
                <div className="flex flex-col border border-primary bg-primary/5 p-6 sm:p-7">
                  <div className="font-mono text-xs uppercase tracking-widest text-primary">New research user</div>
                  <h3 className="mt-3 text-xl font-medium text-foreground">Prepare a Software Transfer Agreement</h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    An executed NCI Software Transfer Agreement (STA) is required before download access can be activated.
                  </p>
                  <ol className="mt-5 space-y-3 text-sm text-slate-700">
                    {[
                      "Confirm that your planned use is eligible non-commercial research.",
                      "Enter your institutional and authorized-official information to prepare the STA.",
                      "Review and sign the PDF, then email the signed agreement for NCI review.",
                      "After approval, use the welcome email to sign in to the User Portal.",
                    ].map((step, index) => (
                      <li key={step} className="grid grid-cols-[28px_1fr] gap-3">
                        <span className="font-mono text-xs text-primary">0{index + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <Link
                    to="/portal/request-access/"
                    className="btn-precision mt-7 inline-flex items-center justify-center gap-2"
                    data-analytics-event="research_access_start"
                    data-analytics-location="researcher_access"
                    data-analytics-tool="suite"
                    data-analytics-audience="researcher"
                    data-analytics-action="prepare_sta_request"
                  >
                    Prepare STA request <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="flex flex-col border border-border p-6 sm:p-7">
                  <div className="font-mono text-xs uppercase tracking-widest text-primary">Existing approved user</div>
                  <h3 className="mt-3 text-xl font-medium text-foreground">Sign in to the User Portal</h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    Use the email already linked to your approved account: the Gmail address previously registered with the Google Group, or the exact address in your User Portal welcome email.
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    The User Portal will repeat the sign-in and new-user guidance if you need help choosing the correct path.
                  </p>
                  <a
                    href={portalLinks.userPortal}
                    className="btn-precision mt-7 inline-flex items-center justify-center gap-2 md:mt-auto"
                    data-analytics-event="portal_login_click"
                    data-analytics-location="researcher_access"
                    data-analytics-tool="suite"
                    data-analytics-audience="approved_user"
                    data-analytics-action="open_user_portal"
                  >
                    Open User Portal <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <p className="mt-7 text-center text-xs leading-relaxed text-muted-foreground">
                STA submission does not itself grant access. NCI activates the portal account after the agreement is reviewed and approved.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Documentation and Support */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center mb-16"
            >
              <span className="text-xs font-mono text-primary uppercase tracking-widest">
                Documentation and Support
              </span>
              <h2 className="mt-4 text-section-md lg:text-section">
                Resources for Users
              </h2>
            </motion.div>

            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 border border-primary flex items-center justify-center flex-shrink-0 text-primary">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium mb-3">Technical documentation</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Current public user manuals and technical API documentation for researchers and vendors
                    </p>
                    <Link
                      to="/manuals"
                      className="text-primary hover:underline inline-flex items-center gap-1 font-mono text-sm"
                      data-analytics-event="documentation_click"
                      data-analytics-location="researcher_resources"
                      data-analytics-tool="suite"
                      data-analytics-audience="researcher"
                      data-analytics-action="browse_manuals"
                    >
                      Browse public manuals
                    </Link>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-primary text-primary">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="mb-3 font-medium text-foreground">Technical discussions</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Public questions, bug reports, feature requests, and responses from the NCI Dose Team
                    </p>
                    <Link
                      to="/discussions"
                      className="inline-flex items-center gap-1 font-mono text-sm text-primary hover:underline"
                    >
                      Browse discussions
                    </Link>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 border border-primary flex items-center justify-center flex-shrink-0 text-primary">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium mb-3">Scientific background</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Peer-reviewed publications and benchmarking studies
                    </p>
                    <Link
                      to="/literature"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-sm"
                    >
                      Literature registry <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Researchers;
