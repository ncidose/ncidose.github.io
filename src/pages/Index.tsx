import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { WhatAreTools } from "@/components/WhatAreTools";
import { GlobalMap } from "@/components/GlobalMap";
import { WhereToStart } from "@/components/WhereToStart";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <WhatAreTools />
        <GlobalMap />
        <WhereToStart />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
