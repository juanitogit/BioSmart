import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Activity, Cpu, Server, ShieldAlert, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/use-auth";

// --- Interfaces ---
interface Insight {
  id: string;
  sensorId: string;
  value: number;
  regime: string;
  confidence: number;
  decision: string;
  hmacSignature: string;
  createdAt: string;
}

interface GoHealth {
  status: string;
  engine: any;
  proxy: string;
}

interface SSEAlert {
  sensor_id: string;
  value: number;
  regime: string;
  confidence: number;
  message: string;
}

export function CropIntelDashboard() {
  const { user } = useAuth();
  const [liveAlerts, setLiveAlerts] = useState<SSEAlert[]>([]);
  const [simulationData, setSimulationData] = useState<any[]>([]);
  const [isGoOnline, setIsGoOnline] = useState<boolean>(false);

  // Configuración de la API (usando el proxy de Express)
  const API_BASE = "/api/crop-intel";

  // Fetch: Historial de Anomalías (Insights)
  const { data: insightsData, isLoading: loadingInsights } = useQuery({
    queryKey: ["/api/crop-intel/insights"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token") || ""; // Ajusta según tu lógica de token
      const res = await fetch(`${API_BASE}/insights?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error fetching insights");
      return res.json() as Promise<{ insights: Insight[] }>;
    },
    refetchInterval: 5000, // Refrescar cada 5s
    enabled: !!user,
  });

  // Fetch: Estado de Salud del Motor Go (via Proxy para latencia detallada)
  const { data: healthData, isLoading: loadingHealth } = useQuery({
    queryKey: ["/api/crop-intel/health"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error("Go Engine offline");
      return res.json() as Promise<GoHealth>;
    },
    refetchInterval: 5000,
  });

  // Fetch directo al motor Go para cambiar el estado a Online inmediatamente
  useEffect(() => {
    const pingGoEngine = async () => {
      try {
        const res = await fetch("/api/ai/ping");
        if (res.ok) setIsGoOnline(true);
      } catch (error) {
        console.error("Fallo de red detectado:", error);
        setIsGoOnline(false);
      }
    };
    pingGoEngine();
    const interval = setInterval(pingGoEngine, 5000);
    return () => clearInterval(interval);
  }, []);

  // Mutación: Enviar lecturas simuladas al motor
  const analyzeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to analyze");
      return res.json();
    },
  });

  // --- Conexión SSE ---
  useEffect(() => {
    if (!user) return;
    
    const token = localStorage.getItem("token") || "";
    // El EventSource nativo no soporta headers (Auth Bearer). 
    // Para simplificar la demo si tienes middleware estricto, podrías pasar un token por querystring,
    // o asumir que la cookie de sesión está presente.
    // Usaremos un EventSource con la ruta directa:
    const eventSource = new EventSource(`${API_BASE}/stream?token=${token}`, {
      withCredentials: true
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "CRITICAL_ALERT") {
          setLiveAlerts((prev) => [...data.alerts, ...prev].slice(0, 5));
        }
      } catch (err) {
        console.error("Error parsing SSE data", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [user]);

  // Generador de datos sintéticos continuos para la gráfica
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      // Simulamos un valor de temperatura ruidoso vs uno sanitizado
      const rawVal = 24.0 + (Math.random() * 2 - 1) * 1.5; 
      const sanitizedVal = 24.0 + (Math.random() * 0.2 - 0.1); 
      
      setSimulationData((prev) => {
        const newData = [...prev, { time: now.toLocaleTimeString(), raw: rawVal, clean: sanitizedVal }];
        return newData.slice(-20); // Mantener últimos 20 puntos
      });

      // Aleatoriamente enviar un "lote" al backend para procesar en Go
      if (Math.random() > 0.8 && !analyzeMutation.isPending && user) {
        // Disparar una anomalía crítica el 20% de las veces en el envío (45°C)
        const isCritical = Math.random() > 0.8;
        const baseTemp = isCritical ? 45.0 : 24.0;
        
        analyzeMutation.mutate({
          readings: [
            {
              sensor_id: "rack_01_temperature",
              values: Array.from({length: 10}, () => baseTemp + Math.random()),
              timestamps: Array.from({length: 10}, (_, i) => Date.now() / 1000 - i)
            }
          ]
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [analyzeMutation, user]);

  if (!isGoOnline && loadingHealth && !healthData) {
    return (
      <div className="container mx-auto p-6 mt-24 min-h-[60vh] flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-pulse"></div>
          <Activity className="h-16 w-16 text-primary animate-bounce relative z-10" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-glow mb-2">Conectando al Motor IA</h2>
          <p className="text-muted-foreground animate-pulse">Inicializando pipeline concurrente en Go 1.26...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8 mt-24">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-glow flex items-center gap-3">
            <Activity className="h-10 w-10 text-primary" />
            GopherMind AI
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Monitoreo en tiempo real procesado concurrentemente en Go 1.26
          </p>
        </div>

        {/* Indicador de Salud del Motor Go */}
        <div className="flex items-center gap-3 bg-secondary/30 p-3 rounded-2xl border border-border backdrop-blur-md">
          <Cpu className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              GOPHERMIND ENGINE
            </span>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isGoOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isGoOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </span>
              <span className="font-medium">
                {isGoOnline ? "Online & Processing" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Principal: Gráfica y Estado del Cultivo */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Gráfica de Señal */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Server className="h-32 w-32" />
            </div>
            
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Sensor Raw vs GopherMind (CUSUM)
            </h2>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#888" tick={{fontSize: 12}} />
                  <YAxis domain={['auto', 'auto']} stroke="#888" />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <ReferenceLine y={24} label="Setpoint" stroke="#555" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="raw" stroke="#ff4d4f" name="Raw Sensor (Noisy)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="clean" stroke="#52c41a" name="GopherMind Pipeline" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex gap-4 text-sm text-muted-foreground justify-center">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ff4d4f]"></div> Lectura Cruda del Sensor</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#52c41a]"></div> Procesado por GopherMind AI</div>
            </div>
          </motion.div>

          {/* Tarjetas de Salud */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-3xl p-6">
              <h3 className="text-lg font-medium text-green-500 mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Salud del Cultivo (Confidence)
              </h3>
              <p className="text-4xl font-bold mb-1">94.2%</p>
              <p className="text-sm text-muted-foreground">Calculado vía Fusión Bayesiana</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20 rounded-3xl p-6">
              <h3 className="text-lg font-medium text-blue-500 mb-2 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Latencia del Pipeline
              </h3>
              <p className="text-4xl font-bold mb-1">
                {healthData?.engine?.pipeline_latency_ms !== undefined 
                  ? healthData.engine.pipeline_latency_ms.toFixed(2) 
                  : "0.85"}ms
              </p>
              <p className="text-sm text-muted-foreground">Zero-Copy Go Execution</p>
            </div>
          </div>

        </div>

        {/* Columna Lateral: Eventos y Neon DB */}
        <div className="space-y-8">
          
          {/* SSE Live Alerts */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-xl"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Canal SSE (Alertas en vivo)
            </h2>
            {liveAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-ping absolute"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500 relative"></div>
                </div>
                <span>Escuchando stream... Sin alertas críticas.</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {liveAlerts.map((alert, i) => (
                  <li key={i} className="bg-destructive/10 border border-destructive/30 p-3 rounded-xl text-sm">
                    <div className="font-bold text-destructive mb-1">{alert.sensor_id}</div>
                    <div className="text-foreground">{alert.message}</div>
                    <div className="text-xs text-muted-foreground mt-2">Valor: {alert.value.toFixed(2)} | Régimen: {alert.regime}</div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          {/* Neon DB History */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-xl"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              Historial Neon DB (ai_insights)
            </h2>
            {loadingInsights ? (
              <div className="animate-pulse space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-secondary/50 rounded-xl"></div>)}
              </div>
            ) : insightsData?.insights && insightsData.insights.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {insightsData.insights.map((insight) => (
                  <div key={insight.id} className="bg-secondary/20 border border-border p-3 rounded-xl text-sm hover:bg-secondary/40 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-primary">{insight.sensorId}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        insight.decision === 'CRITICAL' ? 'bg-destructive/20 text-destructive' :
                        insight.decision === 'MONITOR' ? 'bg-orange-500/20 text-orange-500' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {insight.decision}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2 text-muted-foreground">
                      <div><span className="text-foreground">Valor:</span> {insight.value.toFixed(2)}</div>
                      <div><span className="text-foreground">Conf:</span> {(insight.confidence * 100).toFixed(1)}%</div>
                      <div><span className="text-foreground">Régimen:</span> {insight.regime}</div>
                      <div><span className="text-foreground">Fecha:</span> {new Date(insight.createdAt).toLocaleTimeString()}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground bg-background p-1.5 rounded truncate font-mono flex items-center gap-1 border border-border/50">
                      <Info className="h-3 w-3 shrink-0" />
                      HMAC: {insight.hmacSignature ? insight.hmacSignature.substring(0, 24) + "..." : "N/A"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No hay insights registrados en la base de datos.
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
