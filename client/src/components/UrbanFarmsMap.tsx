import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, X, Leaf, Droplets, Sun, Home, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

interface Farm {
  id: number;
  name: string;
  description: string | null;
  lat: string;
  lng: string;
  city: string | null;
  country: string | null;
  farmType: string;
  area: string | null;
  ownerName: string;
  ownerAvatar: string | null;
  userId: number;
  createdAt: string;
}

const FARM_TYPE_ICONS: Record<string, React.ReactNode> = {
  'hidroponía': <Droplets size={16} />,
  'permacultura': <Leaf size={16} />,
  'huerto': <Sun size={16} />,
  'invernadero': <Home size={16} />,
};

const FARM_TYPE_COLORS: Record<string, string> = {
  'hidroponía': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'permacultura': 'bg-green-500/20 text-green-400 border-green-500/30',
  'huerto': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'invernadero': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export function UrbanFarmsMap() {
  const { user } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Farm | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', lat: '', lng: '', city: '', country: '', farmType: 'hidroponía', area: '',
  });
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    fetchFarms();
    loadLeaflet();
  }, []);

  const loadLeaflet = () => {
    if ((window as any).L) { initMap(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = initMap;
    document.head.appendChild(script);
  };

  const initMap = () => {
    if (mapRef.current && !leafletRef.current) {
      const L = (window as any).L;
      const map = L.map('farms-map', { center: [20, 0], zoom: 2, zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      map.on('click', (e: any) => {
        if (showForm) {
          setFormData(prev => ({ ...prev, lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6) }));
        }
      });

      leafletRef.current = map;
      setMapLoaded(true);
    }
  };

  useEffect(() => {
    if (!leafletRef.current || !mapLoaded) return;
    const L = (window as any).L;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const filtered = filterType === 'all' ? farms : farms.filter(f => f.farmType === filterType);
    filtered.forEach(farm => {
      const color = farm.farmType === 'hidroponía' ? '#3b82f6' :
        farm.farmType === 'permacultura' ? '#22c55e' :
        farm.farmType === 'huerto' ? '#f59e0b' : '#8b5cf6';

      const icon = L.divIcon({
        html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:12px">🌱</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([parseFloat(farm.lat), parseFloat(farm.lng)], { icon })
        .addTo(leafletRef.current)
        .on('click', () => setSelected(farm));

      markersRef.current.push(marker);
    });
  }, [farms, filterType, mapLoaded]);

  const fetchFarms = async () => {
    try {
      setLoading(false);
      const data = await apiGet('/urban-farms');
      setFarms(data.farms || []);
    } catch {
      toast.error('Error al cargar granjas');
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.lat || !formData.lng) {
      toast.error('Nombre y ubicación son requeridos. Haz clic en el mapa para seleccionar coordenadas.');
      return;
    }
    try {
      await apiPost('/urban-farms', { ...formData, lat: parseFloat(formData.lat), lng: parseFloat(formData.lng), area: formData.area ? parseFloat(formData.area) : null });
      toast.success('Granja registrada');
      setShowForm(false);
      setFormData({ name: '', description: '', lat: '', lng: '', city: '', country: '', farmType: 'hidroponía', area: '' });
      fetchFarms();
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar');
    }
  };

  const handleDelete = async (farmId: number) => {
    try {
      await apiDelete(`/urban-farms/${farmId}`);
      toast.success('Granja eliminada');
      setSelected(null);
      fetchFarms();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const farmTypes = ['all', 'hidroponía', 'permacultura', 'huerto', 'invernadero'];
  const filtered = filterType === 'all' ? farms : farms.filter(f => f.farmType === filterType);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="text-primary" size={24} /> Mapa de Granjas Urbanas
          </h2>
          <p className="text-muted-foreground text-sm mt-1">{farms.length} granjas registradas en la comunidad</p>
        </div>
        {user && (
          <Button className="rounded-xl gap-2 h-10" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Registrar mi Granja
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {farmTypes.map(type => (
          <Button
            key={type}
            variant={filterType === type ? 'default' : 'outline'}
            className="rounded-xl h-9 px-4 text-sm gap-1.5 capitalize"
            onClick={() => setFilterType(type)}
          >
            {type !== 'all' && FARM_TYPE_ICONS[type]}
            {type === 'all' ? 'Todas' : type}
          </Button>
        ))}
      </div>

      {/* Map */}
      <div className="relative rounded-3xl overflow-hidden border border-border/50 shadow-xl" style={{ height: '480px' }}>
        <div id="farms-map" ref={mapRef} className="w-full h-full" style={{ zIndex: 1 }} />
        {!mapLoaded && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <div className="text-center space-y-3">
              <MapPin size={40} className="mx-auto text-primary animate-bounce" />
              <p className="text-muted-foreground">Cargando mapa...</p>
            </div>
          </div>
        )}
        {showForm && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-lg z-10">
            Haz clic en el mapa para seleccionar ubicación
          </div>
        )}
      </div>

      {/* Farm List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.slice(0, 9).map((farm, i) => (
          <motion.div
            key={farm.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`bg-muted/20 rounded-2xl p-4 border cursor-pointer transition-all ${selected?.id === farm.id ? 'border-primary' : 'border-border/30 hover:border-primary/40'}`}
            onClick={() => {
              setSelected(farm);
              if (leafletRef.current) leafletRef.current.flyTo([parseFloat(farm.lat), parseFloat(farm.lng)], 14);
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-semibold text-sm">{farm.name}</p>
              <Badge className={`text-xs border ${FARM_TYPE_COLORS[farm.farmType] || 'bg-muted'}`} variant="outline">
                {farm.farmType}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{farm.description || 'Sin descripción'}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin size={11} /> {farm.city || 'Ubicación'}{farm.country ? `, ${farm.country}` : ''}</span>
              <span>{farm.ownerName}</span>
            </div>
            {farm.area && <p className="text-xs text-muted-foreground mt-1">Área: {farm.area} m²</p>}
          </motion.div>
        ))}
      </div>

      {/* Selected Farm Detail */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md bg-background border border-border rounded-2xl p-5 shadow-2xl z-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-lg">{selected.name}</h4>
                <Badge className={`text-xs border mt-1 ${FARM_TYPE_COLORS[selected.farmType]}`} variant="outline">
                  {selected.farmType}
                </Badge>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            {selected.description && <p className="text-sm text-muted-foreground mt-3">{selected.description}</p>}
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
              <span>📍 {selected.city || '—'}{selected.country ? `, ${selected.country}` : ''}</span>
              <span>👤 {selected.ownerName}</span>
              {selected.area && <span>📐 {selected.area} m²</span>}
              <span>📅 {new Date(selected.createdAt).toLocaleDateString('es')}</span>
            </div>
            {user && user.id === selected.userId && (
              <Button variant="destructive" size="sm" className="mt-4 w-full rounded-xl" onClick={() => handleDelete(selected.id)}>
                Eliminar Granja
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Register Farm Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MapPin size={18} /> Registrar Granja Urbana</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Input placeholder="Nombre de tu granja *" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            <Textarea placeholder="Descripción (opcional)" rows={2} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Ciudad" value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} />
              <Input placeholder="País" value={formData.country} onChange={e => setFormData(p => ({ ...p, country: e.target.value }))} />
            </div>
            <Select value={formData.farmType} onValueChange={v => setFormData(p => ({ ...p, farmType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hidroponía">💧 Hidroponía</SelectItem>
                <SelectItem value="permacultura">🌿 Permacultura</SelectItem>
                <SelectItem value="huerto">☀️ Huerto</SelectItem>
                <SelectItem value="invernadero">🏠 Invernadero</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Área en m² (opcional)" type="number" value={formData.area} onChange={e => setFormData(p => ({ ...p, area: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Latitud *" type="number" step="0.000001" value={formData.lat} onChange={e => setFormData(p => ({ ...p, lat: e.target.value }))} />
              <Input placeholder="Longitud *" type="number" step="0.000001" value={formData.lng} onChange={e => setFormData(p => ({ ...p, lng: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin size={12} /> Cierra este diálogo y haz clic en el mapa para seleccionar coordenadas automáticamente.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="rounded-xl" onClick={handleSubmit}>Registrar Granja</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
