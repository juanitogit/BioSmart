import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/Navbar';
import { FooterSection } from '@/components/FooterSection';
import { Button } from '@/components/ui/button';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { toast } from 'sonner';
import { Heart, ShoppingCart, Star, Tag, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';

export default function FavoritosPage() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [, setLocation] = useLocation();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLocation('/auth'); return; }
    fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/favorites');
      setFavorites(data.favorites || []);
    } catch {
      toast.error('Error al cargar favoritos');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (productId: number) => {
    try {
      await apiPost(`/favorites/${productId}`, {});
      setFavorites(prev => prev.filter(f => f.productId !== productId));
      toast.success('Eliminado de favoritos');
    } catch {
      toast.error('Error al eliminar favorito');
    }
  };

  const handleAddToCart = (fav: any) => {
    addItem({
      id: fav.product.id,
      name: fav.product.name,
      price: fav.product.price,
      image: fav.product.image,
      category: fav.product.category || 'general',
      stock: fav.product.stock,
      sellerId: fav.product.sellerId,
    }, 1);
    toast.success(`${fav.product.name} agregado al carrito`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-grow pt-32 pb-20 container mx-auto px-6 max-w-5xl">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="text-red-500" size={28} fill="currentColor" />
            <h1 className="text-4xl font-bold">Mis Favoritos</h1>
          </div>
          <p className="text-muted-foreground">Productos guardados para comprar cuando quieras.</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-6">
            <Heart size={64} className="text-muted-foreground/30" />
            <div>
              <p className="text-xl font-semibold text-muted-foreground">No tienes favoritos aún</p>
              <p className="text-sm text-muted-foreground mt-1">Agrega productos desde el Marketplace</p>
            </div>
            <Link href="/marketplace">
              <Button className="gap-2">
                <ArrowRight size={16} /> Ir al Marketplace
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav) => (
              <div key={fav.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="relative h-48 bg-muted/50">
                  {fav.product.image ? (
                    <img src={fav.product.image} alt={fav.product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tag size={40} className="text-primary/20" />
                    </div>
                  )}
                  <button
                    onClick={() => removeFavorite(fav.productId)}
                    className="absolute top-3 right-3 p-2 bg-background/80 backdrop-blur rounded-full hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                  {fav.product.category && (
                    <span className="absolute top-3 left-3 text-xs font-bold uppercase tracking-wider bg-black/60 text-white px-3 py-1 rounded-full">
                      {fav.product.category}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <Link href={`/productos-detalle/${fav.product.id}`}>
                    <h3 className="font-bold text-lg hover:text-primary transition-colors cursor-pointer line-clamp-1">{fav.product.name}</h3>
                  </Link>
                  <div className="flex items-center justify-between mt-2 mb-4">
                    <span className="text-2xl font-extrabold font-mono text-primary">${fav.product.price}</span>
                    {fav.product.rating && parseFloat(fav.product.rating) > 0 && (
                      <span className="flex items-center gap-1 text-yellow-500 text-sm font-semibold">
                        <Star size={14} fill="currentColor" /> {parseFloat(fav.product.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <Button
                    className="w-full gap-2"
                    size="sm"
                    disabled={!fav.product.stock || fav.product.stock <= 0}
                    onClick={() => handleAddToCart(fav)}
                  >
                    <ShoppingCart size={14} />
                    {fav.product.stock > 0 ? 'Agregar al Carrito' : 'Sin Stock'}
                  </Button>
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
