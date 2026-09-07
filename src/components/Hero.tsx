import { motion } from "framer-motion";

export const Hero = () => {
  return (
    <section className="relative flex items-center justify-center overflow-hidden pb-8 pt-24 sm:pb-10 sm:pt-28">
      <div className="container mx-auto px-6 relative z-10 flex justify-center">
        <div className="max-w-4xl space-y-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-widest"
          >
            <span className="w-2 h-2 bg-primary rounded-full animate-glow-pulse" />
            Research Software &amp; Live Vendor APIs
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
            and radiography/fluoroscopy research, with a public live sandbox for
            vendor API testing and licensed pathways for production integration.
          </motion.p>
        </div>
      </div>
    </section>
  );
};
