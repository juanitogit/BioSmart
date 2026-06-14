import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/Navbar';
import { FooterSection } from '@/components/FooterSection';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { ShoppingBag, Download, Package, Tag, Calendar } from 'lucide-react';

export default function MisComprasPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLocation('/auth'); return; }
    fetchPurchases();
  }, [user]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/purchases');
      setPurchases(data.purchases || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Error al cargar historial de compras');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem('token');
    const url = `/api/purchases/export-csv`;
    const a = document.createElement('a');
    a.href = url;
    // need auth header — use fetch + blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const u = URL.createObjectURL(blob);
        a.href = u;
        a.download = 'historial-compras.csv';
        a.click();
        URL.revokeObjectURL(u);
      })
      .catch(() => toast.error('Error al exportar'));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-grow pt-32 pb-20 container mx-auto px-6 max-w-5xl">
        <header className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShoppingBag className="text-primary" size={28} />
              <h1 className="text-4xl font-bold">Mis Compras</h1>
            </div>
            <p className="text-muted-foreground">Historial completo de tus órdenes en BioSmart.</p>
          </div>
          <Button variant="outline" className="gap-2 self-start sm:self-auto" onClick={handleExportCSV}>
            <Download size={16} /> Exportar CSV
          </Button>
        </header>

        {/* Total card */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Total Gastado</p>
            <p className="text-4xl font-extrabold font-mono text-primary mt-1">${total.toFixed(2)} <span className="text-lg">USD</span></p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Órdenes</p>
            <p className="text-4xl font-extrabold font-mono text-foreground mt-1">{purchases.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-20">
            <Package size={64} className="text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-xl font-semibold text-muted-foreground">No tienes compras aún</p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-xl bg-muted/50 flex-shrink-0 overflow-hidden">
                  {purchase.product.image ? (
                    <img src={purchase.product.image} alt={purchase.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tag size={24} className="text-primary/30" />
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="font-bold text-lg">{purchase.product.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="bg-muted px-2 py-0.5 rounded-md">{purchase.product.category || 'General'}</span>
                    <span>Vendedor: <strong>{purchase.seller.name}</strong></span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(purchase.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-extrabold font-mono text-primary">${parseFloat(purchase.totalAmount).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">×{purchase.quantity} unid.</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <FooterSection />
    </div>
  );
}
