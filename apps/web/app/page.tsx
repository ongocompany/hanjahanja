import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { BeforeAfterSection } from "@/components/landing/before-after-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { QuizCtaSection } from "@/components/landing/quiz-cta-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <BeforeAfterSection />
      <FeaturesSection />
      <QuizCtaSection />
      <Footer />
    </main>
  );
}
