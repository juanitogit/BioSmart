import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { apiGet, apiPost } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { FooterSection } from '@/components/FooterSection';
import { Button } from '@/components/ui/button';
import { Tag, ShoppingCart, Star, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductDetailPage() {
  const [match, params] = useRoute('/productos-detalle/:id');
  const [, setLocation] = useLocation();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
      fetchProduct();
    }
  }, [params?.id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/products'); // As in Marketplace, we get all and find
      const found = (data.products || []).find((p: any) => p.id === parseInt(params!.id));
      if (found) {
        setProduct(found);
      } else {
        toast.error('Producto no encontrado');
        setLocation('/marketplace');
      }
    } catch (err) {
      toast.error('Error al cargar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    try {
      await apiPost(`/products/${product.id}/buy`, { quantity: 1 });
      toast.success('¡Compra realizada con éxito!');
      fetchProduct();
    } catch (err: any) {
      toast.error(err.message || 'Error al comprar');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-32 pb-20 container mx-auto px-6 max-w-6xl">
        <Button variant="ghost" onClick={() => setLocation('/marketplace')} className="mb-8 gap-2">
          <ArrowLeft size={16} /> Volver a la Tienda
        </Button>

        <div className="grid md:grid-cols-2 gap-12 bg-muted/20 border border-border/50 rounded-3xl overflow-hidden p-0 md:p-8">
          {/* Image Gallery Column */}
          <div className="relative aspect-square md:aspect-auto md:h-full bg-muted/50 rounded-2xl flex items-center justify-center overflow-hidden border border-border/50">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Tag size={64} className="text-primary/20" />
            )}
            <div className="absolute top-6 left-6">
              <span className="text-xs font-bold tracking-widest uppercase text-white shadow-xl bg-black/60 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                {product.category || 'General'}
              </span>
            </div>
          </div>
          
          {/* Details Column */}
          <div className="p-6 md:p-0 flex flex-col h-full justify-center">
            <h1 className="text-4xl md:text-5xl font-bold font-heading text-foreground mb-4 leading-tight">
              {product.name}
            </h1>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8">
              {product.rating && parseFloat(product.rating) > 0 ? (
                <div className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-500/10 px-3 py-1 rounded-md">
                  <Star size={16} fill="currentColor" /> {parseFloat(product.rating).toFixed(1)}
                </div>
              ) : (
                <span className="text-sm font-semibold uppercase opacity-70 border px-2 py-1 rounded">Nuevo Lanzamiento</span>
              )}
              {product.stock !== undefined && (
                <div className={`font-semibold text-lg ${product.stock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {product.stock > 0 ? `${product.stock} unidades en stock` : 'Agotado Temporalmente'}
                </div>
              )}
            </div>

            <div className="space-y-6 mb-12">
              <h3 className="font-semibold text-xl flex items-center gap-2 border-b border-border/50 pb-4">
                <Tag size={20} className="text-primary"/> Descripción del Producto
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-wrap">
                {product.description || 'Este producto no cuenta con descripción detallada en este momento. Ideal para tus proyectos de agricultura sustentable. Garantizado por BioSmart.'}
              </p>
            </div>
            
            <div className="bg-primary/5 border border-primary/20 p-8 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-auto">
              <div>
                <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider mb-2">Precio de Venta</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold font-mono text-primary">${product.price}</span>
                  <span className="text-lg font-bold uppercase text-primary/70">USD</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                 <Button 
                    className="w-full sm:w-auto h-14 px-10 rounded-full text-lg font-bold gap-3 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all"
                    onClick={handleBuy}
                    disabled={product.stock <= 0}
                  >
                    <ShoppingCart size={22} />
                    {product.stock > 0 ? 'Comprar Ahora' : 'Sin Stock'}
                 </Button>
                 <div className="text-xs text-muted-foreground w-full text-center flex items-center justify-center gap-1.5 font-medium">
                    <CheckCircle2 size={14} className="text-green-500" />
                    Satisfacción o Reembolso a 30 días
                 </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <FooterSection />
    </div>
  );
}
