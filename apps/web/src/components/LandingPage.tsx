import { Navbar } from "./landing/Navbar";
import { Hero } from "./landing/Hero";
import { TrustBar } from "./landing/TrustBar";
import { ProblemSection } from "./landing/ProblemSection";
import { SolutionSection } from "./landing/SolutionSection";
import { ProductPreview } from "./landing/ProductPreview";
import { SecuritySection } from "./landing/SecuritySection";
import { CTASection } from "./landing/CTASection";
import { Footer } from "./landing/Footer";

export function LandingPage() {
  return (
    <div className="bg-black text-white min-h-screen font-sans">
      <Navbar />
      <Hero />
      <TrustBar />
      <ProblemSection />
      <SolutionSection />
      <ProductPreview />
      <SecuritySection />
      <CTASection />
      <Footer />
    </div>
  );
}
