import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/Navbar';
import { FooterSection } from '@/components/FooterSection';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Package, Tag, Calendar } from 'lucide-react';

export default function MisVentasPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLocation('/auth'); return; }
    if (user.role !== 'seller' && user.role !== 'admin') {
      toast.error('Acceso solo para vendedores');
      setLocation('/marketplace');
      return;
    }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [s, m, t, r] = await Promise.all([
        apiGet('/seller/stats'),
        apiGet('/seller/monthly-revenue'),
        apiGet('/seller/top-products'),
        apiGet('/seller/recent-sales'),
      ]);
      setStats(s.stats);
      setMonthly(m.monthly || []);
      setTopProducts(t.topProducts || []);
      setRecentSales(r.recentSales || []);
    } catch {
      toast.error('Error al cargar dashboard de ventas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const kpis = stats ? [
    { label: 'Ingresos Totales', value: `$${parseFloat(stats.totalRevenue).toFixed(2)}`, icon: <DollarSign size={22} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Ventas Totales', value: stats.totalSales, icon: <ShoppingBag size={22} />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Productos Activos', value: stats.activeProducts, icon: <Package size={22} />, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: 'Ticket Promedio', value: `$${stats.avgTicket}`, icon: <TrendingUp size={22} />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ] : [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-grow pt-32 pb-20 container mx-auto px-6 max-w-6xl">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-primary" size={28} />
            <h1 className="text-4xl font-bold">Dashboard de Ventas</h1>
          </div>
          <p className="text-muted-foreground">Resumen de tus ingresos, productos y ventas recientes.</p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-3 ${kpi.color}`}>
                {kpi.icon}
              </div>
              <p className="text-sm text-muted-foreground font-semibold">{kpi.label}</p>
              <p className="text-2xl font-extrabold font-mono mt-1">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          {/* Monthly Revenue Chart */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Ingresos Mensuales</h2>
            {monthly.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sin datos de los últimos 6 meses</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthly.map(m => ({ name: m.month, Ingresos: parseFloat(m.revenue) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => [`$${v.toFixed(2)}`, 'Ingresos']} />
                  <Bar dataKey="Ingresos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top 5 Products */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Top 5 Productos</h2>
            {topProducts.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No hay ventas registradas</div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                      {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Tag size={16} className="m-auto mt-3 text-primary/30" />}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sales_count} ventas</p>
                    </div>
                    <span className="font-bold font-mono text-primary text-sm">${parseFloat(p.revenue).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-6">Ventas Recientes</h2>
          {recentSales.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No hay ventas recientes</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-semibold">Producto</th>
                    <th className="pb-3 pr-4 font-semibold">Comprador</th>
                    <th className="pb-3 pr-4 font-semibold">Cant.</th>
                    <th className="pb-3 pr-4 font-semibold">Total</th>
                    <th className="pb-3 font-semibold">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                            {sale.product_image ? <img src={sale.product_image} alt="" className="w-full h-full object-cover" /> : <Tag size={14} className="m-auto mt-2 text-primary/30" />}
                          </div>
                          <span className="font-medium truncate max-w-[150px]">{sale.product_name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{sale.buyer_name}</td>
                      <td className="py-3 pr-4">{sale.quantity}</td>
                      <td className="py-3 pr-4 font-bold font-mono text-primary">${parseFloat(sale.total_amount).toFixed(2)}</td>
                      <td className="py-3 text-muted-foreground flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(sale.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
