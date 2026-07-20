import { motion } from "framer-motion";

export const Hero = () => {
  return (
    <section className="relative flex items-center justify-center overflow-hidden pb-8 pt-32 sm:pb-12 sm:pt-40">
      <div className="container mx-auto px-6 relative z-10 flex justify-center">
        <div className="max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-hero-md lg:text-hero leading-none"
          >
            NCI Dose Tools
          </motion.h1>
        </div>
      </div>
    </section>
  );
};
