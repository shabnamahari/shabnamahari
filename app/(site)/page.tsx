import ContactHashScroll from "@/components/ContactHashScroll";
import Hero from "@/components/Hero";
import HeroVideoReveal from "@/components/HeroVideoReveal";
import Services from "@/components/Services";
import Quote from "@/components/Quote";

export default function Home() {
  return (
    <>
      <ContactHashScroll />
      <Hero />
      <HeroVideoReveal
        src="/videos/showreel.mp4"
        poster="/videos/showreel-poster.jpg"
      />
      <Services />
      <Quote />
    </>
  );
}
