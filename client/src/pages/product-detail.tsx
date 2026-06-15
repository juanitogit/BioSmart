import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { FooterSection } from '@/components/FooterSection';
import { Button } from '@/components/ui/button';
import { Tag, ShoppingCart, Star, CheckCircle2, ArrowLeft, Plus, Minus, Heart, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';

interface Review {
  id: number;
  userId: number;
  rating: number;
  comment: string;
  createdAt: string;
}

export default function ProductDetailPage() {
  const [match, params] = useRoute('/productos-detalle/:id');
  const [, setLocation] = useLocation();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    if (params?.id) {
      fetchProduct();
      fetchReviews();
      if (user) checkFavorite();
    }
  }, [params?.id, user]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/products');
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

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const data = await apiGet(`/reviews/${params!.id}`);
      setReviews(data.reviews || []);
    } catch (_) {
    } finally {
      setReviewsLoading(false);
    }
  };

  const checkFavorite = async () => {
    try {
      const data = await apiGet(`/favorites/check/${params!.id}`);
      setFavorited(data.favorited);
    } catch (_) {}
  };

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Por favor inicia sesión para comprar');
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category || 'general',
      stock: product.stock,
      sellerId: product.sellerId,
    }, quantity);
    toast.success(`${product.name} (×${quantity}) agregado al carrito`);
  };

  const handleToggleFavorite = async () => {
    if (!user) { toast.error('Inicia sesión para guardar favoritos'); return; }
    setFavLoading(true);
    try {
      const data = await apiPost(`/favorites/${product.id}`, {});
      setFavorited(data.favorited);
      toast.success(data.message);
    } catch {
      toast.error('Error al actualizar favorito');
    } finally {
      setFavLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) { toast.error('Inicia sesión para dejar una reseña'); return; }
    if (myRating === 0) { toast.error('Selecciona una calificación'); return; }
    setSubmittingReview(true);
    try {
      await apiPost(`/reviews/${product.id}`, { rating: myRating, comment: myComment });
      toast.success('Reseña publicada');
      setMyRating(0);
      setMyComment('');
      fetchReviews();
      fetchProduct();
    } catch (err: any) {
      toast.error(err.message || 'Error al publicar reseña');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      await apiDelete(`/reviews/${reviewId}`);
      toast.success('Reseña eliminada');
      fetchReviews();
      fetchProduct();
    } catch {
      toast.error('Error al eliminar reseña');
    }
  };

  const alreadyReviewed = user && reviews.some(r => r.userId === user.id);

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
          {/* Image Column */}
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
            {/* Favorite button */}
            <button
              onClick={handleToggleFavorite}
              disabled={favLoading}
              className={`absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all ${
                favorited ? 'bg-red-500 text-white' : 'bg-black/40 text-white hover:bg-red-500/80'
              }`}
            >
              <Heart size={18} fill={favorited ? 'currentColor' : 'none'} />
            </button>
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
                  <span className="text-muted-foreground font-normal ml-1">({product.reviewsCount})</span>
                </div>
              ) : (
                <span className="text-sm font-semibold uppercase opacity-70 border px-2 py-1 rounded">Nuevo Lanzamiento</span>
              )}
              {product.stock !== undefined && (
                <div className={`font-semibold text-lg ${product.stock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}
                </div>
              )}
            </div>

            <div className="space-y-6 mb-12">
              <h3 className="font-semibold text-xl flex items-center gap-2 border-b border-border/50 pb-4">
                <Tag size={20} className="text-primary"/> Descripción del Producto
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-wrap">
                {product.description || 'Este producto no cuenta con descripción detallada. Ideal para agricultura sustentable. Garantizado por BioSmart.'}
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
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Cantidad:</span>
                  <div className="flex items-center gap-1 bg-muted/50 rounded-full border border-border p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-background transition-colors disabled:opacity-40"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center font-bold font-mono text-lg">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-background transition-colors disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <Button 
                  className="w-full sm:w-auto h-14 px-10 rounded-full text-lg font-bold gap-3 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all"
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                >
                  <ShoppingCart size={22} />
                  {product.stock > 0 ? 'Agregar al Carrito' : 'Sin Stock'}
                </Button>
                <div className="text-xs text-muted-foreground w-full text-center flex items-center justify-center gap-1.5 font-medium">
                  <CheckCircle2 size={14} className="text-green-500" />
                  Satisfacción o Reembolso a 30 días
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <section className="mt-16">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <Star className="text-yellow-500" size={28} fill="currentColor" />
            Reseñas y Calificaciones
            {reviews.length > 0 && (
              <span className="text-base font-normal text-muted-foreground ml-1">({reviews.length})</span>
            )}
          </h2>

          {/* Write Review */}
          {user && !alreadyReviewed && (
            <div className="bg-card border border-border rounded-2xl p-6 mb-8">
              <h3 className="font-bold text-lg mb-4">Deja tu reseña</h3>
              {/* Star Selector */}
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setMyRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={32}
                      className={`transition-colors ${(hoverRating || myRating) >= star ? 'text-yellow-500' : 'text-muted-foreground/30'}`}
                      fill={(hoverRating || myRating) >= star ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
                {myRating > 0 && (
                  <span className="ml-2 text-sm font-semibold text-yellow-500">
                    {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][myRating]}
                  </span>
                )}
              </div>
              <textarea
                value={myComment}
                onChange={e => setMyComment(e.target.value)}
                placeholder="Comparte tu experiencia con este producto (opcional)..."
                rows={3}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
              />
              <Button
                onClick={handleSubmitReview}
                disabled={submittingReview || myRating === 0}
                className="gap-2"
              >
                <Send size={14} />
                {submittingReview ? 'Publicando...' : 'Publicar Reseña'}
              </Button>
            </div>
          )}

          {alreadyReviewed && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-6 text-sm text-primary font-medium flex items-center gap-2">
              <CheckCircle2 size={16} /> Ya dejaste una reseña en este producto
            </div>
          )}

          {/* Reviews List */}
          {reviewsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Star size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold">Sin reseñas aún</p>
              <p className="text-sm mt-1">Sé el primero en calificar este producto</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review.id} className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={14} className={s <= review.rating ? 'text-yellow-500' : 'text-muted-foreground/30'} fill={s <= review.rating ? 'currentColor' : 'none'} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-foreground leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                    {user && user.id === review.userId && (
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-colors flex-shrink-0"
                        title="Eliminar mi reseña"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      
      <FooterSection />
    </div>
  );
}
