import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Featured from "@/components/Featured";
import AnonymousForm from "@/components/AnonymousForm";
import Promo from "@/components/Promo";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Featured />
      <AnonymousForm />
      <Promo />
      <Footer />
    </main>
  );
};

export default Index;