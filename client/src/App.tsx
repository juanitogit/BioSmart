import { Route, Router } from 'wouter';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider } from './hooks/use-auth';
import { Toaster } from './components/ui/sonner';
import { HeroSection } from './components/HeroSection';
import { ImpactSection } from './components/ImpactSection';
import { VerticalGardensSection } from './components/VerticalGardensSection';
import { CompostingSection } from './components/CompostingSection';
import { TechnologiesSection } from './components/TechnologiesSection';
import { DashboardSection } from './components/DashboardSection';
import { FooterSection } from './components/FooterSection';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './components/AdminDashboard';
import { DonationsTracker } from './components/DonationsTracker';
import { Marketplace } from './components/Marketplace';
import { CropIntelDashboard } from './components/CropIntelDashboard';
import { Education } from './components/Education';
import { PricingSection } from './components/PricingSection';
import { AIChatbot } from './components/AIChatbot';
import AuthPage from './pages/auth-page';
import AuthSuccessPage from './pages/auth-success';
import ProductDetailPage from './pages/product-detail';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="app-theme">
        <AuthProvider>
          <Router>
          <Route path="/">
            {() => <HomePage />}
          </Route>
          <Route path="/auth">
            {() => <AuthPage />}
          </Route>
          <Route path="/dashboard">
            {() => <DashboardPage />}
          </Route>
          <Route path="/auth-success">
            {() => <AuthSuccessPage />}
          </Route>
          <Route path="/marketplace">
            {() => <MarketplacePage />}
          </Route>
          <Route path="/productos-detalle/:id">
            {() => <ProductDetailPage />}
          </Route>
          <Route path="/education">
            {() => <EducationPage />}
          </Route>
          <Route path="/donations">
            {() => <DonationsPage />}
          </Route>
          <Route path="/telemetry">
            {() => <TelemetryPage />}
          </Route>
          <Route path="/admin">
            {() => <AdminPage />}
          </Route>
        </Router>
        <AIChatbot />
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <ImpactSection />
      <VerticalGardensSection />
      <CompostingSection />
      <TechnologiesSection />
      <PricingSection />
      <DashboardSection />
      <FooterSection />
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20">
        <DashboardSection />
      </div>
    </div>
  );
}

function MarketplacePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-32 pb-20 container mx-auto px-6">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Marketplace Sostenible</h1>
          <p className="text-muted-foreground">Adquiere tecnologías, herramientas e insumos directamente de productores locales.</p>
        </header>
        
        <Marketplace />
      </div>
      <FooterSection />
    </div>
  );
}

function EducationPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-32 pb-20 container mx-auto px-6">
        <header className="mb-16 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Centro de Conocimiento</h1>
          <p className="text-xl text-muted-foreground">Recursos gratuitos y guías avanzadas para convertirte en un experto de la agricultura urbana y tecnológica.</p>
        </header>
        
        <Education />
      </div>
      <FooterSection />
    </div>
  );
}

function DonationsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-32 pb-20 container mx-auto px-6">
        <header className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-glow">Muro de Impacto</h1>
          <p className="text-lg text-muted-foreground">Explora de dónde provienen los aportes mundiales a nuestras iniciativas urbanas tecnológicas en tiempo real.</p>
        </header>

        {/* 3D Globe Section */}
        <section className="mb-16 flex justify-center">
          <div className="w-full max-w-5xl h-[400px] md:h-[500px] rounded-3xl overflow-hidden border border-border shadow-2xl relative glow-effect">
            <iframe 
              src="/globe.html" 
              className="w-full h-full border-none pointer-events-auto" 
              title="Donaciones Globales 3D"
            />
          </div>
        </section>

        {/* Charts & Table Section */}
        <DonationsTracker />
      </div>
      <FooterSection />
    </div>
  );
}

function AdminPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20">
        <AdminDashboard />
      </div>
    </div>
  );
}

function TelemetryPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <CropIntelDashboard />
      <FooterSection />
    </div>
  );
}
