import { getFeaturedEvents, getEvents } from "@/lib/events";
import { getCategories } from "@/app/actions/categories";
import Header from "@/components/header";
import HeroSlider from "@/components/hero-slider";
import EventGrid from "@/components/event-grid";
import CartSidebar from "@/components/cart-sidebar";
import EventDetailModal from "@/components/event-detail-modal";
import Footer from "@/components/footer";

export default async function HomePage() {
  const [featured, events, categories] = await Promise.all([
    getFeaturedEvents(),
    getEvents(),
    getCategories(),
  ]);

  console.log("Events:", events);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <HeroSlider events={featured} />
        <EventGrid events={events} categories={categories} />
      </main>
      <Footer />
      <CartSidebar />
      <EventDetailModal />
    </div>
  );
}
