import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell
} from 'recharts';
import { Activity, Droplets, Thermometer, Sun, Wind, Beaker, Sprout, Zap, AlertTriangle, Heart, Users } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { toast } from 'sonner';

// Generador de datos simulados
const generateData = () => {
  return Array.from({ length: 20 }).map((_, i) => ({
    time: `${i}:00`,
    temp: 20 + Math.random() * 5,
    hum: 60 + Math.random() * 15,
    ph: 5.5 + Math.random() * 1.5,
    light: 300 + Math.random() * 200,
  }));
};

export function DashboardSection() {
  const [data, setData] = useState(generateData());
  const [activeTab, setActiveTab] = useState('clima');
  const [alerts, setAlerts] = useState<string[]>([]);

  // Actualizar datos periódicamente para simular tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prevData => {
        const newData = [...prevData.slice(1)];
        const last = prevData[prevData.length - 1];
        
        // Simular pequeñas variaciones
        const nextTemp = last.temp + (Math.random() - 0.5) * 1;
        const nextHum = last.hum + (Math.random() - 0.5) * 2;
        
        // Generar alertas aleatorias
        if (nextTemp > 24.5 && !alerts.includes("Alerta Temp Alta")) {
          setAlerts(prev => ["Alerta Temp Alta", ...prev].slice(0, 3));
        }
        
        newData.push({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          temp: nextTemp,
          hum: nextHum,
          ph: 5.5 + Math.random() * 1.5,
          light: 300 + Math.random() * 200,
        });
        return newData;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [alerts]);

  const currentValues = data[data.length - 1];

  return (
    <section id="dashboard" className="py-32 relative bg-background text-foreground overflow-hidden">
      {/* Background tech grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto" />
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-foreground"
          >
            Centro de Control <span className="text-blue-400">IoT</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground"
          >
            Miles de sensores alimentando algoritmos predictivos. Nuestras plantas hablan; nosotros traducimos sus necesidades en acciones automatizadas.
          </motion.p>
        </div>

        {/* Dashboard UI */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="rounded-3xl border border-border bg-card/80 backdrop-blur-xl overflow-hidden shadow-2xl shadow-blue-900/10"
        >
          {/* Dashboard Header */}
          <div className="border-b border-border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/30">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                Módulo Central Biosfera-01
              </h3>
              <p className="text-sm text-muted-foreground mt-1 font-mono">ID: AST-8492-X | Estado: Nominal</p>
              
              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="w-4 h-[1px] bg-primary/50"></span> Nuestras Tecnologías
                </p>
                <div className="flex flex-col sm:flex-row items-stretch gap-4 mt-6 w-full max-w-xl">
                  <div className="flex-1 rounded-2xl overflow-hidden border border-border bg-muted/30 relative group shadow-sm hover:shadow-lg transition-all">
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-end p-4">
                      <span className="font-bold text-sm tracking-wide text-foreground">Hardware IoT</span>
                    </div>
                    <img src="/images/arduino.png" alt="Arduino IoT" className="w-full h-32 md:h-40 object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="flex-1 rounded-2xl overflow-hidden border border-border bg-muted/30 relative group shadow-sm hover:shadow-lg transition-all">
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-end p-4">
                      <span className="font-bold text-sm tracking-wide text-foreground">Panel Blynk</span>
                    </div>
                    <img src="/images/blynk.png" alt="Blynk App" className="w-full h-32 md:h-40 object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex bg-muted/50 rounded-lg p-1 border border-border">
              <button 
                onClick={() => setActiveTab('clima')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'clima' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Clima
              </button>
              <button 
                onClick={() => setActiveTab('donaciones')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'donaciones' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Donaciones
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'clima' ? (
              <>
                {/* Live Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <MetricCard 
                    icon={<Thermometer className="text-orange-400" />}
                    title="Temperatura"
                    value={`${currentValues.temp.toFixed(1)}°C`}
                    trend="+0.2°C"
                    color="orange"
                  />
                  <MetricCard 
                    icon={<Droplets className="text-blue-400" />}
                    title="Humedad Rel."
                    value={`${currentValues.hum.toFixed(1)}%`}
                    trend="-1.5%"
                    color="blue"
                  />
                  <MetricCard 
                    icon={<Sun className="text-yellow-400" />}
                    title="Luz PAR"
                    value={`${Math.round(currentValues.light)} μmol`}
                    trend="Estable"
                    color="yellow"
                  />
                  <MetricCard 
                    icon={<Beaker className="text-purple-400" />}
                    title="pH Solución"
                    value={currentValues.ph.toFixed(2)}
                    trend="+0.05"
                    color="purple"
                  />
                </div>

                {/* Main Chart Area */}
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 rounded-2xl border border-border bg-card/60 p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-semibold text-foreground">Análisis Temporal</h4>
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                        <Activity size={12} /> Actualizando...
                      </span>
                    </div>
                    
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="time" stroke="#52525b" tick={{fill: '#71717a', fontSize: 12}} tickMargin={10} minTickGap={30} />
                          <YAxis stroke="#52525b" tick={{fill: '#71717a', fontSize: 12}} width={40} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                            itemStyle={{ color: '#e4e4e7' }}
                            labelStyle={{ color: '#a1a1aa' }}
                          />
                          <Area type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
                          <Area type="monotone" dataKey="hum" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorHum)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Side Panel - Alerts & Actions */}
                  <div className="flex flex-col gap-6">
                    <div className="rounded-2xl border border-border bg-card/60 p-6 flex-1">
                      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Zap size={16} className="text-yellow-500" />
                        Acciones Automatizadas
                      </h4>
                      
                      <div className="space-y-3">
                        <ActionItem label="Bomba de Riego A" status="Activa" time="Ahora" active />
                        <ActionItem label="Ventilación Extractor" status="Reposo" time="Hace 5m" />
                        <ActionItem label="Luces LED Espectro" status="Activa" time="Continuo" active />
                        <ActionItem label="Dosificador Nutrientes" status="Programado" time="En 2h" />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card/60 p-4">
                      <h4 className="font-semibold text-foreground mb-3 text-sm flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-500" />
                        Registro de Alertas
                      </h4>
                      <div className="space-y-2 max-h-[100px] overflow-y-auto">
                        <AnimatePresence>
                          {alerts.length > 0 ? (
                            alerts.map((alert, i) => (
                              <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-xs p-2 rounded bg-red-500/10 border border-red-500/20 text-red-500 flex justify-between"
                              >
                                <span>{alert}</span>
                                <span className="opacity-50">Justo ahora</span>
                              </motion.div>
                            ))
                          ) : (
                            <div className="text-xs text-muted-foreground p-2 text-center">No hay alertas recientes. Sistema estable.</div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <DonationsWidget />
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function MetricCard({ icon, title, value, trend, color }: any) {
  const bgColors = {
    orange: 'bg-orange-500/10 border-orange-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20',
    yellow: 'bg-yellow-500/10 border-yellow-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
    green: 'bg-green-500/10 border-green-500/20',
  };

  return (
    <div className={`rounded-2xl border ${bgColors[color as keyof typeof bgColors]} p-4 flex flex-col justify-between h-32 hover:bg-opacity-20 transition-all cursor-default`}>
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg bg-background/60 shadow-sm`}>
          {icon}
        </div>
        <span className="text-xs font-mono text-muted-foreground">{trend}</span>
      </div>
      <div>
        <p className="text-muted-foreground text-sm">{title}</p>
        <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ActionItem({ label, status, time, active = false }: any) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-muted-foreground'}`} />
        <span className="text-sm text-foreground/90">{label}</span>
      </div>
      <div className="text-right">
        <p className={`text-xs ${active ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>{status}</p>
        <p className="text-[10px] text-muted-foreground/70 font-mono">{time}</p>
      </div>
    </div>
  );
}

function DonationsWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState<string>('');
  const [isDonating, setIsDonating] = useState(false);

  const fetchDonations = () => {
    apiGet('/donations')
      .then(setData)
      .catch((err) => {
        console.error(err);
        setData({ totalDonated: 1250, donationsCount: 45 });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const handleDonate = async () => {
    if (!donationAmount || isNaN(Number(donationAmount)) || Number(donationAmount) <= 0) {
      toast.error('Por favor ingresa una cantidad válida');
      return;
    }
    
    setIsDonating(true);
    let lat = null;
    let lng = null;

    try {
      if ("geolocation" in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }
    } catch (e) {
      console.log('Permiso de ubicación denegado o error:', e);
    }

    try {
      await apiPost('/donations', { amount: donationAmount, lat, lng });
      toast.success('¡Gracias por tu aporte!');
      setDonationAmount('');
      fetchDonations(); // Refresh stats
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar donación');
    } finally {
      setIsDonating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-300">
      <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col justify-center items-center text-center h-64 shadow-sm hover:shadow-md transition-all">
        <div className="bg-red-500/10 p-4 rounded-full mb-4">
          <Heart className="text-red-500 h-8 w-8" />
        </div>
        <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Total Recaudado</p>
        <h3 className="text-5xl font-black text-foreground">${data?.totalDonated || 0} <span className="text-2xl text-muted-foreground">USD</span></h3>
      </div>
      <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col justify-center items-center text-center h-64 shadow-sm hover:shadow-md transition-all">
        <div className="bg-blue-500/10 p-4 rounded-full mb-4">
          <Users className="text-blue-500 h-8 w-8" />
        </div>
        <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Total Aportantes</p>
        <h3 className="text-5xl font-black text-foreground">{data?.donationsCount || 0} <span className="text-2xl text-muted-foreground">Aportes</span></h3>
        <p className="text-xs text-muted-foreground mt-4">Calculado a partir de aportes directos y suscripciones</p>
      </div>
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-col justify-center items-center text-center h-64 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <h4 className="font-bold text-lg mb-2 text-foreground">Haz tu aporte directo</h4>
        <p className="text-xs text-muted-foreground mb-6">Financia el desarrollo de tecnologías urbanas</p>
        
        <div className="w-full max-w-[200px] flex flex-col gap-3 relative z-10">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
            <input 
              type="number" 
              min="1"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
              placeholder="0.00" 
              className="flex h-11 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
            />
          </div>
          <button 
            onClick={handleDonate}
            disabled={isDonating}
            className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-4 py-2"
          >
            {isDonating ? 'Procesando...' : 'Donar Ahora'}
          </button>
        </div>
      </div>
    </div>
  );
}
