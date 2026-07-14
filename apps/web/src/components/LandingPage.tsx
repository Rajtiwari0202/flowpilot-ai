import { Navbar } from "./landing/Navbar";
import { Hero } from "./landing/Hero";
import { ProblemSection } from "./landing/ProblemSection";
import { SolutionSection } from "./landing/SolutionSection";
import { FeaturesSection } from "./landing/FeaturesSection";
import { ProductPreview } from "./landing/ProductPreview";
import { SecuritySection } from "./landing/SecuritySection";
import { Footer } from "./landing/Footer";

export function LandingPage() {
  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      <Navbar />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <ProductPreview />
      <SecuritySection />
      <Footer />
    </div>
  );
}
