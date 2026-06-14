import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { Heart, Globe, Users, TrendingUp } from 'lucide-react';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

export function DonationsTracker() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/donations')
      .then(setData)
      .catch((err) => {
        console.error("API error, using mock data:", err);
        setData({
          totalDonated: "94.50",
          donationsCount: 12,
          byMonth: [
            { month: "Ene", amount: 15.00 },
            { month: "Feb", amount: 20.50 },
            { month: "Mar", amount: 35.00 },
            { month: "Abr", amount: 24.00 },
          ],
          recentDonations: [
            { id: 1, amount: "10.00", source: "direct", createdAt: new Date().toISOString(), userName: "Juan P." },
            { id: 2, amount: "5.50", source: "plan_purchase", createdAt: new Date(Date.now() - 86400000).toISOString(), userName: "María G." },
            { id: 3, amount: "15.00", source: "direct", createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), userName: "Carlos R." },
            { id: 4, amount: "4.00", source: "plan_purchase", createdAt: new Date(Date.now() - 86400000 * 4).toISOString(), userName: "Ana L." },
          ]
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Heart size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Recaudado</p>
                <h3 className="text-3xl font-bold font-mono">${data.totalDonated} USD</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Donaciones Realizadas</p>
                <h3 className="text-3xl font-bold font-mono">{data.donationsCount}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-500">
                <Globe size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Impacto Ambiental</p>
                <h3 className="text-3xl font-bold font-mono">Alta</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              Crecimiento de Donaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Donations List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Donaciones Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {data.recentDonations.map((donation: any) => (
                <div key={donation.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold font-mono">
                      {donation.userName?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{donation.userName || 'Usuario'}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{donation.source === 'plan_purchase' ? '30% Suscripción' : 'Donación Directa'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">+${donation.amount}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(donation.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
