import AnnouncementBar from "@/components/AnnouncementBar";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import FeatureMarquee from "@/components/FeatureMarquee";
import Stats from "@/components/Stats";
import TrustedBy from "@/components/TrustedBy";
import WhyWarp from "@/components/WhyWarp";
import OpenSource from "@/components/OpenSource";
import Testimonials from "@/components/Testimonials";
import Parity from "@/components/Parity";
import StartShipping from "@/components/StartShipping";
import GetWarp from "@/components/GetWarp";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Nav />
      <main>
        <Hero />
        <FeatureMarquee />
        <Stats />
        <TrustedBy />
        <WhyWarp />
        <OpenSource />
        <Testimonials />
        <Parity />
        <StartShipping />
        <GetWarp />
      </main>
      <Footer />
    </>
  );
}
