import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/Navbar';
import { FooterSection } from '@/components/FooterSection';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Download, FileText, FileJson, ShoppingBag, Activity } from 'lucide-react';

const PERIODS = [
  { label: '7 días', value: 7 },
  { label: '14 días', value: 14 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
  { label: '365 días', value: 365 },
];

export default function ExportarPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState(30);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  if (!user) { setLocation('/auth'); return null; }

  const downloadFile = async (url: string, filename: string, key: string) => {
    setLoadingKey(key);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Error al exportar');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(`${filename} descargado`);
    } catch {
      toast.error('Error al exportar el archivo');
    } finally {
      setLoadingKey(null);
    }
  };

  const exports = [
    {
      key: 'telemetry-csv',
      label: 'Telemetría CSV',
      description: 'Datos de sensores IoT en formato CSV (compatible con Excel, UTF-8 BOM)',
      icon: <Activity className="text-emerald-500" size={24} />,
      color: 'border-emerald-500/30 bg-emerald-500/5',
      url: `/api/export/telemetry-csv?days=${period}`,
      filename: `telemetria-${period}dias.csv`,
      buttonIcon: <FileText size={14} />,
    },
    {
      key: 'telemetry-json',
      label: 'Telemetría JSON',
      description: 'Datos de sensores IoT en formato JSON estructurado',
      icon: <Activity className="text-blue-500" size={24} />,
      color: 'border-blue-500/30 bg-blue-500/5',
      url: `/api/export/telemetry-json?days=${period}`,
      filename: `telemetria-${period}dias.json`,
      buttonIcon: <FileJson size={14} />,
    },
    {
      key: 'purchases-csv',
      label: 'Historial de Compras CSV',
      description: 'Todas tus órdenes de compra en formato CSV',
      icon: <ShoppingBag className="text-violet-500" size={24} />,
      color: 'border-violet-500/30 bg-violet-500/5',
      url: `/api/export/purchases-csv?days=${period}`,
      filename: `compras-${period}dias.csv`,
      buttonIcon: <FileText size={14} />,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-grow pt-32 pb-20 container mx-auto px-6 max-w-3xl">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Download className="text-primary" size={28} />
            <h1 className="text-4xl font-bold">Exportar Datos</h1>
          </div>
          <p className="text-muted-foreground">Descarga tus datos en diferentes formatos para análisis externo.</p>
        </header>

        {/* Period Selector */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Período de tiempo</p>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  period === p.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Export Cards */}
        <div className="space-y-4">
          {exports.map(exp => (
            <div key={exp.key} className={`border rounded-2xl p-6 flex items-center justify-between gap-4 ${exp.color}`}>
              <div className="flex items-start gap-4">
                <div className="mt-0.5">{exp.icon}</div>
                <div>
                  <h3 className="font-bold text-lg">{exp.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{exp.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Período: últimos <strong>{period} días</strong></p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 flex-shrink-0"
                disabled={loadingKey === exp.key}
                onClick={() => downloadFile(exp.url, exp.filename, exp.key)}
              >
                {loadingKey === exp.key ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                ) : exp.buttonIcon}
                Descargar
              </Button>
            </div>
          ))}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
