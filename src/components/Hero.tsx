import { motion } from "framer-motion";

export const Hero = () => {
  return (
    <section className="relative flex items-center justify-center overflow-hidden pb-8 pt-24 sm:pb-12 sm:pt-32">
      <div className="container mx-auto px-6 relative z-10 flex justify-center">
        <div className="max-w-3xl space-y-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-widest"
          >
            <span className="w-2 h-2 bg-primary rounded-full animate-glow-pulse" />
            Documentation & User Support
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-hero-md lg:text-hero leading-none"
          >
            NCI Dose Tools
          </motion.h1>
        </div>
      </div>
    </section>
  );
};
